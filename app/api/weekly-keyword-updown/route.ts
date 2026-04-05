import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyKeywordUpDown } from '@/lib/weekly-keyword-stats';
import { getDummyWeeklyKeywordUpDown } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get('week_start_date') || undefined;

    try {
      const updown = await getWeeklyKeywordUpDown(weekStartDate);
      return NextResponse.json(updown);
    } catch (e) {
      console.warn('[weekly-keyword-updown] DB fallback:', (e as any)?.message || e);
      const updown = getDummyWeeklyKeywordUpDown(weekStartDate);
      return NextResponse.json(updown);
    }
  } catch (error) {
    console.error('[weekly-keyword-updown] Error:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
