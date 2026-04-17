/**
 * lib/security/pii-masking.ts
 *
 * PII(개인식별정보) 마스킹 모듈. 모든 사용자 표시·로그·API 응답은
 * 이 모듈을 거쳐 출력해야 한다.
 *
 * 호출 위치:
 *   - API route handler 응답 직전 (maskObject)
 *   - audit_logs 렌더 (관리자 화면)
 *   - 이메일·푸시 알림 본문 빌더
 *   - 채팅·계약서 미리보기
 *
 * 설계 원칙:
 *   1) 실패는 비즈니스 로직을 막지 않는다 — 매칭 안 되면 원본 반환
 *   2) 정규식은 한국 환경에 최적화 (주민번호/사업자/전화/계좌)
 *   3) 마스킹 강도(level)는 호출자가 지정 — STRICT/STANDARD/LOOSE
 *   4) 키 기반 마스킹(maskObject)으로 객체 트리 재귀
 *   5) 감사 가능: 마스킹 발생 시 maskedFields 메타 동봉 가능
 */

// ─── Types ────────────────────────────────────────────────────

export type MaskLevel = "STRICT" | "STANDARD" | "LOOSE"

export type PiiKind =
  | "RRN"            // 주민등록번호
  | "BIZ_NO"         // 사업자등록번호
  | "CORP_NO"        // 법인등록번호
  | "PHONE"          // 전화번호
  | "EMAIL"          // 이메일
  | "BANK_ACCOUNT"   // 계좌번호
  | "ADDRESS"        // 주소
  | "NAME"           // 이름
  | "CARD"           // 카드번호

export interface MaskOptions {
  level?: MaskLevel
  /** 특정 키만 마스킹 (object 기반) */
  keys?: string[]
  /** 추적용 필드 수집 */
  collectMaskedFields?: boolean
}

export interface MaskReport<T> {
  data: T
  maskedFields: string[]
}

// ─── 1) 단일 값 마스킹 ───────────────────────────────────────

/** 주민등록번호: 901231-1234567 → 901231-1****** */
export function maskRrn(value: string): string {
  return value.replace(/(\d{6})[-]?([1-4])(\d{6})/g, (_, a, b) => `${a}-${b}******`)
}

/** 사업자등록번호: 123-45-67890 → 123-45-***** */
export function maskBizNo(value: string): string {
  return value.replace(/(\d{3})-?(\d{2})-?(\d{5})/g, "$1-$2-*****")
}

/** 법인등록번호: 110111-1234567 → 110111-******* */
export function maskCorpNo(value: string): string {
  return value.replace(/(\d{6})-?(\d{7})/g, "$1-*******")
}

/** 휴대폰: 010-1234-5678 → 010-****-5678 (LOOSE) / 010-****-**78 (STRICT) */
export function maskPhone(value: string, level: MaskLevel = "STANDARD"): string {
  return value.replace(/(01[016789])[-\s.]?(\d{3,4})[-\s.]?(\d{4})/g, (_, a, _b, c) => {
    if (level === "STRICT") return `${a}-****-**${c.slice(2)}`
    if (level === "LOOSE") return `${a}-${_b}-${c}`
    return `${a}-****-${c}`
  })
}

/** 이메일: hong@example.com → ho**@example.com / h***@e******.com (STRICT) */
export function maskEmail(value: string, level: MaskLevel = "STANDARD"): string {
  return value.replace(/([\w.+-]+)@([\w-]+)\.([\w.-]+)/g, (_, local, domain, tld) => {
    if (level === "LOOSE") return `${local}@${domain}.${tld}`
    if (level === "STRICT") {
      const lh = local.slice(0, 1) + "*".repeat(Math.max(local.length - 1, 1))
      const dh = domain.slice(0, 1) + "*".repeat(Math.max(domain.length - 1, 1))
      return `${lh}@${dh}.${tld}`
    }
    const lh = local.slice(0, 2) + "*".repeat(Math.max(local.length - 2, 1))
    return `${lh}@${domain}.${tld}`
  })
}

/** 계좌번호: 110-123-456789 → 110-***-***789 */
export function maskBankAccount(value: string): string {
  // 9~14자리 + 하이픈
  return value.replace(/(\d{2,4})[-\s]?(\d{2,4})[-\s]?(\d{4,8})/g, (_, a, _b, c) => {
    const tail = c.length >= 3 ? c.slice(-3) : c
    return `${a}-***-***${tail}`
  })
}

/** 카드번호: 4*** **** **** 1234 */
export function maskCard(value: string): string {
  return value.replace(/(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})/g, (_, a, _b, _c, d) => {
    return `${a[0]}*** **** **** ${d}`
  })
}

/** 주소: STANDARD = 시군구 까지만, STRICT = 시도까지만 */
export function maskAddress(value: string, level: MaskLevel = "STANDARD"): string {
  if (level === "LOOSE") return value
  const parts = value.trim().split(/\s+/)
  if (parts.length <= 1) return value
  if (level === "STRICT") {
    return `${parts[0]} ***`
  }
  // STANDARD: 시도 + 시군구 + ***
  if (parts.length >= 2) return `${parts[0]} ${parts[1]} ***`
  return value
}

/** 이름: 홍길동 → 홍*동 (STANDARD) / 홍** (STRICT) */
export function maskName(value: string, level: MaskLevel = "STANDARD"): string {
  if (level === "LOOSE") return value
  const trimmed = value.trim()
  if (trimmed.length <= 1) return trimmed
  if (level === "STRICT") {
    return trimmed[0] + "*".repeat(trimmed.length - 1)
  }
  if (trimmed.length === 2) return trimmed[0] + "*"
  return trimmed[0] + "*".repeat(trimmed.length - 2) + trimmed[trimmed.length - 1]
}

// ─── 2) 자유 텍스트 → 자동 마스킹 ────────────────────────────

/**
 * 본문 텍스트에서 PII 패턴을 모두 찾아 마스킹.
 * 채팅 메시지·로그 텍스트·이메일 본문에서 사용.
 */
export function maskText(text: string, level: MaskLevel = "STANDARD"): string {
  if (!text) return text
  let out = text
  // 순서 중요: 더 긴 패턴 먼저
  out = maskRrn(out)
  out = maskCorpNo(out)
  out = maskBizNo(out)
  out = maskCard(out)
  out = maskBankAccount(out)
  out = maskPhone(out, level)
  out = maskEmail(out, level)
  return out
}

// ─── 3) 객체 트리 마스킹 ─────────────────────────────────────

const PII_KEY_PATTERNS: Record<PiiKind, RegExp[]> = {
  RRN:          [/^rrn$/i, /resident/i, /jumin/i],
  BIZ_NO:       [/business.*number/i, /biz.*no/i, /bizNumber$/i],
  CORP_NO:      [/corp.*number/i, /corporation.*no/i],
  PHONE:        [/phone/i, /mobile/i, /tel/i, /hp$/i],
  EMAIL:        [/email/i, /mail$/i],
  BANK_ACCOUNT: [/account.*number/i, /bank.*account/i, /accountNo$/i],
  ADDRESS:      [/address/i, /addr$/i, /road.*addr/i],
  NAME:         [/^name$/i, /^username$/i, /full.*name/i, /representative.*name/i],
  CARD:         [/card.*number/i, /^card$/i, /pan$/i],
}

function detectKindByKey(key: string): PiiKind | null {
  for (const [kind, patterns] of Object.entries(PII_KEY_PATTERNS)) {
    if (patterns.some(p => p.test(key))) return kind as PiiKind
  }
  return null
}

function maskByKind(value: string, kind: PiiKind, level: MaskLevel): string {
  switch (kind) {
    case "RRN":          return maskRrn(value)
    case "BIZ_NO":       return maskBizNo(value)
    case "CORP_NO":      return maskCorpNo(value)
    case "PHONE":        return maskPhone(value, level)
    case "EMAIL":        return maskEmail(value, level)
    case "BANK_ACCOUNT": return maskBankAccount(value)
    case "CARD":         return maskCard(value)
    case "ADDRESS":      return maskAddress(value, level)
    case "NAME":         return maskName(value, level)
  }
}

/**
 * 객체 트리에서 키 이름 기반으로 PII 자동 마스킹.
 * collectMaskedFields=true 시 마스킹된 dot-path 목록 반환.
 */
export function maskObject<T>(input: T, opts: MaskOptions = {}): MaskReport<T> {
  const level = opts.level ?? "STANDARD"
  const masked: string[] = []
  const explicit = opts.keys ? new Set(opts.keys) : null

  function walk(v: unknown, path: string): unknown {
    if (v == null) return v
    if (typeof v === "string") {
      // 자유 텍스트 보호 — 본문에 PII가 포함된 경우
      if (path === "") return maskText(v, level)
      return v
    }
    if (Array.isArray(v)) {
      return v.map((item, i) => walk(item, `${path}[${i}]`))
    }
    if (typeof v === "object") {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const subPath = path ? `${path}.${k}` : k
        const explicitHit = explicit?.has(k) ?? false
        const kind = explicitHit ? guessKindForKey(k) : detectKindByKey(k)
        if (kind && typeof val === "string") {
          out[k] = maskByKind(val, kind, level)
          if (out[k] !== val) masked.push(subPath)
        } else if (typeof val === "string") {
          // 본문 자동 스캔
          const maskedVal = maskText(val, level)
          out[k] = maskedVal
          if (maskedVal !== val) masked.push(subPath)
        } else {
          out[k] = walk(val, subPath)
        }
      }
      return out
    }
    return v
  }

  const result = walk(input, "") as T
  return {
    data: result,
    maskedFields: opts.collectMaskedFields ? masked : [],
  }
}

function guessKindForKey(key: string): PiiKind | null {
  return detectKindByKey(key)
}

// ─── 4) 권한 기반 표시 (관리자 hover-to-reveal) ──────────────

export interface RevealableField {
  masked: string
  /** 원본 (관리자 권한 + 감사 후에만 노출) */
  raw?: string
  kind: PiiKind
}

export function makeRevealable(value: string, kind: PiiKind, level: MaskLevel = "STANDARD"): RevealableField {
  return {
    masked: maskByKind(value, kind, level),
    raw: value,
    kind,
  }
}

/**
 * 관리자가 raw 값을 요청할 때 호출. 호출 시 audit_logs.action="PII_ACCESS" 로깅 필수.
 * 본 함수는 단순 게이트 — 실제 권한 검증은 호출 측 책임.
 */
export function revealField(
  field: RevealableField,
  permitted: boolean,
): { value: string; revealed: boolean } {
  if (!permitted) return { value: field.masked, revealed: false }
  if (!field.raw) return { value: field.masked, revealed: false }
  return { value: field.raw, revealed: true }
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  PII_KEY_PATTERNS,
  detectKindByKey,
  maskByKind,
}
