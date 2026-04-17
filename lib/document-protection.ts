/**
 * lib/document-protection.ts
 *
 * 문서 보호 모듈 — L2/L3 자료(감정평가서·등기·임차·재무 등)의
 *   1) Signed URL 발급 (TTL 5분, 1회 소비)
 *   2) 워터마크 핑거프린트 생성 (사용자ID + 타임스탬프 SHA-256)
 *   3) signed_url_grants 테이블에 감사 이벤트 기록
 *
 * 호출 흐름:
 *   클라이언트 → /api/v1/documents/[id]/signed-url
 *      → issueSignedUrl() → Supabase Storage createSignedUrl(300)
 *      → signed_url_grants insert (token_hash, fingerprint, expires_at)
 *      → audit_logs insert (severity=INFO, action=SIGNED_URL_ISSUED)
 *      ← 응답 { url, expiresAt, fingerprint }
 *
 * 보안 원칙:
 *   - URL 자체는 절대 로그에 남기지 않는다 (token_hash만 저장)
 *   - 만료 후 재발급은 새 grant. consumed_at 채워지면 해당 grant 무효
 *   - 워터마크는 PDF 렌더링 단계에서 사용 (별도 PDF 라이브러리)
 *   - L0/L1 자료는 이 모듈을 거치지 않는다 (CDN 직접 서빙)
 */

import { createHash, randomBytes } from "crypto"
import type { DocumentTier } from "./types"

// ─── Constants ────────────────────────────────────────────────
export const SIGNED_URL_TTL_SECONDS = 300 // 5분 (변경 금지 — DPO 합의)
const PROTECTED_TIERS: DocumentTier[] = ["L2", "L3"]

// ─── Types ────────────────────────────────────────────────────
export interface SignedUrlIssueInput {
  documentId: string
  storagePath: string                   // Supabase Storage 키 (예: "deals/123/appraisal.pdf")
  documentTier: DocumentTier
  userId: string
  dealRoomId?: string
  purpose?: "VIEW" | "DOWNLOAD"
}

export interface SignedUrlIssueResult {
  url: string
  expiresAt: string                     // ISO timestamp
  tokenHash: string                     // 감사 추적용 (URL 자체는 저장 안 함)
  watermarkFingerprint: string
  ttlSeconds: number
}

export interface WatermarkPayload {
  userId: string
  documentId: string
  issuedAt: number                      // epoch ms
  fingerprint: string                   // 화면/PDF에 새길 짧은 표식
  full: string                          // 감사용 전체 hex
}

// ─── 1. Watermark fingerprint ────────────────────────────────
/**
 * 사용자ID + 문서ID + 발급시각으로 SHA-256 fingerprint 생성.
 * - 화면/PDF 워터마크는 앞 12자만 사용 (가독성)
 * - 누설 발생 시 감사 로그의 full hex와 대조하여 추적
 */
export function buildWatermark(
  userId: string,
  documentId: string,
  issuedAt: number = Date.now(),
): WatermarkPayload {
  const payload = `${userId}:${documentId}:${issuedAt}`
  const hash = createHash("sha256").update(payload).digest("hex")
  return {
    userId,
    documentId,
    issuedAt,
    fingerprint: hash.slice(0, 12).toUpperCase(),
    full: hash,
  }
}

/**
 * 화면 표시용 라벨 — "WM-A1B2C3D4E5F6 · 2026-04-07 14:23"
 * PDF/이미지 뷰어에 반투명 텍스트로 새기거나 footer에 표시.
 */
export function watermarkLabel(wm: WatermarkPayload): string {
  const d = new Date(wm.issuedAt)
  const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return `WM-${wm.fingerprint} · ${ts}`
}

// ─── 2. Token hashing ────────────────────────────────────────
/**
 * Signed URL 토큰을 절대 평문으로 저장하지 않는다.
 * URL에서 token 파라미터만 추출 → SHA-256 → DB 저장.
 */
export function hashSignedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Supabase signed URL에서 token 쿼리스트링 추출.
 * 형식: https://.../object/sign/bucket/path?token=eyJhbGc...
 */
export function extractToken(signedUrl: string): string | null {
  try {
    const u = new URL(signedUrl)
    return u.searchParams.get("token")
  } catch {
    return null
  }
}

// ─── 3. TTL validation ───────────────────────────────────────
export function isExpired(expiresAt: string | Date): boolean {
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt
  return exp.getTime() <= Date.now()
}

export function computeExpiresAt(issuedAt: number = Date.now()): Date {
  return new Date(issuedAt + SIGNED_URL_TTL_SECONDS * 1000)
}

// ─── 4. Tier guard ───────────────────────────────────────────
/**
 * 보호 대상 tier인지 확인. L0/L1은 이 모듈을 거치지 않아야 함.
 * L0/L1을 넘기면 throw (호출 측 버그 방지).
 */
export function assertProtectedTier(tier: DocumentTier): void {
  if (!PROTECTED_TIERS.includes(tier)) {
    throw new Error(
      `[document-protection] Tier ${tier} is not protected. Use direct CDN URL for L0/L1 documents.`,
    )
  }
}

// ─── 5. Signed URL issuance (Supabase Storage 통합) ──────────
/**
 * issueSignedUrl
 *   - Supabase Storage에서 5분 TTL signed URL 발급
 *   - 워터마크 fingerprint 생성
 *   - signed_url_grants insert (token_hash + expires_at + fingerprint)
 *   - audit_logs insert
 *
 * 주의: 이 함수는 service_role 클라이언트가 필요합니다.
 *      서버 런타임(/api/* route handler)에서만 호출하세요.
 */
export async function issueSignedUrl(
  supabase: SupabaseLike,
  input: SignedUrlIssueInput,
): Promise<SignedUrlIssueResult> {
  assertProtectedTier(input.documentTier)

  const issuedAt = Date.now()
  const wm = buildWatermark(input.userId, input.documentId, issuedAt)

  // Supabase Storage signed URL 발급 (TTL 300s 고정)
  const { data, error } = await supabase.storage
    .from(extractBucket(input.storagePath))
    .createSignedUrl(extractObjectPath(input.storagePath), SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    throw new Error(`[document-protection] Failed to issue signed URL: ${error?.message ?? "unknown"}`)
  }

  const token = extractToken(data.signedUrl)
  if (!token) {
    throw new Error("[document-protection] Could not extract token from signed URL")
  }
  const tokenHash = hashSignedToken(token)
  const expiresAt = computeExpiresAt(issuedAt)

  // signed_url_grants insert
  await supabase.from("signed_url_grants").insert({
    document_id: input.documentId,
    user_id: input.userId,
    deal_room_id: input.dealRoomId ?? null,
    token_hash: tokenHash,
    watermark_fingerprint: wm.full,
    purpose: input.purpose ?? "VIEW",
    expires_at: expiresAt.toISOString(),
    issued_at: new Date(issuedAt).toISOString(),
  })

  // audit_logs insert (append-only — DB trigger가 UPDATE/DELETE 차단)
  await supabase.from("audit_logs").insert({
    user_id: input.userId,
    deal_room_id: input.dealRoomId ?? null,
    document_id: input.documentId,
    action: input.purpose === "DOWNLOAD" ? "DOC_DOWNLOAD" : "DOC_VIEW",
    target_table: "listing_documents",
    target_id: input.documentId,
    severity: "INFO",
    metadata: {
      tier: input.documentTier,
      fingerprint: wm.fingerprint,
      ttl: SIGNED_URL_TTL_SECONDS,
    },
  })

  return {
    url: data.signedUrl,
    expiresAt: expiresAt.toISOString(),
    tokenHash,
    watermarkFingerprint: wm.fingerprint,
    ttlSeconds: SIGNED_URL_TTL_SECONDS,
  }
}

/**
 * consumeGrant — 첫 사용 시 호출하여 1회용 제약 강제.
 * 이미 consumed_at이 채워져 있으면 false 반환 (재사용 시도 = 잠재 누설).
 */
export async function consumeGrant(
  supabase: SupabaseLike,
  tokenHash: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data: grant } = await supabase
    .from("signed_url_grants")
    .select("id, consumed_at, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (!grant) return { ok: false, reason: "NOT_FOUND" }
  const g = grant as { id: string; consumed_at: string | null; expires_at: string }
  if (g.consumed_at) return { ok: false, reason: "ALREADY_CONSUMED" }
  if (isExpired(g.expires_at)) return { ok: false, reason: "EXPIRED" }

  await supabase
    .from("signed_url_grants")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", g.id)

  return { ok: true }
}

// ─── Helpers ─────────────────────────────────────────────────
function extractBucket(storagePath: string): string {
  // "deals/123/appraisal.pdf" → bucket "deals"
  const idx = storagePath.indexOf("/")
  return idx === -1 ? storagePath : storagePath.slice(0, idx)
}

function extractObjectPath(storagePath: string): string {
  const idx = storagePath.indexOf("/")
  return idx === -1 ? "" : storagePath.slice(idx + 1)
}

// ─── Minimal Supabase client interface ───────────────────────
// 실제 SupabaseClient를 직접 import하면 클라이언트 번들에 섞일 위험이 있으므로
// 필요한 메서드만 구조적 타입으로 받는다.
type SupabaseLike = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        ttl: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>
    }
  }
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<unknown>
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>
      }
    }
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<unknown>
    }
  }
}

// 테스트용 export
export const __test__ = {
  PROTECTED_TIERS,
  extractBucket,
  extractObjectPath,
}
