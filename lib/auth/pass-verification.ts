/**
 * lib/auth/pass-verification.ts
 *
 * PASS(통신사 본인인증) 어댑터. 회원가입 / KYC / 고액거래 진입 시 호출.
 *
 * 호출 위치:
 *   - /api/v1/auth/pass/init   (POST) → 인증 세션 생성 + 리다이렉트 URL
 *   - /api/v1/auth/pass/verify (POST) → 인증 결과 검증 + 토큰 발급
 *   - /signup, /my/settings 보안 탭, /deals/[id] 단계 격상 시
 *
 * 보안 원칙:
 *   - 주민등록번호 평문 저장 금지 — 생년월일 + 성별 + 통신사 + CI/DI 만 저장
 *   - CI(연계정보, 88byte) — 영구 식별자, 동일인 매칭에 사용
 *   - DI(중복가입확인정보, 64byte) — 사이트별 고유, 중복가입 차단에 사용
 *   - 인증 세션은 5분 TTL, 1회용 nonce
 *   - 외부 API 응답은 SHA-256 서명 검증 필수 (위변조 방지)
 *
 * 외부 의존:
 *   - 실제 PASS API는 통신사·인증대행사(다날/KG이니시스)별로 다름.
 *     본 모듈은 추상 인터페이스 + 모의(MOCK) 구현 + 실 어댑터 hook 제공.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto"

// ─── Types ────────────────────────────────────────────────────

export type Carrier = "SKT" | "KT" | "LGU" | "SKT_MVNO" | "KT_MVNO" | "LGU_MVNO"
export type Gender = "M" | "F"

export interface PassInitInput {
  /** 호출 목적 (감사용) */
  purpose: "SIGNUP" | "KYC_UPGRADE" | "HIGH_VALUE_ACCESS" | "PASSWORD_RESET" | "MFA"
  /** 콜백 (검증 후 돌아올 URL) */
  returnUrl: string
  /** 호출자 IP / UA (감사용) */
  ipAddress?: string
  userAgent?: string
}

export interface PassInitResult {
  /** 사용자가 이동할 PASS 인증 URL */
  redirectUrl: string
  /** 세션 nonce — verify() 호출 시 함께 보내야 함 */
  nonce: string
  /** 만료 시각 */
  expiresAt: string
  /** 세션 ID (서버 저장용) */
  sessionId: string
}

export interface PassVerifyInput {
  sessionId: string
  nonce: string
  /** PASS API가 콜백으로 보낸 응답 (raw payload + signature) */
  payload: PassRawPayload
  signature: string
  ipAddress?: string
  userAgent?: string
}

export interface PassRawPayload {
  name: string
  birthDate: string       // YYYYMMDD
  gender: Gender
  carrier: Carrier
  isForeigner: boolean
  ci: string              // 88byte base64
  di: string              // 64byte base64
  authIssuedAt: string    // ISO
}

export interface PassVerifyResult {
  ok: boolean
  /** 검증 실패 사유 */
  reason?: PassVerifyError
  /** 정규화된 사용자 정보 (PII 최소화) */
  identity?: {
    name: string
    birthDate: string     // YYYY-MM-DD
    gender: Gender
    carrier: Carrier
    isForeigner: boolean
    ci: string
    di: string
    /** 만 나이 */
    age: number
    /** 만 19세 이상 여부 */
    isAdult: boolean
  }
  /** 감사 로그용 */
  verifiedAt: string
  sessionId: string
}

export type PassVerifyError =
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "NONCE_MISMATCH"
  | "SIGNATURE_INVALID"
  | "PAYLOAD_MALFORMED"
  | "UNDERAGE"
  | "REPLAY_DETECTED"
  | "CARRIER_MISMATCH"

// ─── Constants ────────────────────────────────────────────────

const SESSION_TTL_MS = 5 * 60 * 1000   // 5분
const MIN_AGE = 19                      // 만 19세 이상

// ─── Session store (in-memory; 운영은 Redis로 교체) ─────────

interface PassSession {
  id: string
  nonce: string
  purpose: PassInitInput["purpose"]
  returnUrl: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: number
  consumed: boolean
}

const SESSIONS = new Map<string, PassSession>()

function createSession(input: PassInitInput): PassSession {
  const id = randomBytes(16).toString("hex")
  const nonce = randomBytes(32).toString("base64url")
  const session: PassSession = {
    id,
    nonce,
    purpose: input.purpose,
    returnUrl: input.returnUrl,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: Date.now(),
    consumed: false,
  }
  SESSIONS.set(id, session)
  return session
}

function getSession(id: string): PassSession | null {
  const s = SESSIONS.get(id)
  if (!s) return null
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    SESSIONS.delete(id)
    return null
  }
  return s
}

// ─── Init / Verify ────────────────────────────────────────────

/**
 * PASS 인증 세션 생성. 클라이언트는 redirectUrl로 이동.
 */
export function initPassVerification(input: PassInitInput): PassInitResult {
  const session = createSession(input)
  const redirectUrl = buildRedirectUrl(session)
  return {
    redirectUrl,
    nonce: session.nonce,
    sessionId: session.id,
    expiresAt: new Date(session.createdAt + SESSION_TTL_MS).toISOString(),
  }
}

function buildRedirectUrl(session: PassSession): string {
  // 실제 PASS는 통신사 게이트웨이로 redirect (cert.kisa.or.kr 등)
  // 여기서는 자체 콜백 페이지로 위임
  const params = new URLSearchParams({
    sid: session.id,
    nonce: session.nonce,
    return: session.returnUrl,
  })
  return `/auth/pass/callback?${params.toString()}`
}

/**
 * PASS 콜백 검증.
 *  1) 세션 존재 + 미만료 + 미소비
 *  2) nonce 일치 (timing-safe)
 *  3) 서명 검증
 *  4) 페이로드 유효성
 *  5) 만 19세 이상
 *  6) 세션 소비 마킹 (replay 차단)
 */
export function verifyPassCallback(input: PassVerifyInput): PassVerifyResult {
  const session = getSession(input.sessionId)
  if (!session) {
    return failure("SESSION_NOT_FOUND", input.sessionId)
  }
  if (session.consumed) {
    return failure("REPLAY_DETECTED", input.sessionId)
  }
  if (!safeEqual(input.nonce, session.nonce)) {
    return failure("NONCE_MISMATCH", input.sessionId)
  }
  if (!verifySignature(input.payload, input.signature)) {
    return failure("SIGNATURE_INVALID", input.sessionId)
  }
  if (!isPayloadValid(input.payload)) {
    return failure("PAYLOAD_MALFORMED", input.sessionId)
  }

  const birthDate = formatBirthDate(input.payload.birthDate)
  const age = computeAge(birthDate)
  if (age < MIN_AGE) {
    return failure("UNDERAGE", input.sessionId)
  }

  // 1회 소비
  session.consumed = true
  SESSIONS.set(session.id, session)

  return {
    ok: true,
    sessionId: session.id,
    verifiedAt: new Date().toISOString(),
    identity: {
      name: input.payload.name,
      birthDate,
      gender: input.payload.gender,
      carrier: input.payload.carrier,
      isForeigner: input.payload.isForeigner,
      ci: input.payload.ci,
      di: input.payload.di,
      age,
      isAdult: age >= MIN_AGE,
    },
  }
}

function failure(reason: PassVerifyError, sessionId: string): PassVerifyResult {
  return {
    ok: false,
    reason,
    sessionId,
    verifiedAt: new Date().toISOString(),
  }
}

// ─── Signature verification ──────────────────────────────────

/**
 * payload + 시크릿으로 SHA-256 HMAC 비교.
 * 운영 환경에서는 환경변수 PASS_SHARED_SECRET 사용.
 */
function verifySignature(payload: PassRawPayload, signature: string): boolean {
  const secret = process.env.PASS_SHARED_SECRET ?? "dev-secret-replace-me"
  const canonical = canonicalize(payload)
  const expected = createHash("sha256")
    .update(canonical + secret)
    .digest("hex")
  return safeEqual(expected, signature)
}

function canonicalize(payload: PassRawPayload): string {
  // 키 정렬 후 JSON serialize — 서버·클라이언트 모두 동일해야 함
  const ordered = {
    authIssuedAt: payload.authIssuedAt,
    birthDate: payload.birthDate,
    carrier: payload.carrier,
    ci: payload.ci,
    di: payload.di,
    gender: payload.gender,
    isForeigner: payload.isForeigner,
    name: payload.name,
  }
  return JSON.stringify(ordered)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

// ─── Validation helpers ──────────────────────────────────────

function isPayloadValid(p: PassRawPayload): boolean {
  if (!p.name || p.name.length < 2) return false
  if (!/^\d{8}$/.test(p.birthDate)) return false
  if (p.gender !== "M" && p.gender !== "F") return false
  if (!p.ci || p.ci.length < 80) return false
  if (!p.di || p.di.length < 50) return false
  return true
}

function formatBirthDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function computeAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ─── CI/DI 해시 (DB 인덱싱용) ────────────────────────────────

/**
 * CI는 평문으로 저장하지 않고 SHA-256 해시 저장.
 * 동일인 매칭은 hash 비교로 수행.
 */
export function hashCi(ci: string): string {
  const pepper = process.env.CI_PEPPER ?? "ci-pepper-dev"
  return createHash("sha256").update(ci + pepper).digest("hex")
}

export function hashDi(di: string): string {
  const pepper = process.env.DI_PEPPER ?? "di-pepper-dev"
  return createHash("sha256").update(di + pepper).digest("hex")
}

// ─── Mock 어댑터 (개발/테스트) ───────────────────────────────

export function mockPassPayload(overrides: Partial<PassRawPayload> = {}): {
  payload: PassRawPayload
  signature: string
} {
  const payload: PassRawPayload = {
    name: "홍길동",
    birthDate: "19900101",
    gender: "M",
    carrier: "SKT",
    isForeigner: false,
    ci: "C".repeat(88),
    di: "D".repeat(64),
    authIssuedAt: new Date().toISOString(),
    ...overrides,
  }
  const secret = process.env.PASS_SHARED_SECRET ?? "dev-secret-replace-me"
  const signature = createHash("sha256")
    .update(canonicalize(payload) + secret)
    .digest("hex")
  return { payload, signature }
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  SESSIONS,
  SESSION_TTL_MS,
  MIN_AGE,
  canonicalize,
  isPayloadValid,
  computeAge,
  formatBirthDate,
}
