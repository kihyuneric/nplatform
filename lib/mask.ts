/**
 * lib/mask.ts — 공개 리스트·상세(L0/L1) 및 딜룸에서 기관/채권자 식별을 가리기 위한 마스킹 유틸
 *
 * 정책 (2026-04-26 갱신):
 *  · 금융기관/채권자 이름의 **앞 5글자**를 'ooooo' 로 치환한다.
 *  · 5글자 이하의 짧은 식별자는 전체를 'ooooo' 로 마스킹한다.
 *  · 마스킹은 공개 영역(L0/L1) 및 딜룸에서 모두 적용한다 — 원본 노출은 SUPER_ADMIN /
 *    SELLER 본인 / 채권자 본인만 허용한다.
 *
 * 예)
 *   "우리은행"          → "ooooo"
 *   "한국자산관리공사"  → "ooooo관리공사"
 *   "IBK기업은행"       → "ooooo행"
 *   "신한은행카드"      → "ooooo드"
 */

const PREFIX = "ooooo"

export function maskInstitutionName(name: string | null | undefined): string {
  if (!name) return PREFIX
  const s = String(name).trim()
  if (s.length === 0) return PREFIX
  if (s.length <= PREFIX.length) return PREFIX
  return PREFIX + s.slice(PREFIX.length)
}

/** 이름 뒤쪽만 가리는 변형(미래 확장용). 현재는 사용하지 않음. */
export function maskInstitutionNameTail(name: string | null | undefined, keepHead = 2): string {
  if (!name) return PREFIX
  const s = String(name).trim()
  if (s.length <= keepHead) return "o".repeat(s.length)
  return s.slice(0, keepHead) + "o".repeat(s.length - keepHead)
}
