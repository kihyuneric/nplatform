/**
 * lib/mask.ts — 공개 리스트·상세(L0/L1)에서 기관 식별을 가리기 위한 마스킹 유틸
 *
 * 정책 (2026-04-20 결정):
 *  · 금융기관 매각사 이름의 **앞 3글자**를 'ooo' 로 치환한다.
 *  · 3글자 미만의 짧은 식별자는 길이만큼 'o' 로 치환한다.
 *  · 마스킹은 공개 영역(L0/L1 매물 리스트·상세)에서만 적용하고,
 *    NDA 체결(L2+) 이후의 딜룸·실사 화면에서는 실명을 그대로 노출한다.
 *
 * 예)
 *   "우리은행"          → "ooo은행"
 *   "한국자산관리공사"  → "ooo자산관리공사"
 *   "IBK기업은행"       → "ooo기업은행"
 *   "대신F&I"           → "ooo&I"
 *   "KB"                → "oo"        (길이 < 3 이면 모두 마스킹)
 */

export function maskInstitutionName(name: string | null | undefined): string {
  if (!name) return "ooo"
  const s = String(name).trim()
  if (s.length === 0) return "ooo"
  if (s.length <= 3) return "o".repeat(s.length)
  return "ooo" + s.slice(3)
}

/** 이름 뒤쪽만 가리는 변형(미래 확장용). 현재는 사용하지 않음. */
export function maskInstitutionNameTail(name: string | null | undefined, keepHead = 2): string {
  if (!name) return "ooo"
  const s = String(name).trim()
  if (s.length <= keepHead) return "o".repeat(s.length)
  return s.slice(0, keepHead) + "o".repeat(s.length - keepHead)
}
