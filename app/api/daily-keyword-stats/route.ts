import { NextRequest, NextResponse } from 'next/server';
import { getDailyKeywordStats } from '@/lib/daily-keyword-stats';
import { getDummyDailyKeywordStats } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;

    try {
      const stats = await getDailyKeywordStats(date);
      return NextResponse.json(stats);
    } catch {
      console.warn('[daily-keyword-stats] DB fallback: using dummy data');
      const stats = getDummyDailyKeywordStats(date);
      return NextResponse.json(stats);
    }
  } catch (error) {
    console.error('[daily-keyword-stats] Error:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
