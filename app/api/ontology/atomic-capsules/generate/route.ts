export const dynamic = 'force-dynamic'

// Phase 6: Atomic 캡슐 생성 API
// POST: 개념 ID를 받아 Atomic 캡슐 목록 자동 생성 (2단계 파이프라인)
// GET:  개념 ID의 Atomic 캡슐 생성 진행 상황 확인

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  decomposeConceptToAtomicTopics,
  generateAllAtomicCapsules,
} from '@/lib/atomic-capsule-generator'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

// ============================================================
// GET: 개념의 Atomic 캡슐 현황 조회
// ============================================================
export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const conceptId = Number(searchParams.get('concept_id'))

  if (!conceptId || isNaN(conceptId)) {
    return NextResponse.json({ error: 'concept_id 필요' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('ont_atomic_capsule')
      .select('atomic_id, topic, description, order_in_concept, difficulty, estimated_min, generation_stage, generated_at')
      .eq('concept_id', conceptId)
      .order('order_in_concept')

    if (error) throw error

    return NextResponse.json({
      concept_id: conceptId,
      total: data?.length || 0,
      capsules: data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================================
// POST: Atomic 캡슐 생성 시작
// ============================================================
export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  try {
    const body = await req.json()
    const { concept_id, force_regenerate = false } = body

    if (!concept_id) {
      return NextResponse.json({ error: 'concept_id 필요' }, { status: 400 })
    }

    // 개념 정보 조회
    const { data: concept, error: conceptErr } = await supabase
      .from('ont_concept')
      .select('*, domain:ont_domain(name)')
      .eq('concept_id', concept_id)
      .single()

    if (conceptErr || !concept) {
      return NextResponse.json({ error: '개념을 찾을 수 없습니다' }, { status: 404 })
    }

    // 이미 생성된 캡슐 확인
    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from('ont_atomic_capsule')
        .select('atomic_id')
        .eq('concept_id', concept_id)
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json({
          message: '이미 Atomic 캡슐이 생성되어 있습니다. force_regenerate=true로 재생성하세요.',
          concept_id,
          already_exists: true,
        })
      }
    }

    // 관련 캡슐 조회 (대본 단서용)
    const { data: capsule } = await supabase
      .from('ont_lecture_capsule')
      .select('*')
      .eq('concept_id', concept_id)
      .single()

    // 온톨로지 키워드/중요도 조회
    const { data: importance } = await supabase
      .from('ont_concept_importance')
      .select('*')
      .eq('concept_id', concept_id)
      .single()

    // YouTube 개념 매핑 (키워드 힌트)
    const { data: ytConcepts } = await supabase
      .from('ont_youtube_concept')
      .select('relevance, ont_youtube(title)')
      .eq('concept_id', concept_id)
      .order('relevance', { ascending: false })
      .limit(10)

    // 대본 단서 구성
    const transcriptClues = {
      keywords: importance?.keywords || concept.tags || [],
      segments: capsule?.syllabus?.map((s: any) => s.topic) || [],
      caseRefs: capsule?.case_study_refs?.map((c: any) => c.context?.slice(0, 50) || '') || [],
      expertCount: importance?.expert_count || 0,
    }

    const domainName = (concept.domain as any)?.name || '부동산'

    // Step 1: 개념 → Atomic 주제 분해
    const atomicTopics = await decomposeConceptToAtomicTopics({
      conceptName: concept.name,
      conceptLevel: concept.level || '중급',
      domainName,
      conceptDescription: concept.description || capsule?.overview || '',
      existingKeywords: transcriptClues.keywords.slice(0, 10),
      syllabusHints: transcriptClues.segments,
    })

    if (!atomicTopics || atomicTopics.topics.length === 0) {
      return NextResponse.json({ error: '주제 분해 실패' }, { status: 500 })
    }

    // 기존 캡슐 삭제 (재생성인 경우)
    if (force_regenerate) {
      await supabase
        .from('ont_atomic_capsule')
        .delete()
        .eq('concept_id', concept_id)
    }

    // Step 2: 각 주제에 대해 완전 콘텐츠 생성
    const generationResult = await generateAllAtomicCapsules({
      conceptId: concept_id,
      conceptName: concept.name,
      conceptLevel: concept.level || '중급',
      domainName,
      atomicTopics,
      transcriptClues,
      maxConcurrent: 2,  // 서버리스 환경에서 2개씩 병렬
    })

    // DB에 저장
    const insertData = generationResult.capsules.map(cap => ({
      concept_id,
      capsule_id: capsule?.capsule_id || null,
      topic: cap.topic,
      description: cap.description,
      order_in_concept: cap.order,
      difficulty: cap.difficulty,
      estimated_min: cap.estimated_minutes,
      content_json: cap.content,
      quiz_json: cap.content?.quiz || null,
      mastery_criteria: cap.content?.mastery?.criteria || null,
      web_sources: cap.content?.sources || null,
      ai_model: 'claude-sonnet-4-20250514',
      generation_stage: cap.web_research_available ? 'stage2' : 'stage1',
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from('ont_atomic_capsule')
      .insert(insertData)
      .select('atomic_id, topic, order_in_concept')

    if (insertErr) throw insertErr

    return NextResponse.json({
      success: true,
      concept_id,
      concept_name: concept.name,
      total_generated: generationResult.total_generated,
      failed_topics: generationResult.failed_topics,
      capsules: inserted,
    })
  } catch (err: any) {
    console.error('[atomic-capsules/generate] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
