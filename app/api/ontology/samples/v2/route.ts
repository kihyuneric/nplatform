export const dynamic = 'force-dynamic'

/**
 * 샘플 콘텐츠 API v2 — 온톨로지 기반 실제 데이터 반영
 *
 * 3개 개념의 주제(하위 개념) + 전문가별 분포 + 원문 세그먼트를 반환합니다.
 *
 * 계층 구조:
 *   도메인(Domain) → 개념(Concept) → 주제(Topic) → 핵심포인트(Key Point)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

export async function GET() {
  const supabase = getSupabase()
  try {
    // ★ 온톨로지 기반 동적 선택: 전문가 수 + 평균 관련도 상위 3개 개념
    const { data: topImportance } = await supabase
      .from('ont_concept_importance')
      .select('concept_id, expert_count, avg_relevance')
      .order('expert_count', { ascending: false })
      .order('avg_relevance', { ascending: false })
      .limit(3)

    const SAMPLE_CONCEPT_IDS = (topImportance || []).map((r: any) => r.concept_id as number)

    if (SAMPLE_CONCEPT_IDS.length === 0) {
      return NextResponse.json({ samples: [] })
    }

    const results = []

    for (const conceptId of SAMPLE_CONCEPT_IDS) {
      // 1. 상위 개념 정보
      const { data: concept } = await supabase
        .from('ont_concept')
        .select('concept_id, name, description, difficulty, keywords, domain_id')
        .eq('concept_id', conceptId)
        .single()

      if (!concept) continue

      // 2. 도메인 정보
      const { data: domain } = await supabase
        .from('ont_domain')
        .select('name, color')
        .eq('domain_id', concept.domain_id)
        .single()

      // 3. 주제(하위 개념) + 콘텐츠
      const { data: subConcepts } = await supabase
        .from('ont_sub_concept')
        .select('*')
        .eq('concept_id', conceptId)
        .order('order_in_parent')

      // 4. 중요도 정보
      const { data: importance } = await supabase
        .from('ont_concept_importance')
        .select('expert_count, video_count, avg_relevance, rank_overall')
        .eq('concept_id', conceptId)
        .single()

      // 5. 관계
      const { data: rels } = await supabase
        .from('ont_relation')
        .select('relation_type, source_concept_id, target_concept_id')
        .or(`source_concept_id.eq.${conceptId},target_concept_id.eq.${conceptId}`)

      const prereqIds = (rels || [])
        .filter(r => r.relation_type === 'prerequisite' && r.target_concept_id === conceptId)
        .map(r => r.source_concept_id)
      const successorIds = (rels || [])
        .filter(r => r.relation_type === 'prerequisite' && r.source_concept_id === conceptId)
        .map(r => r.target_concept_id)

      let relNames: Record<number, string> = {}
      const allRelIds = [...prereqIds, ...successorIds]
      if (allRelIds.length > 0) {
        const { data: relConcepts } = await supabase
          .from('ont_concept')
          .select('concept_id, name')
          .in('concept_id', allRelIds)
        for (const rc of (relConcepts || [])) {
          relNames[rc.concept_id] = rc.name
        }
      }

      // 6. ★ 핵심: 각 주제(하위 개념)별 실제 영상 매핑 + 전문가(채널) 분포 조회
      // 주의: ont_sub_concept_video.youtube_id는 YouTube 11자리 video_id 문자열
      //       ont_youtube.video_id가 YouTube 11자리 ID, ont_youtube.youtube_id는 정수 PK
      for (const sc of (subConcepts || [])) {
        const { data: videoMappings } = await supabase
          .from('ont_sub_concept_video')
          .select('youtube_id, relevance')
          .eq('sub_concept_id', sc.sub_concept_id)
          .order('relevance', { ascending: false })

        const mappings = videoMappings || []
        const videoIds = mappings.map((m: any) => m.youtube_id) // 실제로는 YouTube video_id 문자열

        // 채널명 조회 — ont_youtube.video_id로 매칭 (youtube_id는 정수 PK)
        let channelBreakdown: Array<{ channel: string; count: number; avg_relevance: number }> = []
        if (videoIds.length > 0) {
          const { data: youtubeData } = await supabase
            .from('ont_youtube')
            .select('video_id, channel_name')
            .in('video_id', videoIds)

          // 채널별 그룹핑
          const channelMap = new Map<string, { count: number; relevances: number[] }>()
          for (const yt of (youtubeData || [])) {
            const ch = yt.channel_name || '알 수 없음'
            const mapping = mappings.find((m: any) => m.youtube_id === yt.video_id)
            const rel = mapping?.relevance || 0
            if (!channelMap.has(ch)) channelMap.set(ch, { count: 0, relevances: [] })
            const entry = channelMap.get(ch)!
            entry.count++
            entry.relevances.push(rel)
          }

          channelBreakdown = Array.from(channelMap.entries())
            .map(([channel, data]) => ({
              channel,
              count: data.count,
              avg_relevance: Math.round(data.relevances.reduce((a, b) => a + b, 0) / data.relevances.length * 100) / 100,
            }))
            .sort((a, b) => b.count - a.count)
        }

        // 실제 데이터로 업데이트
        sc.video_count = mappings.length
        sc.expert_count = channelBreakdown.length
        sc.channel_breakdown = channelBreakdown
      }

      results.push({
        concept: {
          ...concept,
          domain_name: domain?.name || '',
          domain_color: domain?.color || '#6B7280',
        },
        importance: importance || { expert_count: 0, video_count: 0, avg_relevance: 0, rank_overall: 0 },
        relations: {
          prerequisites: prereqIds.map(id => ({ id, name: relNames[id] || '' })),
          successors: successorIds.map(id => ({ id, name: relNames[id] || '' })),
        },
        sub_concepts: subConcepts || [],
      })
    }

    return NextResponse.json({ samples: results })
  } catch (err: any) {
    console.error('[Samples v2] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
