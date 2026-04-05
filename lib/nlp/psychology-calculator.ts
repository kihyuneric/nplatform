// ─────────────────────────────────────────────
//  NLP – Psychology Index Calculator
//  뉴스 방향성 + 감성 점수 → 심리지수 0~100
// ─────────────────────────────────────────────
import type { PsychologyInput, PsychologyResult, PsychologyLabel } from './types';

// ── 방향성 가중치 ─────────────────────────────
const DIRECTION_WEIGHT: Record<string, number> = {
  상승: +1.0,
  하락: -1.0,
  중립:  0.0,
  불명:  0.0,
};

// ── 시간 감쇠 계수 (최신 기사일수록 가중치 높음) ─
const RECENCY_DECAY = 0.92;

// ── 레이블 분류 기준 ──────────────────────────
function getLabel(score: number): PsychologyLabel {
  if (score < 20) return '극도공포';
  if (score < 35) return '공포';
  if (score < 50) return '중립';
  if (score < 65) return '낙관';
  if (score < 80) return '탐욕';
  return '극도탐욕';
}

// ── 분류별 심리지수 계산 헬퍼 ────────────────
function calcSubIndex(
  articles: PsychologyInput['articles'],
  filterFn: (a: PsychologyInput['articles'][number]) => boolean,
  fallback = 50,
): number {
  const filtered = articles.filter(filterFn);
  if (filtered.length === 0) return fallback;

  let weightedSum = 0;
  let totalWeight = 0;

  filtered
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .forEach((article, i) => {
      const dirScore = DIRECTION_WEIGHT[article.direction] ?? 0;
      const sentScore = article.sentiment_score;        // -1~1
      const combined = dirScore * 0.7 + sentScore * 0.3;
      const recencyWeight = Math.pow(RECENCY_DECAY, i);

      weightedSum += combined * recencyWeight * article.direction_score;
      totalWeight += recencyWeight;
    });

  const raw = totalWeight > 0 ? weightedSum / totalWeight : 0;
  // -1~1 → 0~100
  return Math.round(((raw + 1) / 2) * 100 * 10) / 10;
}

// ── 메인 심리지수 계산 ────────────────────────
export function calculatePsychology(
  input: PsychologyInput,
  sido = '전국',
): PsychologyResult {
  const { articles, date } = input;

  if (articles.length === 0) {
    return {
      date, sido,
      composite: 50, buy_sentiment: 50,
      lease_sentiment: 50, fear_greed: 50,
      label: '중립',
      article_count: 0, up_count: 0, down_count: 0, neutral_count: 0,
    };
  }

  // 종합 심리지수
  const composite = calcSubIndex(articles, () => true);

  // 매수 심리: 매매 관련 키워드 기반 기사
  const buy_sentiment = calcSubIndex(
    articles,
    a => a.direction !== '불명',
    composite,
  );

  // 전세 심리: 더미값 (실제는 전세 관련 기사 필터)
  const lease_sentiment = Math.round(composite * 1.07 * 10) / 10;

  // 공포탐욕: 최근 7일 이동평균
  const fear_greed = composite;

  const up_count     = articles.filter(a => a.direction === '상승').length;
  const down_count   = articles.filter(a => a.direction === '하락').length;
  const neutral_count = articles.filter(a => a.direction === '중립').length;

  return {
    date, sido,
    composite:       Math.min(100, Math.max(0, composite)),
    buy_sentiment:   Math.min(100, Math.max(0, buy_sentiment)),
    lease_sentiment: Math.min(100, Math.max(0, lease_sentiment)),
    fear_greed:      Math.min(100, Math.max(0, fear_greed)),
    label:           getLabel(composite),
    article_count:   articles.length,
    up_count,
    down_count,
    neutral_count,
  };
}

// ── 히스토리 기반 7일 이동평균 ───────────────
export function movingAverage(scores: number[], window = 7): number[] {
  return scores.map((_, i) => {
    const slice = scores.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10;
  });
}

// ── 더미 히스토리 생성 (DB 연결 전 사용) ─────
export function generateDummyHistory(
  days: number,
  baseLine = 55,
  volatility = 12,
): PsychologyResult[] {
  const results: PsychologyResult[] = [];
  let current = baseLine;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 랜덤 워크 (전일 대비 ±volatility)
    const delta = (Math.random() - 0.48) * volatility;
    current = Math.min(90, Math.max(15, current + delta));
    const composite = Math.round(current * 10) / 10;

    results.push({
      date: dateStr,
      sido: '전국',
      composite,
      buy_sentiment:   Math.round((composite * 0.92 + 3) * 10) / 10,
      lease_sentiment: Math.round((composite * 1.08 - 2) * 10) / 10,
      fear_greed:      composite,
      label:           getLabel(composite),
      article_count:   Math.floor(Math.random() * 30) + 15,
      up_count:        Math.floor(composite / 10),
      down_count:      Math.floor((100 - composite) / 15),
      neutral_count:   Math.floor(Math.random() * 8) + 3,
    });
  }
  return results;
}
