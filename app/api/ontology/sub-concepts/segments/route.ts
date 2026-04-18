export const dynamic = 'force-dynamic'

/**
 * 원문 세그먼트 API
 *
 * GET /api/ontology/sub-concepts/segments?sub_concept_id=1
 *
 * 주제(하위 개념)에 매핑된 영상의 원본 대본 세그먼트를 반환합니다.
 * - 각 세그먼트는 전문가(채널)별로 그룹핑
 * - 키워드 주변 ±400자 추출
 * - 합성 콘텐츠의 근거 원문으로 활용
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

const TRANSCRIPT_FILE = path.resolve('C:/Users/82106/Desktop/부동산 대본/경매인플루언서 대본 총정리.json')

// 서버 프로세스 내 캐시
let transcriptCache: Map<string, { channel: string; title: string; transcript: string }> | null = null

function loadTranscripts() {
  if (transcriptCache) return
  console.log('[Segments] Loading transcripts...')
  const raw = JSON.parse(fs.readFileSync(TRANSCRIPT_FILE, 'utf-8'))
  transcriptCache = new Map()
  for (const row of raw.rows) {
    const url = row[5]
    if (!url) continue
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (!m) continue
    const vid = m[1]
    if (row[6] && row[6].length > 100) {
      transcriptCache.set(vid, {
        channel: row[0] || '',
        title: row[3] || '',
        transcript: row[6],
      })
    }
  }
  console.log(`[Segments] Loaded ${transcriptCache.size} transcripts`)
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const subConceptId = Number(searchParams.get('sub_concept_id'))

    if (!subConceptId || isNaN(subConceptId)) {
      return NextResponse.json({ error: 'sub_concept_id가 필요합니다.' }, { status: 400 })
    }

    // 1. 주제(하위 개념) 정보
    const { data: subConcept } = await supabase
      .from('ont_sub_concept')
      .select('sub_concept_id, name, description, keywords, concept_id')
      .eq('sub_concept_id', subConceptId)
      .single()

    if (!subConcept) {
      return NextResponse.json({ error: '주제를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 2. 관련 영상 매핑 조회
    const { data: videoMappings } = await supabase
      .from('ont_sub_concept_video')
      .select('youtube_id, relevance, transcript_segment')
      .eq('sub_concept_id', subConceptId)
      .order('relevance', { ascending: false })
      .limit(20)

    if (!videoMappings || videoMappings.length === 0) {
      return NextResponse.json({ segments: [], expert_groups: [], stats: { total: 0, experts: 0 } })
    }

    // 3. 영상 정보 조회 (채널명)
    // ont_sub_concept_video.youtube_id는 실제 YouTube video_id 문자열 (11자리)
    // ont_youtube.video_id가 YouTube 11자리 ID, ont_youtube.youtube_id는 정수 PK
    const videoIds = videoMappings.map(m => m.youtube_id)
    const { data: youtubeData } = await supabase
      .from('ont_youtube')
      .select('youtube_id, channel_name, title, video_id')
      .in('video_id', videoIds)

    // video_id(YouTube 11자리)를 키로 매핑
    const ytMap = new Map<string, any>()
    for (const yt of (youtubeData || [])) {
      ytMap.set(yt.video_id, yt)
    }

    // 4. 대본 로드 + 키워드 기반 세그먼트 추출
    loadTranscripts()

    const keywords = subConcept.keywords || []
    const allSegments: Array<{
      channel: string
      title: string
      video_id: string | null
      relevance: number
      text: string
      keyword_matched: string
    }> = []

    for (const vm of videoMappings) {
      // vm.youtube_id는 실제 YouTube video_id 문자열
      const yt = ytMap.get(vm.youtube_id)
      if (!yt) continue

      // vm.youtube_id가 이미 YouTube 11자리 ID이므로 직접 대본 조회
      const t = transcriptCache!.get(vm.youtube_id) || null

      if (t) {
        // 키워드 주변 텍스트 추출
        for (const kw of keywords) {
          let idx = 0
          while (idx < t.transcript.length && allSegments.length < 50) {
            const pos = t.transcript.indexOf(kw, idx)
            if (pos === -1) break

            const start = Math.max(0, pos - 400)
            const end = Math.min(t.transcript.length, pos + kw.length + 400)
            const text = t.transcript.substring(start, end).replace(/\n/g, ' ').trim()

            // 중복 방지
            const isDup = allSegments.some(s =>
              s.text.substring(0, 80) === text.substring(0, 80)
            )
            if (!isDup && text.length > 50) {
              allSegments.push({
                channel: yt.channel_name || t.channel,
                title: yt.title || t.title,
                video_id: yt.video_id,
                relevance: vm.relevance,
                text,
                keyword_matched: kw,
              })
            }

            idx = pos + kw.length + 200
          }
        }
      } else if (vm.transcript_segment) {
        // ont_sub_concept_video에 저장된 세그먼트 사용
        allSegments.push({
          channel: yt.channel_name || '',
          title: yt.title || '',
          video_id: yt.video_id,
          relevance: vm.relevance,
          text: vm.transcript_segment,
          keyword_matched: keywords[0] || '',
        })
      }
    }

    // 5. 전문가(채널)별 그룹핑
    const expertMap = new Map<string, typeof allSegments>()
    for (const seg of allSegments) {
      const ch = seg.channel || '알 수 없음'
      if (!expertMap.has(ch)) expertMap.set(ch, [])
      expertMap.get(ch)!.push(seg)
    }

    const expertGroups = Array.from(expertMap.entries())
      .map(([channel, segs]) => ({
        channel,
        segment_count: segs.length,
        avg_relevance: Math.round(segs.reduce((a, b) => a + b.relevance, 0) / segs.length * 100) / 100,
        segments: segs.slice(0, 5).map(s => ({
          text: s.text,
          title: s.title,
          keyword_matched: s.keyword_matched,
          relevance: s.relevance,
        })),
      }))
      .sort((a, b) => b.segment_count - a.segment_count)

    return NextResponse.json({
      sub_concept: {
        id: subConcept.sub_concept_id,
        name: subConcept.name,
        keywords: subConcept.keywords,
      },
      segments: allSegments.slice(0, 30),
      expert_groups: expertGroups,
      stats: {
        total_segments: allSegments.length,
        expert_count: expertGroups.length,
        video_count: videoMappings.length,
        keywords_used: keywords,
      },
    })
  } catch (err: any) {
    console.error('[Segments] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
