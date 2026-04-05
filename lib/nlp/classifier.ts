// ─────────────────────────────────────────────
//  NLP – Direction Classifier (Claude API)
//  규칙 기반 1차 분류 → 확신 낮을 때 Claude 호출
// ─────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk';
import type { ClassificationResult, Direction } from './types';

// ── 규칙 기반 1차 분류 사전 ──────────────────
const STRONG_UP = ['급등', '폭등', '대폭상승', '상승세 지속', '신고가', '역대 최고', '완판'];
const STRONG_DOWN = ['급락', '폭락', '대폭하락', '하락세 지속', '역대 최저', '거래절벽', '미분양 급증', '깡통전세'];
const UP_SIGNALS = ['상승', '올랐다', '오름세', '반등', '회복', '호재', '수요 증가', '경쟁률 상승'];
const DOWN_SIGNALS = ['하락', '내렸다', '하락세', '침체', '악재', '수요 감소', '공실', '역전세'];

function ruleBasedClassify(text: string): ClassificationResult | null {
  // 강한 시그널 먼저 체크
  const strongUpCount = STRONG_UP.filter(s => text.includes(s)).length;
  const strongDownCount = STRONG_DOWN.filter(s => text.includes(s)).length;
  if (strongUpCount > 0 && strongDownCount === 0)
    return { direction: '상승', score: 0.9, reasoning: `강한 상승 시그널: ${STRONG_UP.filter(s => text.includes(s)).join(', ')}` };
  if (strongDownCount > 0 && strongUpCount === 0)
    return { direction: '하락', score: 0.9, reasoning: `강한 하락 시그널: ${STRONG_DOWN.filter(s => text.includes(s)).join(', ')}` };

  // 일반 시그널
  const upCount = UP_SIGNALS.filter(s => text.includes(s)).length;
  const downCount = DOWN_SIGNALS.filter(s => text.includes(s)).length;
  const diff = upCount - downCount;

  if (diff >= 2)  return { direction: '상승', score: 0.7 + Math.min(0.15, diff * 0.03), reasoning: `상승 신호 ${upCount}개 vs 하락 ${downCount}개` };
  if (diff <= -2) return { direction: '하락', score: 0.7 + Math.min(0.15, Math.abs(diff) * 0.03), reasoning: `하락 신호 ${downCount}개 vs 상승 ${upCount}개` };
  if (upCount === 0 && downCount === 0) return { direction: '중립', score: 0.8, reasoning: '방향성 시그널 없음' };

  return null; // 불확실 → Claude 호출 필요
}

// ── Claude API 분류 ───────────────────────────
const SYSTEM_PROMPT = `당신은 부동산 뉴스 방향성 분류 전문가입니다.
주어진 한국어 부동산 뉴스 제목과 요약을 분석하여 시장 방향성을 분류하세요.

분류 기준:
- 상승: 가격 상승, 수요 증가, 긍정적 시장 전망, 거래 활성화
- 하락: 가격 하락, 수요 감소, 부정적 시장 전망, 거래 침체
- 중립: 단순 사실 보도, 정책 발표(방향성 불명확), 통계 수치 나열
- 불명: 부동산과 무관한 뉴스

반드시 아래 JSON 형식으로만 응답하세요:
{"direction": "상승|하락|중립|불명", "score": 0.0~1.0, "reasoning": "한 줄 근거"}`;

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    });
  }
  return anthropicClient;
}

async function claudeClassify(text: string): Promise<ClassificationResult> {
  try {
    const client = getClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',  // 빠르고 저렴한 Haiku 사용
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text.slice(0, 600) }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const parsed = JSON.parse(raw) as {
      direction: Direction;
      score: number;
      reasoning: string;
    };

    const validDirections: Direction[] = ['상승', '하락', '중립', '불명'];
    const direction = validDirections.includes(parsed.direction) ? parsed.direction : '중립';
    return {
      direction,
      score: Math.min(1, Math.max(0, parsed.score ?? 0.5)),
      reasoning: parsed.reasoning ?? '',
    };
  } catch {
    // Claude 호출 실패 시 중립으로 폴백
    return { direction: '중립', score: 0.5, reasoning: 'API 오류로 인한 기본값' };
  }
}

// ── 메인 분류 함수 (규칙 기반 → Claude) ─────
export async function classifyDirection(
  text: string,
  useLLM = true,
): Promise<ClassificationResult> {
  const ruleResult = ruleBasedClassify(text);

  // 규칙으로 충분히 확신하면 Claude 생략
  if (ruleResult && ruleResult.score >= 0.75) return ruleResult;

  // API 키 없거나 useLLM=false이면 규칙 결과 사용
  if (!useLLM || !process.env.ANTHROPIC_API_KEY) {
    return ruleResult ?? { direction: '중립', score: 0.5, reasoning: '규칙 분류 불확실, LLM 비활성' };
  }

  return claudeClassify(text);
}

/** 배치 분류 (API 호출 최소화) */
export async function classifyBatch(
  articles: Array<{ id: string | number; text: string }>,
  useLLM = true,
): Promise<Array<{ id: string | number } & ClassificationResult>> {
  const results = await Promise.all(
    articles.map(async a => ({
      id: a.id,
      ...(await classifyDirection(a.text, useLLM)),
    })),
  );
  return results;
}
