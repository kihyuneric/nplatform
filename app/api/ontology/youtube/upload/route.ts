import { NextRequest, NextResponse } from 'next/server'
import { insertYoutubeVideo, recalculateAllImportance, checkYoutubeDuplicate } from '@/lib/ontology-db'
import { runAnalysisPipeline } from '@/lib/analyze-pipeline'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, channel_name, video_id, transcript, published_at, view_count } = body

    if (!title || !transcript) {
      return NextResponse.json(
        { error: '제목과 대본은 필수입니다.' },
        { status: 400 }
      )
    }

    // 0. Duplicate check
    if (video_id && !body.force) {
      const dup = await checkYoutubeDuplicate(video_id)
      if (dup.exists) {
        return NextResponse.json(
          { error: 'duplicate', existing: { youtube_id: dup.youtube_id, title: dup.title } },
          { status: 409 }
        )
      }
    }

    // 1. YouTube 비디오 INSERT
    const video = await insertYoutubeVideo({
      video_id,
      channel_name,
      title,
      transcript,
      published_at,
      view_count,
    })

    // 2. Run full analysis pipeline
    const result = await runAnalysisPipeline(
      video.youtube_id,
      transcript,
      channel_name || '',
    )

    // 3. Recalculate importance
    await recalculateAllImportance()

    return NextResponse.json({
      success: true,
      youtube_id: video.youtube_id,
      mapped_concepts_count: result.mapped_concepts_count,
      analysis: result.analysis,
    })
  } catch (error) {
    console.error('[youtube/upload] Error:', error)
    return NextResponse.json(
      { error: '업로드 중 오류가 발생했습니다.', detail: (error as any)?.message },
      { status: 500 }
    )
  }
}
