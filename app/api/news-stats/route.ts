import { NextRequest, NextResponse } from 'next/server';
import { getDummyNewsStats } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const stats = getDummyNewsStats(date);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[news-stats] Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
