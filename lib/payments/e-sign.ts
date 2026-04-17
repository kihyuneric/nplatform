/**
 * lib/payments/e-sign.ts
 *
 * 전자서명 모듈 — NPL 매매계약서 / LOI / NDA / 인수확인서 등에
 * 다자 서명 + 해시 검증 + 타임스탬프 적용.
 *
 * 흐름:
 *   1) generateContract → 본문 텍스트
 *   2) createSignSession() : 서명자 목록 + 본문 hash + TTL 설정
 *   3) 각 서명자에게 PASS 본인인증 + 서명 요청 발송
 *   4) signDocument() : 서명자 별로 호출 → 개별 서명 + audit
 *   5) 전원 서명 완료 → finalize() : 최종 PDF + LTV(타임스탬프) 부착
 *
 * 보안:
 *   - 서명 본문 변조 방지: 본문 SHA-256 hash를 세션 생성시 lock
 *   - 서명자 ID는 PASS 인증 CI로 검증
 *   - 각 서명마다 audit_logs.action="CONTRACT_SIGN" 기록
 *   - 최종 문서는 LTV-A 형식 PDF 권장 (별도 PDF 모듈 담당)
 */

import { createHash, randomUUID } from "crypto"

// ─── Types ────────────────────────────────────────────────────

export type SignerRole = "SELLER" | "BUYER" | "AGENT" | "WITNESS" | "NOTARY"
export type SignerStatus = "INVITED" | "VIEWED" | "SIGNED" | "REJECTED" | "EXPIRED"
export type SessionStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "VOIDED" | "EXPIRED"

export interface Signer {
  id: string
  userId: string
  role: SignerRole
  name: string
  email: string
  /** PASS CI (서명 정합성 검증용) */
  ci?: string
  status: SignerStatus
  /** 서명 hash (signedAt + signerId + documentHash 의 SHA-256) */
  signatureHash?: string
  /** 서명 시각 */
  signedAt?: string
  /** 거절 사유 */
  rejectReason?: string
  /** 서명 IP/UA */
  ipAddress?: string
  userAgent?: string
}

export interface SignSession {
  id: string
  documentId: string
  /** 본문 SHA-256 — 변조 방지 lock */
  documentHash: string
  /** 본문 미리보기 (UI용, 1000자) */
  preview: string
  signers: Signer[]
  status: SessionStatus
  createdAt: string
  expiresAt: string
  /** 최종 PDF storage 키 (finalize 후) */
  finalPdfPath?: string
  /** 모든 서명 연결 hash chain */
  chainHash?: string
}

export interface CreateSessionInput {
  documentId: string
  documentBody: string
  signers: Omit<Signer, "id" | "status" | "signatureHash" | "signedAt">[]
  /** TTL 일 (default 7일) */
  ttlDays?: number
}

export interface SignInput {
  sessionId: string
  signerId: string
  /** 서명자 PASS CI — 호출 시 필수 */
  ci: string
  ipAddress?: string
  userAgent?: string
}

// ─── Constants ────────────────────────────────────────────────

const DEFAULT_TTL_DAYS = 7
const MAX_PREVIEW_CHARS = 1000

// ─── 1) 세션 생성 ─────────────────────────────────────────────

export function createSignSession(input: CreateSessionInput): SignSession {
  if (input.signers.length === 0) {
    throw new Error("[e-sign] At least one signer required")
  }
  if (input.signers.length > 10) {
    throw new Error("[e-sign] Max 10 signers")
  }
  const sellerCount = input.signers.filter(s => s.role === "SELLER").length
  const buyerCount = input.signers.filter(s => s.role === "BUYER").length
  if (sellerCount === 0 || buyerCount === 0) {
    throw new Error("[e-sign] At least one SELLER and one BUYER required")
  }

  const id = `SIGN-${Date.now()}-${randomUUID().slice(0, 8)}`
  const documentHash = hashDocument(input.documentBody)
  const ttlDays = input.ttlDays ?? DEFAULT_TTL_DAYS
  const now = new Date()

  const signers: Signer[] = input.signers.map((s, i) => ({
    id: `${id}-S${String(i + 1).padStart(2, "0")}`,
    userId: s.userId,
    role: s.role,
    name: s.name,
    email: s.email,
    ci: s.ci,
    status: "INVITED",
  }))

  return {
    id,
    documentId: input.documentId,
    documentHash,
    preview: input.documentBody.slice(0, MAX_PREVIEW_CHARS),
    signers,
    status: "ACTIVE",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString(),
  }
}

// ─── 2) 본문 hash ────────────────────────────────────────────

export function hashDocument(body: string): string {
  // 공백 정규화 후 hash — 미세한 줄바꿈/탭 차이로 hash가 달라지지 않도록
  const normalized = body.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim()
  return createHash("sha256").update(normalized).digest("hex")
}

/**
 * 외부에서 받은 본문이 세션의 documentHash와 일치하는지 검증.
 */
export function verifyDocument(session: SignSession, body: string): boolean {
  return hashDocument(body) === session.documentHash
}

// ─── 3) 서명 ─────────────────────────────────────────────────

export function signDocument(session: SignSession, input: SignInput): SignSession {
  if (session.status !== "ACTIVE") {
    throw new Error(`[e-sign] Session is ${session.status}, cannot sign`)
  }
  if (new Date(session.expiresAt) < new Date()) {
    return { ...session, status: "EXPIRED" }
  }

  const signer = session.signers.find(s => s.id === input.signerId)
  if (!signer) {
    throw new Error(`[e-sign] Signer ${input.signerId} not found`)
  }
  if (signer.status === "SIGNED") {
    throw new Error(`[e-sign] Signer ${input.signerId} already signed`)
  }
  if (signer.ci && signer.ci !== input.ci) {
    throw new Error("[e-sign] CI mismatch — PASS 인증된 본인이 아닙니다")
  }

  const signedAt = new Date().toISOString()
  const signatureHash = createHash("sha256")
    .update(`${session.documentHash}:${input.signerId}:${signedAt}:${input.ci}`)
    .digest("hex")

  const updatedSigners: Signer[] = session.signers.map(s =>
    s.id === input.signerId
      ? {
          ...s,
          status: "SIGNED" as SignerStatus,
          signatureHash,
          signedAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        }
      : s,
  )

  const allSigned = updatedSigners.every(s => s.status === "SIGNED")
  const status: SessionStatus = allSigned ? "COMPLETED" : "ACTIVE"
  const chainHash = allSigned ? buildChainHash(session.documentHash, updatedSigners) : undefined

  return {
    ...session,
    signers: updatedSigners,
    status,
    chainHash,
  }
}

export function rejectSign(session: SignSession, signerId: string, reason: string): SignSession {
  const signers = session.signers.map(s =>
    s.id === signerId
      ? { ...s, status: "REJECTED" as SignerStatus, rejectReason: reason }
      : s,
  )
  return { ...session, signers, status: "VOIDED" }
}

// ─── 4) Hash chain (Merkle-lite) ─────────────────────────────

function buildChainHash(documentHash: string, signers: Signer[]): string {
  // 서명 순서대로 누적 hash → 최종 hash
  let acc = documentHash
  for (const s of signers) {
    if (!s.signatureHash) continue
    acc = createHash("sha256").update(acc + s.signatureHash).digest("hex")
  }
  return acc
}

/**
 * 세션 chain hash 검증 — 사후 위변조 탐지.
 */
export function verifyChainHash(session: SignSession): boolean {
  if (!session.chainHash) return false
  const recomputed = buildChainHash(session.documentHash, session.signers)
  return recomputed === session.chainHash
}

// ─── 5) 최종화 ───────────────────────────────────────────────

export interface FinalizeResult {
  ok: boolean
  sessionId: string
  chainHash: string
  signedCount: number
  /** 외부 PDF 모듈에 넘길 메타 */
  pdfMetadata: {
    title: string
    author: string
    keywords: string[]
    customProperties: Record<string, string>
  }
}

export function finalizeSession(session: SignSession): FinalizeResult {
  if (session.status !== "COMPLETED") {
    throw new Error(`[e-sign] Cannot finalize: status=${session.status}`)
  }
  if (!session.chainHash || !verifyChainHash(session)) {
    throw new Error("[e-sign] Chain hash verification failed")
  }
  return {
    ok: true,
    sessionId: session.id,
    chainHash: session.chainHash,
    signedCount: session.signers.filter(s => s.status === "SIGNED").length,
    pdfMetadata: {
      title: `NPLatform 전자계약 ${session.documentId}`,
      author: "NPLatform e-sign",
      keywords: ["NPL", "계약서", "전자서명", session.documentId],
      customProperties: {
        documentHash: session.documentHash,
        chainHash: session.chainHash,
        sessionId: session.id,
        signedAt: new Date().toISOString(),
      },
    },
  }
}

// ─── 진행률 ──────────────────────────────────────────────────

export function signProgressPct(session: SignSession): number {
  const signed = session.signers.filter(s => s.status === "SIGNED").length
  return (signed / session.signers.length) * 100
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  DEFAULT_TTL_DAYS,
  MAX_PREVIEW_CHARS,
  buildChainHash,
}
