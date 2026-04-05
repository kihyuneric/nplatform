/**
 * POST /api/nlp/analyze
 * 단일 기사 실시간 NLP 분석 (방향성 + 키워드 + 감성 + 지역)
 */
import { NextRequest, NextResponse } from 'next/server';
import { analyzeArticle } from '@/lib/nlp/pipeline';
import { sanitizeInput } from '@/lib/sanitize';
import type { ArticleInput } from '@/lib/nlp/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ArticleInput;

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: { code: 'MISSING_TITLE', message: 'title 필드가 필요합니다' } },
        { status: 400 },
      );
    }

    if (body.title) body.title = sanitizeInput(body.title)
    if (body.summary) body.summary = sanitizeInput(body.summary)
    if (body.body) body.body = sanitizeInput(body.body)

    const result = await analyzeArticle(body, {
      useLLM: !!process.env.ANTHROPIC_API_KEY,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[NLP/analyze]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '분석 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/nlp/analyze  (배치)
 * Body: { articles: ArticleInput[] }
 */
export async function PUT(req: NextRequest) {
  try {
    const { articles } = await req.json() as { articles: ArticleInput[] };

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: { code: 'MISSING_ARTICLES', message: 'articles 배열이 필요합니다' } },
        { status: 400 },
      );
    }
    if (articles.length > 50) {
      return NextResponse.json(
        { error: { code: 'TOO_MANY', message: '한 번에 최대 50건까지 처리 가능합니다' } },
        { status: 400 },
      );
    }

    const { analyzeArticles, summarizeResults } = await import('@/lib/nlp/pipeline');
    const results = await analyzeArticles(articles, {
      useLLM: !!process.env.ANTHROPIC_API_KEY,
      concurrency: 5,
    });
    const summary = summarizeResults(results);

    return NextResponse.json({ data: results, summary });
  } catch (err) {
    console.error('[NLP/analyze batch]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '배치 분석 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
