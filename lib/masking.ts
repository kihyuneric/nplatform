// ─── 마스킹 함수 (순수 함수, 의존성 없음) ──────────────

export type MaskingType = "partial" | "full" | "range" | "hash"
export type FieldType = "name" | "phone" | "ssn" | "address" | "amount" | "account" | "creditor"

/**
 * 채권자명 마스킹 (Phase 1-M · Sprint 3 · D5 · 2026-04-26 갱신):
 *   앞 5글자를 'ooooo' 로 고정 마스킹 — "신한은행카드" → "ooooo드", "농협자산관리회사" → "ooooo관리회사"
 *   5글자 이하는 전체 'ooooo' — "신한은행" → "ooooo"
 *
 * 정책: NDA 체결 여부와 무관하게 공개 목록에서 항상 적용.
 * 원본 노출은 SUPER_ADMIN / SELLER 본인 / 채권자 본인만 허용.
 */
export function maskCreditor(value: string): string {
  if (!value || !value.trim()) return ""
  const PREFIX = "ooooo"
  const len = value.length
  if (len <= PREFIX.length) return PREFIX
  return PREFIX + value.slice(PREFIX.length)
}

/**
 * 이름 마스킹: 홍길동 → 홍*동, 김서연 → 김*연
 * 2글자: 김* , 4글자: 김**동
 */
export function maskName(value: string): string {
  if (!value) return ""
  const len = value.length
  if (len <= 1) return "*"
  if (len === 2) return value[0] + "*"
  if (len === 3) return value[0] + "*" + value[2]
  return value[0] + "*".repeat(len - 2) + value[len - 1]
}

/**
 * 전화번호 마스킹: 010-1234-5678 → 010-****-5678
 */
export function maskPhone(value: string): string {
  if (!value) return ""
  const digits = value.replace(/[^0-9]/g, "")
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`
  }
  return value.replace(/./g, (c, i) => (i > 2 && i < value.length - 4 ? "*" : c))
}

/**
 * 주민등록번호 마스킹: 900101-1234567 → 900101-*******
 */
export function maskSSN(value: string): string {
  if (!value) return ""
  const clean = value.replace(/[^0-9-]/g, "")
  if (clean.includes("-")) {
    const [front] = clean.split("-")
    return `${front}-*******`
  }
  if (clean.length >= 13) {
    return `${clean.slice(0, 6)}-*******`
  }
  return clean.slice(0, 6) + "*".repeat(Math.max(0, clean.length - 6))
}

/**
 * 주소 마스킹: 서울 강남구 역삼동 123-45 → 서울 강남구 역삼동 ***-**
 */
export function maskAddress(value: string): string {
  if (!value) return ""
  // 시/도 + 구/군 까지만 표시, 나머지 마스킹
  const parts = value.split(" ")
  if (parts.length <= 2) return value
  if (parts.length === 3) return `${parts[0]} ${parts[1]} ***`
  // 3번째 단어(동/읍/면)까지 표시, 이후 마스킹
  return `${parts[0]} ${parts[1]} ${parts[2]} ${"***-**"}`
}

/**
 * 금액 범위 마스킹: 3500000000 → 30~40억
 */
export function maskAmount(value: number): string {
  if (!value || value <= 0) return "비공개"
  const eok = value / 100000000
  if (eok < 1) {
    const man = Math.floor(value / 10000)
    const low = Math.floor(man / 1000) * 1000
    return `${low.toLocaleString()}~${(low + 1000).toLocaleString()}만원`
  }
  const low = Math.floor(eok / 10) * 10
  const high = low + 10
  if (low === 0) return `1~10억원`
  return `${low}~${high}억원`
}

/**
 * 계좌번호 마스킹: 110-123-456789-12 → 110-***-******-12
 */
export function maskAccount(value: string): string {
  if (!value) return ""
  const parts = value.split("-")
  if (parts.length >= 3) {
    return [
      parts[0],
      ...parts.slice(1, -1).map((p) => "*".repeat(p.length)),
      parts[parts.length - 1],
    ].join("-")
  }
  // 하이픈 없는 경우
  if (value.length <= 4) return value
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2)
}

/**
 * 통합 마스킹 함수
 */
export function maskValue(value: string | number, fieldType: FieldType): string {
  switch (fieldType) {
    case "name": return maskName(String(value))
    case "phone": return maskPhone(String(value))
    case "ssn": return maskSSN(String(value))
    case "address": return maskAddress(String(value))
    case "amount": return maskAmount(typeof value === "number" ? value : parseInt(String(value)) || 0)
    case "account": return maskAccount(String(value))
    case "creditor": return maskCreditor(String(value))
    default: return String(value)
  }
}

// ─── 마스킹 레벨 ───────────────────────────────────────

export type MaskingLevel = "NONE" | "STANDARD" | "ENHANCED"

/**
 * 역할 + 컨텍스트 기반 마스킹 레벨 결정
 */
export function getMaskingLevel(params: {
  viewerRole: string
  isSameTenant: boolean
  isNdaSigned: boolean
  tenantRole?: string
}): MaskingLevel {
  const { viewerRole, isSameTenant, isNdaSigned, tenantRole } = params

  // 기관 관리자/검수자 → 마스킹 없음
  if (tenantRole === "TENANT_ADMIN" || tenantRole === "REVIEWER") return "NONE"

  // 같은 테넌트 소속 → 표준 마스킹
  if (isSameTenant) return "STANDARD"

  // NDA 체결된 외부 매수자 → 표준 마스킹
  if (isNdaSigned) return "STANDARD"

  // 외부 → 강화 마스킹
  return "ENHANCED"
}

/**
 * 마스킹 레벨에 따라 필드 마스킹 여부 결정
 */
export function shouldMask(fieldType: FieldType, level: MaskingLevel): boolean {
  if (level === "NONE") return false
  if (level === "ENHANCED") return true
  // STANDARD: name, ssn, account만 마스킹
  if (level === "STANDARD") {
    return ["ssn", "account"].includes(fieldType)
  }
  return false
}
