import { NextRequest, NextResponse } from 'next/server';
import { getDailyKeywordUpDown } from '@/lib/daily-keyword-stats';
import { getDummyDailyKeywordUpDown } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;

    try {
      const updown = await getDailyKeywordUpDown(date);
      return NextResponse.json(updown);
    } catch {
      console.warn('[daily-keyword-updown] DB fallback: using dummy data');
      const updown = getDummyDailyKeywordUpDown(date);
      return NextResponse.json(updown);
    }
  } catch (error) {
    console.error('[daily-keyword-updown] Error:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
