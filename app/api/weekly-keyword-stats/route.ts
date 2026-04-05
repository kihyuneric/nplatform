import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyKeywordStats } from '@/lib/weekly-keyword-stats';
import { getDummyWeeklyKeywordStats } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get('week_start_date') || undefined;

    try {
      const stats = await getWeeklyKeywordStats(weekStartDate);
      return NextResponse.json(stats);
    } catch (e) {
      console.warn('[weekly-keyword-stats] DB fallback:', (e as any)?.message || e);
      const stats = getDummyWeeklyKeywordStats(weekStartDate);
      return NextResponse.json(stats);
    }
  } catch (error) {
    console.error('[weekly-keyword-stats] Error:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
