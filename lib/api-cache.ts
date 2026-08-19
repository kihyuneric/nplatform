/**
 * 인증 의존 응답의 캐시 정책 (2026-08-19)
 *
 * 왜 필요한가:
 *   같은 URL 이라도 로그인한 사람에 따라 내용이 달라지는 API 는 절대 공유 캐시에 올리면 안 된다.
 *   실제로 운영관리자의 NDA 문서 목록 응답이 캐시돼 매입 회원 요청에 그대로 전달되는
 *   사고가 있었다(다른 회원의 체결 문서가 노출됨).
 *
 * 사용:
 *   return NextResponse.json(payload, { headers: NO_STORE })
 */
export const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
} as const
