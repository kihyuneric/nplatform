import { NextResponse } from 'next/server';
import { getDummyKeywordTrend } from '@/lib/dummy-data';

export async function GET() {
  try {
    const trend = getDummyKeywordTrend();
    return NextResponse.json(trend);
  } catch (error) {
    console.error('[keyword-trend] Error:', error);
    return NextResponse.json({ trend: [] }, { status: 500 });
  }
}
