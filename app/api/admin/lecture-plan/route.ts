// Phase 5-2: 관리자 강의안 API
// GET: 캡슐의 관련 대본 리스트 조회
// POST: 선별된 대본 + 설정으로 강의안 AI 생성

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  getRelatedTranscripts,
  getConceptOntologyContext,
  getLectureCapsules,
  saveLecturePlanHistory,
  getLecturePlanHistory,
} from '@/lib/ontology-db'
import { synthesizeLecturePlan, isAIAvailable } from '@/lib/ai-synthesizer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conceptId = searchParams.get('concept_id')
    const action = searchParams.get('action')

    if (!conceptId) {
      return NextResponse.json({ error: 'concept_id required' }, { status: 400 })
    }

    const cid = parseInt(conceptId)

    // 이력 조회
    if (action === 'history') {
      const history = await getLecturePlanHistory(cid)
      return NextResponse.json({ history })
    }

    // 관련 대본 리스트 조회
    const transcripts = await getRelatedTranscripts(cid)

    // 캡슐 정보
    const capsules = await getLectureCapsules({ concept_id: cid })

    // 온톨로지 컨텍스트
    const ontologyContext = await getConceptOntologyContext(cid)

    return NextResponse.json({
      transcripts,
      capsule: capsules.length > 0 ? capsules[0] : null,
      ontologyContext,
    })
  } catch (error: any) {
    console.error('GET /api/admin/lecture-plan error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAIAvailable()) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
    }

    const body = await request.json()
    const {
      concept_id,
      capsule_id,
      selected_youtube_ids,
      lecture_level,
      target_duration_min,
      section_count,
      emphasis_types,
      additional_instructions,
    } = body

    if (!concept_id || !selected_youtube_ids || selected_youtube_ids.length === 0) {
      return NextResponse.json(
        { error: 'concept_id and selected_youtube_ids required' },
        { status: 400 }
      )
    }

    // 1. 캡슐 조회
    const capsules = await getLectureCapsules({ concept_id })
    const capsule = capsules[0]
    if (!capsule) {
      return NextResponse.json({ error: 'Capsule not found' }, { status: 404 })
    }

    // 2. 관련 대본 전체 조회 → 선별된 것만 필터
    const allTranscripts = await getRelatedTranscripts(concept_id)
    const selectedIds = new Set(selected_youtube_ids.map((id: any) => Number(id)))
    const selectedTranscripts = allTranscripts
      .filter(t => selectedIds.has(t.youtube_id))
      .map(t => ({
        channel_name: t.channel_name,
        relevance: t.relevance,
        lecture_type: t.lecture_type,
        segments: t.segments,
        case_references: t.case_references,
        key_topics: t.key_topics,
      }))

    // 3. 온톨로지 컨텍스트
    const ontologyContext = await getConceptOntologyContext(concept_id)

    // 4. AI 강의안 생성
    const result = await synthesizeLecturePlan({
      capsule,
      selectedTranscripts,
      ontologyContext,
      settings: {
        lectureLevel: lecture_level || 'L2',
        targetDurationMin: target_duration_min || 45,
        sectionCount: section_count,
        emphasisTypes: emphasis_types || ['theory', 'case'],
        additionalInstructions: additional_instructions,
      },
    })

    // 5. 이력 저장
    const { plan_id } = await saveLecturePlanHistory({
      concept_id,
      capsule_id: capsule.capsule_id,
      lecture_level: lecture_level || 'L2',
      target_duration_min: target_duration_min || 45,
      section_count,
      emphasis_types: emphasis_types || ['theory', 'case'],
      additional_instructions,
      selected_youtube_ids,
      ai_result: result,
      ai_model: 'claude-sonnet-4-20250514',
      ai_cost_usd: 0.015,
    })

    return NextResponse.json({
      plan_id,
      result,
      total_transcripts: allTranscripts.length,
      selected_count: selectedTranscripts.length,
    })
  } catch (error: any) {
    console.error('POST /api/admin/lecture-plan error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
