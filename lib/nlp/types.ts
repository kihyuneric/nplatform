// ─────────────────────────────────────────────
//  NLP Pipeline – Shared Type Definitions
// ─────────────────────────────────────────────

/** 방향성 레이블 */
export type Direction = '상승' | '하락' | '중립' | '불명';

/** 지역 엔티티 */
export interface RegionEntity {
  sido: string;       // 시도 (서울, 경기, ...)
  sigungu?: string;   // 시군구 (강남구, 수원시, ...)
  raw: string;        // 원문에서 추출한 텍스트
}

/** 키워드 항목 */
export interface KeywordScore {
  keyword: string;
  score: number;      // 0~1 중요도
  category: KeywordCategory;
}

export type KeywordCategory =
  | '거래유형'    // 매매, 전세, 월세
  | '상품유형'    // 아파트, 오피스텔, 빌라
  | '정책제도'    // 재건축, 청약, 규제
  | '시장동향'    // 상승, 하락, 침체, 급등
  | '인프라'      // GTX, 지하철, 교통
  | '지역'        // 강남, 판교, 분당
  | '경제지표'    // 금리, 대출, 물가
  | '기타';

/** 방향성 분류 결과 */
export interface ClassificationResult {
  direction: Direction;
  score: number;        // 0~1 신뢰도
  reasoning: string;    // 분류 근거 (디버깅용)
}

/** 감성 분석 결과 */
export interface SentimentResult {
  score: number;        // -1(매우 부정) ~ +1(매우 긍정)
  label: '긍정' | '부정' | '중립';
  positive_signals: string[];
  negative_signals: string[];
}

/** 전처리된 기사 입력 */
export interface ArticleInput {
  id?: number | string;
  title: string;
  summary?: string;
  body?: string;        // 본문 (있을 경우)
  published_at?: string;
  provider?: string;
}

/** NLP 파이프라인 전체 결과 */
export interface NLPResult {
  article_id?: number | string;
  regions: RegionEntity[];
  primary_sido?: string;
  primary_sigungu?: string;
  classification: ClassificationResult;
  keywords: KeywordScore[];
  sentiment: SentimentResult;
  processed_at: string;
}

/** 심리지수 계산 입력 */
export interface PsychologyInput {
  date: string;
  articles: Array<{
    direction: Direction;
    direction_score: number;
    sentiment_score: number;
    published_at: string;
  }>;
}

/** 심리지수 결과 */
export interface PsychologyResult {
  date: string;
  sido: string;
  composite: number;        // 종합 0~100
  buy_sentiment: number;    // 매수 심리
  lease_sentiment: number;  // 전세 심리
  fear_greed: number;       // 공포탐욕
  label: PsychologyLabel;
  article_count: number;
  up_count: number;
  down_count: number;
  neutral_count: number;
}

export type PsychologyLabel = '극도공포' | '공포' | '중립' | '낙관' | '탐욕' | '극도탐욕';
