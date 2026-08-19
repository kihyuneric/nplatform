/**
 * 관리번호 — 단일 규칙 (SSoT · 2026-08-19)
 *
 * 형식: `N{연도 2자리}-{일련번호}`   예) N26-1, N26-2, … N26-70
 *   - 연도: 매물 등록 연도의 뒤 2자리 (2026 → 26)
 *   - 일련번호: 해당 연도 내 등록순(오래된 것부터) 1,2,3… (0 패딩 없음)
 *   - 내부 id(UUID)는 그대로 두고 **표시용 번호만** 이 규칙을 따른다.
 *
 * 접두사를 바꾸려면 아래 LISTING_NO_PREFIX 한 줄과
 * DB 트리거(assign_listing_no)만 고치면 된다.
 *
 * 관리번호는 **매물(npl_listings)에만 존재한다.** 메인 하이라이트 등 다른 화면은
 * 자기 번호를 새로 만들지 않고 연결된 매물의 번호를 그대로 가져다 쓴다.
 */

export const LISTING_NO_PREFIX = 'N'

export type ListingLike = {
  id: string
  /** DB 고정 관리번호 (npl_listings.listing_no) — 있으면 항상 이 값이 우선 */
  listing_no?: string | null
  created_at?: string | null
  created_days_ago?: number
}

const yy = (iso?: string | null, daysAgo?: number): string => {
  if (iso) {
    const y = new Date(iso).getFullYear()
    if (Number.isFinite(y) && y > 2000) return String(y).slice(2)
  }
  if (typeof daysAgo === 'number') {
    const d = new Date(Date.now() - daysAgo * 86_400_000)
    return String(d.getFullYear()).slice(2)
  }
  return String(new Date().getFullYear()).slice(2)
}

/** 'N26-7' → { yy: '26', seq: 7 } · 형식이 아니면 null */
const parseNo = (no: string): { yy: string; seq: number } | null => {
  const m = new RegExp(`^${LISTING_NO_PREFIX}(\\d{2})-(\\d+)$`).exec(no)
  return m ? { yy: m[1], seq: Number(m[2]) } : null
}

/**
 * 매물 목록 → { [id]: 'N26-1' }
 *
 * 1순위: DB 의 listing_no (등록 시 트리거로 확정)
 *        → 어느 화면에서 보든 같은 매물은 같은 번호가 된다.
 * 2순위: 샘플·미채번 데이터만 화면 내 등록순으로 임시 채번한다.
 *        (이미 쓰인 번호와 겹치지 않도록 연도별 최대값 다음부터 이어붙인다)
 */
export function buildListingNoMap(listings: ListingLike[]): Record<string, string> {
  const map: Record<string, string> = {}
  const seq: Record<string, number> = {}

  // DB 번호 먼저 확정 + 연도별 사용 중인 최대 일련번호 파악
  for (const x of listings) {
    const no = (x.listing_no ?? '').trim()
    if (!no) continue
    map[x.id] = no
    const p = parseNo(no)
    if (p) seq[p.yy] = Math.max(seq[p.yy] ?? 0, p.seq)
  }

  // 남은 건(샘플 등)만 등록 오래된 순으로 이어서 채번
  const rest = listings
    .filter(x => !map[x.id])
    .sort((a, b) => {
      if (a.created_at && b.created_at) return String(a.created_at).localeCompare(String(b.created_at))
      return (b.created_days_ago ?? 0) - (a.created_days_ago ?? 0)
    })
  for (const x of rest) {
    const y = yy(x.created_at, x.created_days_ago)
    seq[y] = (seq[y] ?? 0) + 1
    map[x.id] = `${LISTING_NO_PREFIX}${y}-${seq[y]}`
  }
  return map
}

/** 단건 표시 — 맵이 없을 때의 폴백 (연도 + id 앞자리) */
export function fallbackListingNo(x: ListingLike): string {
  return `${LISTING_NO_PREFIX}${yy(x.created_at, x.created_days_ago)}-${String(x.id).slice(0, 4)}`
}
