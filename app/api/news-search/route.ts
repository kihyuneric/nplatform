import { NextRequest, NextResponse } from 'next/server';
import { searchNews } from '@/lib/news-search';
import { getDummyNewsSearch } from '@/lib/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || undefined;
    const sido = searchParams.get('sido') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const direction = searchParams.get('direction') || undefined;
    const period = searchParams.get('period') || undefined;
    const date = searchParams.get('date') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
      const result = await searchNews({ keyword, sido, provider, direction, period, date, limit, offset });
      return NextResponse.json(result);
    } catch {
      console.warn('[news-search] DB fallback: using dummy data');
      const dummy = getDummyNewsSearch({ keyword, sido, provider, direction, period, date, limit, offset });
      return NextResponse.json(dummy);
    }
  } catch (error) {
    console.error('[news-search] Error:', error);
    return NextResponse.json({ list: [], total_count: 0 }, { status: 500 });
  }
}
