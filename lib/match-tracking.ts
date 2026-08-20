/**
 * 매칭 발송 반응 추적 (2026-08-19) — 운영기획서 v4 §3-6
 *
 * 발송한 매물을 받은 회원이 실제로 **열람 → 관심 → NDA** 로 이어졌는지 기록한다.
 * 이 데이터가 쌓여야 "어떤 조건의 회원에게 어떤 매물을 보내면 반응이 오는가"를 알 수 있다.
 *
 * 원칙
 *   - 최초 1회만 기록한다(이미 값이 있으면 덮어쓰지 않는다). 첫 반응 시점이 의미 있는 값이다.
 *   - 발송 이력이 없는 조합은 조용히 무시한다. 매칭 발송을 거치지 않고
 *     스스로 찾아 들어온 경우까지 억지로 기록하지 않는다.
 *   - **실패해도 본래 동작(관심 등록·NDA 접수)을 막지 않는다.** 추적은 부가 기능이다.
 */

type TrackField = 'opened_at' | 'favorited_at' | 'nda_requested_at'

type MinimalClient = {
  from: (table: string) => {
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          is: (c: string, v: null) => Promise<{ error: unknown }>
        }
      }
    }
  }
}

/**
 * 반응 1건 기록.
 * `is(field, null)` 조건 덕분에 이미 기록된 건은 건드리지 않는다 —
 * 별도 조회 없이 한 번의 UPDATE 로 "최초 1회"가 보장된다.
 */
export async function trackMatchReaction(
  supabase: unknown,
  listingId: string,
  userId: string,
  field: TrackField,
): Promise<void> {
  if (!listingId || !userId) return
  try {
    await (supabase as MinimalClient)
      .from('match_dispatches')
      .update({ [field]: new Date().toISOString() })
      .eq('listing_id', listingId)
      .eq('user_id', userId)
      .is(field, null)
  } catch {
    // 추적 실패가 본래 동작을 막지 않는다
  }
}
