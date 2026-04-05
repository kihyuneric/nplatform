import { NextRequest, NextResponse } from 'next/server';
import { getDailyTopKeywords } from '@/lib/daily-keyword-stats';
import { getDummyDailyTopKeywords } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;

    try {
      const result = await getDailyTopKeywords(date);
      return NextResponse.json({ data: result });
    } catch {
      console.warn('[daily-top-keywords] DB fallback: using dummy data');
      const result = getDummyDailyTopKeywords(date);
      return NextResponse.json({ data: result });
    }
  } catch (error) {
    console.error('[daily-top-keywords] Error:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
