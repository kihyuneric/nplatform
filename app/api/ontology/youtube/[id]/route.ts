export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getYoutubeVideoDetail, deleteYoutubeVideo } from '@/lib/ontology-db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const youtubeId = parseInt(id)
    if (isNaN(youtubeId)) {
      return NextResponse.json({ error: '유효하지 않은 ID' }, { status: 400 })
    }

    const video = await getYoutubeVideoDetail(youtubeId)
    return NextResponse.json(video)
  } catch (error) {
    console.error('[youtube/[id]] Error:', error)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const youtubeId = parseInt(id)
    if (isNaN(youtubeId)) {
      return NextResponse.json({ error: '유효하지 않은 ID' }, { status: 400 })
    }

    await deleteYoutubeVideo(youtubeId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[youtube/[id] DELETE] Error:', error)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
