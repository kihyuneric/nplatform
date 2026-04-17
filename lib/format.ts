/**
 * lib/format.ts — 전역 포맷 유틸리티
 *
 * 사용 예:
 *   import { fmt } from "@/lib/format"
 *   fmt.krw(150000000)        → "1억 5,000만원"
 *   fmt.krwShort(150000000)   → "1.5억원"
 *   fmt.num(1234567)          → "1,234,567"
 *   fmt.percent(12.3)         → "12.3%"
 *   fmt.percentDiff(2.5)      → "+2.5%"
 *   fmt.date("2026-04-14")   → "2026년 4월 14일"
 *   fmt.datetime("2026-04-14T09:30:00") → "2026. 4. 14. 오전 9:30"
 *   fmt.relativeDate("2026-04-13T12:00:00") → "1일 전"
 */

// ── 금액 ─────────────────────────────────────────────────────────────────────

/** 1,234,567원 → "1,234,567원" */
export function krw(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—"
  return n.toLocaleString("ko-KR") + "원"
}

/** 150,000,000 → "1억 5,000만원" */
export function krwLong(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000)
    const man = Math.round((abs % 100_000_000) / 10_000)
    if (man === 0) return `${sign}${eok}억원`
    return `${sign}${eok}억 ${man.toLocaleString("ko-KR")}만원`
  }
  if (abs >= 10_000) {
    return `${sign}${Math.round(abs / 10_000).toLocaleString("ko-KR")}만원`
  }
  return `${sign}${abs.toLocaleString("ko-KR")}원`
}

/** 150,000,000 → "1.5억" (짧은 버전) */
export function krwShort(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억원`
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(0)}만원`
  return `${sign}${abs.toLocaleString("ko-KR")}원`
}

// ── 숫자 ─────────────────────────────────────────────────────────────────────

/** 1234567 → "1,234,567" */
export function num(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—"
  return n.toLocaleString("ko-KR")
}

// ── 퍼센트 ───────────────────────────────────────────────────────────────────

/** 12.34 → "12.3%" */
export function percent(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return "—"
  return `${n.toFixed(decimals)}%`
}

/** 2.5 → "+2.5%", -1.3 → "-1.3%" */
export function percentDiff(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return "—"
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(decimals)}%`
}

// ── 날짜 ─────────────────────────────────────────────────────────────────────

/** "2026-04-14" → "2026년 4월 14일" */
export function date(d: string | Date | null | undefined): string {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric",
    })
  } catch { return "—" }
}

/** "2026-04-14T09:30:00" → "2026. 4. 14. 오전 9:30" */
export function datetime(d: string | Date | null | undefined): string {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("ko-KR")
  } catch { return "—" }
}

/** "2026-04-13T12:00:00" → "1일 전" */
export function relativeDate(d: string | Date | null | undefined): string {
  if (!d) return "—"
  try {
    const now = Date.now()
    const then = new Date(d).getTime()
    const diff = now - then
    if (diff < 0) {
      const futureDiff = -diff
      if (futureDiff < 60_000) return "곧"
      if (futureDiff < 3_600_000) return `${Math.floor(futureDiff / 60_000)}분 후`
      if (futureDiff < 86_400_000) return `${Math.floor(futureDiff / 3_600_000)}시간 후`
      return `${Math.floor(futureDiff / 86_400_000)}일 후`
    }
    if (diff < 60_000) return "방금 전"
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`
    if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}일 전`
    if (diff < 31_536_000_000) return `${Math.floor(diff / 2_592_000_000)}개월 전`
    return `${Math.floor(diff / 31_536_000_000)}년 전`
  } catch { return "—" }
}

// ── 기타 ─────────────────────────────────────────────────────────────────────

/** 전화번호: "01012345678" → "010-1234-5678" */
export function phone(p: string | null | undefined): string {
  if (!p) return "—"
  const digits = p.replace(/\D/g, "")
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return p
}

/** 주소 마스킹: "서울특별시 강남구 역삼동 123-45" → "서울특별시 강남구 역삼동 ***" */
export function maskAddress(address: string): string {
  const parts = address.split(" ")
  if (parts.length <= 3) return parts.slice(0, 2).join(" ") + " ***"
  return parts.slice(0, 3).join(" ") + " ***"
}

/** 이름 마스킹: "홍길동" → "홍*동" */
export function maskName(name: string): string {
  if (!name || name.length < 2) return "*"
  if (name.length === 2) return name[0] + "*"
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1]
}

/** 등급 색상 */
export const GRADE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  B: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  C: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  D: { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" },
  F: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
}

// Default export for convenience: fmt.krw(), fmt.num(), etc.
export const fmt = {
  krw,
  krwLong,
  krwShort,
  num,
  percent,
  percentDiff,
  date,
  datetime,
  relativeDate,
  phone,
  maskAddress,
  maskName,
}

export default fmt
