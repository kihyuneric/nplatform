import { NextRequest, NextResponse } from 'next/server'
import { supabase, recalculateAllImportance } from '@/lib/ontology-db'
import { runAnalysisPipeline } from '@/lib/analyze-pipeline'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { youtube_ids } = body as { youtube_ids?: number[] }

    // Fetch videos to reanalyze
    let query = supabase
      .from('ont_youtube')
      .select('youtube_id, channel_name, transcript')

    if (youtube_ids && youtube_ids.length > 0) {
      query = query.in('youtube_id', youtube_ids)
    }

    const { data: videos, error: fetchError } = await query
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: '재분석할 영상이 없습니다.' }, { status: 404 })
    }

    const results: Array<{ youtube_id: number; mapped_concepts_count: number; lecture_type: string }> = []
    const errors: string[] = []

    for (const video of videos) {
      try {
        if (!video.transcript) {
          errors.push(`youtube_id=${video.youtube_id}: 대본이 없습니다.`)
          continue
        }

        const result = await runAnalysisPipeline(
          video.youtube_id,
          video.transcript,
          video.channel_name || '',
          { deletePreviousMappings: true }
        )

        results.push({
          youtube_id: video.youtube_id,
          mapped_concepts_count: result.mapped_concepts_count,
          lecture_type: result.analysis.lecture_type,
        })
      } catch (err: any) {
        errors.push(`youtube_id=${video.youtube_id}: ${err.message}`)
      }
    }

    // Recalculate importance once after all videos
    await recalculateAllImportance()

    return NextResponse.json({
      success: true,
      reanalyzed: results.length,
      total_videos: videos.length,
      results,
      errors,
    })
  } catch (error: any) {
    console.error('[youtube/reanalyze] Error:', error)
    return NextResponse.json(
      { error: '재분석 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
