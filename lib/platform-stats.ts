/**
 * 플랫폼 공식 지표 (SSoT) — 메인 · NPL 리스트 등 모든 화면 공통.
 * 값 갱신은 이 파일 한 곳에서만. (단위: 백만원 원본 병기)
 */
export const PLATFORM_STATS = {
  nplCount: '789개',            // NPL 등록 수
  appraisalTotal: '5조 7,111억', // 감정평가 총액 (5,711,158백만원)
  mortgageTotal: '1조 4,573억',  // 근저당권 설정금액 (1,457,356백만원)
  loanPrincipalTotal: '1조 2,144억', // 대출원금 총액 (1,214,463백만원)
  institutions: '75곳',          // 참여 기관
  institutionsDesc: '은행 · 상호금융 · AMC · 저축은행',
} as const
