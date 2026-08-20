/**
 * 매칭 발송 반응 추적 (2026-08-19) — 운영기획서 v4 §3-6
 *
 * 발송한 매물을 받은 회원이 실제로 **열람 → 관심 → NDA** 로 이어졌는지 기록한다.
 * 이 데이터가 쌓여야 "어떤 조건의 회원에게 어떤 매물을 보내면 반응이 오는가"를 알 수 있다.
 *
 * 왜 RPC 인가 — 회원 세션에는 `match_dispatches` UPDATE 권한이 없다(읽기 전용 정책).
 * 그래서 본인 행의 정해진 시각 컬럼만 채우는 SECURITY DEFINER 함수를 통해 기록한다.
 *
 * 원칙
 *   - 최초 1회만 기록한다. 첫 반응 시점이 의미 있는 값이다 (함수 안에서 `is null` 로 보장).
 *   - 발송 이력이 없는 조합은 아무 일도 일어나지 않는다. 매칭 발송을 거치지 않고
 *     스스로 찾아 들어온 경우까지 억지로 기록하지 않는다.
 *   - **실패해도 본래 동작(관심 등록·NDA 접수)을 막지 않는다.** 추적은 부가 기능이다.
 */

type TrackField = 'opened_at' | 'favorited_at' | 'nda_requested_at'

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>
}

export async function trackMatchReaction(
  supabase: unknown,
  listingId: string,
  userId: string,
  field: TrackField,
): Promise<void> {
  if (!listingId || !userId) return
  try {
    await (supabase as RpcClient).rpc('track_match_reaction', {
      p_listing_id: listingId,
      p_field: field,
    })
  } catch {
    // 추적 실패가 본래 동작을 막지 않는다
  }
}
