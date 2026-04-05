// ─────────────────────────────────────────────
//  NLP – Keyword Extractor (사전 + 빈도 기반)
// ─────────────────────────────────────────────
import type { KeywordScore, KeywordCategory } from './types';

// ── 부동산 전문 키워드 사전 ───────────────────

const KEYWORD_DICT: Record<string, KeywordCategory> = {
  // 거래 유형
  매매: '거래유형', 전세: '거래유형', 월세: '거래유형', 반전세: '거래유형',
  임대차: '거래유형', 단기임대: '거래유형', 갱신: '거래유형',

  // 상품 유형
  아파트: '상품유형', 오피스텔: '상품유형', 빌라: '상품유형', 다세대: '상품유형',
  단독주택: '상품유형', 상가: '상품유형', 오피스: '상품유형', 지식산업센터: '상품유형',
  생활형숙박시설: '상품유형', 주거용오피스텔: '상품유형',

  // 정책·제도
  재건축: '정책제도', 재개발: '정책제도', 청약: '정책제도', 규제: '정책제도',
  분양: '정책제도', '안전진단': '정책제도', 용적률: '정책제도', 건폐율: '정책제도',
  토지거래허가: '정책제도', '지구단위계획': '정책제도', 도시정비: '정책제도',
  주거정비: '정책제도', 가로주택: '정책제도', 소규모재건축: '정책제도',
  '2030서울플랜': '정책제도', 특례보금자리: '정책제도', 디딤돌대출: '정책제도',
  버팀목대출: '정책제도', 보금자리론: '정책제도',

  // 시장 동향
  상승: '시장동향', 하락: '시장동향', 급등: '시장동향', 급락: '시장동향',
  침체: '시장동향', 회복: '시장동향', 반등: '시장동향', '강보합': '시장동향',
  '약보합': '시장동향', 과열: '시장동향', 조정: '시장동향', 거래절벽: '시장동향',
  매물: '시장동향', 호가: '시장동향', 실거래가: '시장동향', 공시가격: '시장동향',

  // 인프라
  GTX: '인프라', '지하철': '인프라', 광역철도: '인프라', 트램: '인프라',
  '신도시': '인프라', 택지개발: '인프라', '3기신도시': '인프라', 산업단지: '인프라',
  데이터센터: '인프라', 물류센터: '인프라',

  // 경제 지표
  금리: '경제지표', 기준금리: '경제지표', 대출: '경제지표', LTV: '경제지표',
  DTI: '경제지표', DSR: '경제지표', 물가: '경제지표', 인플레이션: '경제지표',
  환율: '경제지표', 공급: '경제지표', 공급과잉: '경제지표', 미분양: '경제지표',
  입주물량: '경제지표', 착공: '경제지표', 허가: '경제지표',

  // 투자 관련
  투자: '기타', 갭투자: '기타', 경매: '기타', NPL: '기타',
  공매도: '기타', 리츠: '기타', 임대수익: '기타', 수익률: '기타',
};

// ── 불용어 목록 ────────────────────────────────
const STOPWORDS = new Set([
  '있다', '없다', '하다', '되다', '이다', '것', '수', '때', '등',
  '및', '또', '또는', '그', '이', '저', '이번', '지난', '올해',
  '올', '내년', '지역', '관련', '통해', '위해', '따라', '대한',
  '전국', '현재', '최근', '기준', '규모', '수준', '위한', '예정',
  '발표', '공개', '진행', '마련', '검토', '계획', '추진',
]);

// ── 텍스트 토크나이저 (한국어 어절 기반) ─────
function tokenize(text: string): string[] {
  // 특수문자 제거, 공백 분리, 2~10자 토큰만
  return text
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && t.length <= 10)
    .filter(t => !STOPWORDS.has(t));
}

// ── TF (Term Frequency) 계산 ──────────────────
function calcTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  for (const [k, v] of tf) tf.set(k, v / total);
  return tf;
}

// ── 메인 추출 함수 ────────────────────────────

export function extractKeywords(
  text: string,
  topK = 8,
): KeywordScore[] {
  const tokens = tokenize(text);
  const tf = calcTF(tokens);
  const results: KeywordScore[] = [];

  // 1. 사전 키워드 우선 추출
  for (const [kw, category] of Object.entries(KEYWORD_DICT)) {
    if (text.includes(kw)) {
      const freq = tf.get(kw) ?? 0.01;
      // 사전 보너스 적용 (0.3 기본값 + TF)
      const score = Math.min(1, 0.3 + freq * 10);
      results.push({ keyword: kw, score, category });
    }
  }

  // 2. 사전에 없는 고빈도 명사형 토큰 추가
  for (const [token, freq] of tf) {
    if (KEYWORD_DICT[token]) continue;           // 이미 처리
    if (STOPWORDS.has(token)) continue;
    if (freq < 0.02) continue;                   // 빈도 2% 미만 제외
    if (!/^[\uAC00-\uD7A3]+$/.test(token)) continue; // 한글만
    results.push({ keyword: token, score: freq * 5, category: '기타' });
  }

  // 3. 점수 내림차순 정렬 후 topK 반환
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** 카테고리별 주요 키워드 분류 */
export function groupKeywordsByCategory(
  keywords: KeywordScore[],
): Record<KeywordCategory, string[]> {
  const result: Record<string, string[]> = {};
  for (const kw of keywords) {
    if (!result[kw.category]) result[kw.category] = [];
    result[kw.category].push(kw.keyword);
  }
  return result as Record<KeywordCategory, string[]>;
}
