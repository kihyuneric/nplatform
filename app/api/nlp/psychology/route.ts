/**
 * GET /api/nlp/psychology?sido=전국&days=90
 * 심리지수 히스토리 반환 (DB 없을 때 더미 데이터)
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateDummyHistory } from '@/lib/nlp/psychology-calculator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sido = searchParams.get('sido') || '전국';
  const days = Math.min(365, Math.max(7, Number(searchParams.get('days') || 90)));

  try {
    // TODO: DB 연결 완료 후 실제 데이터로 교체
    // const history = await getPsychologyHistory(sido, days);
    const history = generateDummyHistory(days);

    const current = history[history.length - 1];
    const previous = history[history.length - 8] ?? history[0]; // 7일 전

    return NextResponse.json({
      current,
      previous,
      history,
      meta: { sido, days, generated_at: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[NLP/psychology]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '심리지수 조회 오류' } },
      { status: 500 },
    );
  }
}
