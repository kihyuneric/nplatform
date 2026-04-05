/**
 * GET /api/ontology/sub-concepts/videos?sub_concept_id=123
 *
 * 특정 하위 개념에 매핑된 전체 영상 목록 반환
 * 사용자가 수동으로 참조 대본을 선택할 수 있도록 전체 풀 제공
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const subConceptId = searchParams.get('sub_concept_id')

    if (!subConceptId) {
      return NextResponse.json({ error: 'sub_concept_id required' }, { status: 400 })
    }

    // 1. 전체 영상 매핑 조회
    const { data: videoMappings } = await supabase
      .from('ont_sub_concept_video')
      .select('youtube_id, relevance')
      .eq('sub_concept_id', Number(subConceptId))
      .order('relevance', { ascending: false })

    if (!videoMappings || videoMappings.length === 0) {
      return NextResponse.json({ videos: [], total: 0 })
    }

    const videoIds = videoMappings.map((m: any) => m.youtube_id)

    // 2. 영상 메타데이터 조회
    const { data: ytData } = await supabase
      .from('ont_youtube')
      .select('video_id, title, channel_name, lecture_type, duration_min')
      .in('video_id', videoIds)

    const ytMap = new Map<string, any>()
    for (const yt of (ytData || [])) {
      ytMap.set(yt.video_id, yt)
    }

    // 3. 결합 + 강의형 우선 정렬
    const theoryTypes = new Set(['theory', 'lecture', '이론형', '강의형', '혼합형'])
    const videos = videoMappings.map((m: any) => {
      const yt = ytMap.get(m.youtube_id) || {}
      return {
        youtube_id: m.youtube_id,
        relevance: m.relevance,
        title: yt.title || m.youtube_id,
        channel_name: yt.channel_name || '알 수 없음',
        lecture_type: yt.lecture_type || 'unknown',
        duration_min: yt.duration_min || null,
        is_theory: theoryTypes.has(yt.lecture_type || ''),
      }
    }).sort((a: any, b: any) => {
      // 강의형 먼저, 같은 유형 내에서는 관련도 순
      if (a.is_theory !== b.is_theory) return a.is_theory ? -1 : 1
      return b.relevance - a.relevance
    })

    return NextResponse.json({
      videos,
      total: videos.length,
      theory_count: videos.filter((v: any) => v.is_theory).length,
      case_count: videos.filter((v: any) => !v.is_theory).length,
    })
  } catch (err: any) {
    console.error('[sub-concepts/videos] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
