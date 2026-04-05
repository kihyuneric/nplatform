import { NextRequest, NextResponse } from 'next/server'
import { getYoutubeVideos } from '@/lib/ontology-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await getYoutubeVideos(page, limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[youtube] Error:', error)
    return NextResponse.json(
      { videos: [], total: 0, page: 1, limit: 20 },
      { status: 500 }
    )
  }
}
