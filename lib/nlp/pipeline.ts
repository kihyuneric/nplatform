// ─────────────────────────────────────────────
//  NLP – Main Pipeline Orchestrator
//  단일 기사를 입력받아 완전 분석 결과 반환
// ─────────────────────────────────────────────
import { extractRegions, getPrimarySido }   from './region-ner';
import { extractKeywords }                  from './keyword-extractor';
import { analyzeSentiment }                 from './sentiment';
import { classifyDirection, classifyBatch } from './classifier';
import type { ArticleInput, NLPResult }     from './types';

export type { ArticleInput, NLPResult };
export { classifyBatch };

// ── 단일 기사 분석 ────────────────────────────
export async function analyzeArticle(
  article: ArticleInput,
  options: { useLLM?: boolean } = {},
): Promise<NLPResult> {
  const { useLLM = true } = options;

  // 분석 대상 텍스트 조합
  const analysisText = [
    article.title,
    article.summary ?? '',
    (article.body ?? '').slice(0, 500),  // 본문 앞 500자만
  ].join(' ').trim();

  // 4가지 분석을 병렬 실행
  const [regions, keywords, sentiment, classification] = await Promise.all([
    Promise.resolve(extractRegions(analysisText)),
    Promise.resolve(extractKeywords(analysisText)),
    Promise.resolve(analyzeSentiment(analysisText)),
    classifyDirection(analysisText, useLLM),
  ]);

  const primarySido   = getPrimarySido(regions);
  const primarySigungu = regions.find(r => r.sido === primarySido && r.sigungu)?.sigungu;

  return {
    article_id:       article.id,
    regions,
    primary_sido:     primarySido,
    primary_sigungu:  primarySigungu,
    classification,
    keywords,
    sentiment,
    processed_at:     new Date().toISOString(),
  };
}

// ── 배치 분석 (여러 기사 동시) ────────────────
export async function analyzeArticles(
  articles: ArticleInput[],
  options: { useLLM?: boolean; concurrency?: number } = {},
): Promise<NLPResult[]> {
  const { useLLM = true, concurrency = 5 } = options;
  const results: NLPResult[] = [];

  // concurrency 제한 (API rate limit 방지)
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(a => analyzeArticle(a, { useLLM })),
    );
    results.push(...batchResults);
  }
  return results;
}

// ── 분석 결과 요약 ────────────────────────────
export function summarizeResults(results: NLPResult[]) {
  const total = results.length;
  const up      = results.filter(r => r.classification.direction === '상승').length;
  const down    = results.filter(r => r.classification.direction === '하락').length;
  const neutral = results.filter(r => r.classification.direction === '중립').length;

  const avgSentiment = results.reduce(
    (sum, r) => sum + r.sentiment.score, 0,
  ) / (total || 1);

  const keywordFreq: Record<string, number> = {};
  for (const r of results) {
    for (const kw of r.keywords) {
      keywordFreq[kw.keyword] = (keywordFreq[kw.keyword] ?? 0) + 1;
    }
  }
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  return {
    total,
    direction: { up, down, neutral, unknown: total - up - down - neutral },
    avg_sentiment: Math.round(avgSentiment * 100) / 100,
    top_keywords: topKeywords,
  };
}
