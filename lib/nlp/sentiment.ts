// ─────────────────────────────────────────────
//  NLP – Sentiment Scorer (규칙 기반)
//  긍정/부정 신호어 사전으로 -1~1 점수 산출
// ─────────────────────────────────────────────
import type { SentimentResult } from './types';

// ── 긍정 신호어 (가중치) ─────────────────────
const POSITIVE_SIGNALS: Record<string, number> = {
  // 가격 상승 표현
  상승: 1.0, 급등: 1.5, 반등: 0.8, '강보합': 0.5, 회복: 0.7,
  올랐다: 1.0, 올라: 0.8, '오름세': 0.9, 상향: 0.7,
  // 수요 긍정
  인기: 0.7, 청약열기: 1.2, 완판: 1.3, '1순위': 0.8,
  '경쟁률': 0.9, 수요급증: 1.1, 매수세: 0.8,
  // 투자 긍정
  호재: 1.0, 개발: 0.6, 입주: 0.5, 분양성공: 1.2,
  기대감: 0.6, '전망 밝다': 1.0, 긍정적: 0.7, 활성화: 0.6,
  // 정책 긍정
  완화: 0.8, 규제완화: 1.0, 지원: 0.5, 혜택: 0.6,
};

// ── 부정 신호어 (가중치) ─────────────────────
const NEGATIVE_SIGNALS: Record<string, number> = {
  // 가격 하락 표현
  하락: 1.0, 급락: 1.5, 폭락: 1.8, 침체: 1.2, '약보합': 0.5,
  내렸다: 1.0, 내려: 0.8, '하락세': 0.9, 하향: 0.7,
  // 수요 부정
  거래절벽: 1.3, '매물쌓임': 1.1, 매수관망: 0.9, '미분양': 1.2,
  공실: 1.0, 공급과잉: 1.1, 역전세: 1.2, 전세사기: 1.5,
  // 투자 부정
  악재: 1.0, 우려: 0.6, 불안: 0.7, 리스크: 0.6, 위험: 0.7,
  손실: 1.0, 깡통전세: 1.5, 경매넘어간: 1.3,
  // 정책 부정
  규제: 0.5, 강화: 0.5, 세금: 0.5, 과세: 0.7, 제한: 0.6,
  금지: 0.8, 환수: 0.9,
};

// ── 부정어 처리 (예: "하락 없다" → 긍정) ────
const NEGATION_WORDS = ['않', '없', '아니', '못', '비', '불', '미'];

function hasNegation(text: string, signalWord: string): boolean {
  const idx = text.indexOf(signalWord);
  if (idx < 0) return false;
  const before = text.slice(Math.max(0, idx - 5), idx);
  return NEGATION_WORDS.some(neg => before.includes(neg));
}

// ── 메인 감성 분석 함수 ─────────────────────

export function analyzeSentiment(text: string): SentimentResult {
  let positiveSum = 0;
  let negativeSum = 0;
  const foundPositive: string[] = [];
  const foundNegative: string[] = [];

  // 긍정 신호 탐지
  for (const [word, weight] of Object.entries(POSITIVE_SIGNALS)) {
    if (text.includes(word)) {
      if (hasNegation(text, word)) {
        negativeSum += weight * 0.5;  // 부정어 → 반전 (절반 감점)
      } else {
        positiveSum += weight;
        foundPositive.push(word);
      }
    }
  }

  // 부정 신호 탐지
  for (const [word, weight] of Object.entries(NEGATIVE_SIGNALS)) {
    if (text.includes(word)) {
      if (hasNegation(text, word)) {
        positiveSum += weight * 0.5;  // 부정어 → 반전
      } else {
        negativeSum += weight;
        foundNegative.push(word);
      }
    }
  }

  // 정규화: sigmoid 변환으로 -1~1 범위
  const raw = positiveSum - negativeSum;
  const score = Math.tanh(raw / 3);  // tanh 로 부드럽게 정규화

  const label: SentimentResult['label'] =
    score > 0.15 ? '긍정' :
    score < -0.15 ? '부정' : '중립';

  return {
    score: Math.round(score * 100) / 100,
    label,
    positive_signals: [...new Set(foundPositive)].slice(0, 5),
    negative_signals: [...new Set(foundNegative)].slice(0, 5),
  };
}
