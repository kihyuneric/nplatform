/**
 * 관리번호 (NPL 매물 표시 번호) — 단일 규칙 (SSoT · 2026-08-19)
 *
 * 형식: `NPL{연도 2자리}-{일련번호}`   예) NPL26-1, NPL26-2, … NPL26-63
 *   - 연도: 매물 등록 연도의 뒤 2자리 (2026 → 26)
 *   - 일련번호: 해당 연도 내 등록순(오래된 것부터) 1,2,3… (0 패딩 없음)
 *   - 내부 id(UUID)는 그대로 두고 **표시용 번호만** 이 규칙을 따른다.
 *
 * 모든 화면(자동매칭 · 내 매물 · 관리자 · NDA · 하이라이트)이 이 함수를 사용한다.
 */

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

/**
 * 매물 목록 → { [id]: 'NPL26-1' }
 *
 * 1순위: DB 의 listing_no (npl_listings.listing_no · 등록 시 트리거로 확정)
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
    const m = /^NPL(\d{2})-(\d+)$/.exec(no)
    if (m) seq[m[1]] = Math.max(seq[m[1]] ?? 0, Number(m[2]))
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
    map[x.id] = `NPL${y}-${seq[y]}`
  }
  return map
}

/** 단건 표시 — 맵이 없을 때의 폴백 (연도 + id 앞자리) */
export function fallbackListingNo(x: ListingLike): string {
  return `NPL${yy(x.created_at, x.created_days_ago)}-${String(x.id).slice(0, 4)}`
}
