import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyTopKeywords } from '@/lib/weekly-keyword-stats';
import { getDummyWeeklyTopKeywords } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get('week_start_date') || undefined;

    try {
      const result = await getWeeklyTopKeywords(weekStartDate);
      return NextResponse.json({ data: result });
    } catch (e) {
      console.warn('[weekly-top-keywords] DB fallback:', (e as any)?.message || e);
      const result = getDummyWeeklyTopKeywords(weekStartDate);
      return NextResponse.json({ data: result });
    }
  } catch (error) {
    console.error('[weekly-top-keywords] Error:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
