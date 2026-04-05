import { NextRequest, NextResponse } from 'next/server'
import {
  insertYoutubeVideo,
  insertYoutubeConceptMappings,
  getConceptsByDomain,
} from '@/lib/ontology-db'
import { analyzeTranscript, type ConceptInfo } from '@/lib/transcript-analyzer'

interface BulkItem {
  title: string
  channel_name?: string
  video_id?: string
  transcript: string
  published_at?: string
  view_count?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videos }: { videos: BulkItem[] } = body

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { error: '업로드할 영상 목록이 비어있습니다.' },
        { status: 400 }
      )
    }

    if (videos.length > 50) {
      return NextResponse.json(
        { error: '한 번에 최대 50개까지 업로드할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 모든 개념 로드 (한 번만)
    const allConcepts = await getConceptsByDomain()
    const conceptInfos: ConceptInfo[] = (allConcepts || []).map((c: any) => ({
      concept_id: c.concept_id,
      name: c.name,
      keywords: c.keywords || [],
      description: c.description,
      level: c.level,
      domain_id: c.domain_id,
    }))

    const results = []

    for (const item of videos) {
      try {
        if (!item.title || !item.transcript) {
          results.push({ title: item.title, success: false, error: '제목/대본 누락' })
          continue
        }

        const video = await insertYoutubeVideo(item)
        const analysis = analyzeTranscript(item.transcript, conceptInfos)

        const mappings = analysis.mappings.map((m) => ({
          youtube_id: video.youtube_id,
          concept_id: m.concept_id,
          relevance: m.relevance,
        }))

        if (mappings.length > 0) {
          await insertYoutubeConceptMappings(mappings)
        }

        results.push({
          title: item.title,
          success: true,
          youtube_id: video.youtube_id,
          mapped_count: mappings.length,
        })
      } catch (err) {
        results.push({
          title: item.title,
          success: false,
          error: (err as any)?.message || '처리 실패',
        })
      }
    }

    return NextResponse.json({
      total: videos.length,
      success_count: results.filter((r) => r.success).length,
      fail_count: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error) {
    console.error('[youtube/bulk-upload] Error:', error)
    return NextResponse.json(
      { error: '일괄 업로드 실패' },
      { status: 500 }
    )
  }
}
