// Phase 6: Atomic 캡슐 벌크 생성 API
// POST: 여러 개념의 Atomic 캡슐을 일괄 생성
// GET:  벌크 생성 대상 개념 목록 (Atomic 캡슐이 없는 개념들)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  decomposeConceptToAtomicTopics,
  generateAllAtomicCapsules,
} from '@/lib/atomic-capsule-generator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================
// GET: Atomic 캡슐이 없는 개념 목록 + 통계
// ============================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const domainId = searchParams.get('domain_id')
  const level = searchParams.get('level')

  try {
    // 1. 모든 개념 조회
    let conceptQuery = supabase
      .from('ont_concept')
      .select('concept_id, name, level, domain:ont_domain(name, domain_id)')
      .order('concept_id')

    if (domainId) {
      conceptQuery = conceptQuery.eq('domain_id', Number(domainId))
    }
    if (level) {
      conceptQuery = conceptQuery.eq('level', level)
    }

    const { data: concepts, error: conceptErr } = await conceptQuery
    if (conceptErr) throw conceptErr

    // 2. 각 개념의 Atomic 캡슐 수 조회
    const { data: atomicCounts } = await supabase
      .from('ont_atomic_capsule')
      .select('concept_id')

    const countMap = new Map<number, number>()
    if (atomicCounts) {
      for (const a of atomicCounts) {
        countMap.set(a.concept_id, (countMap.get(a.concept_id) || 0) + 1)
      }
    }

    const conceptsWithCounts = (concepts || []).map(c => ({
      concept_id: c.concept_id,
      name: c.name,
      level: c.level,
      domain_name: (c.domain as any)?.name || '',
      domain_id: (c.domain as any)?.domain_id,
      atomic_count: countMap.get(c.concept_id) || 0,
      has_capsules: (countMap.get(c.concept_id) || 0) > 0,
    }))

    const totalConcepts = conceptsWithCounts.length
    const withCapsules = conceptsWithCounts.filter(c => c.has_capsules).length
    const withoutCapsules = totalConcepts - withCapsules
    const totalAtomicCapsules = Array.from(countMap.values()).reduce((a, b) => a + b, 0)

    return NextResponse.json({
      total_concepts: totalConcepts,
      with_capsules: withCapsules,
      without_capsules: withoutCapsules,
      total_atomic_capsules: totalAtomicCapsules,
      concepts: conceptsWithCounts,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================================
// POST: 벌크 생성 실행
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      concept_ids,            // number[] - 생성할 개념 ID 목록
      domain_id,              // number - 또는 도메인 전체
      level,                  // string - 또는 레벨 전체
      max_concepts = 5,       // 한 번에 최대 처리할 개념 수
      force_regenerate = false,
    } = body

    let targetConceptIds: number[] = []

    if (concept_ids && concept_ids.length > 0) {
      targetConceptIds = concept_ids.slice(0, max_concepts)
    } else {
      // 도메인/레벨 기준으로 Atomic 캡슐이 없는 개념 자동 선택
      let query = supabase
        .from('ont_concept')
        .select('concept_id, name')
        .order('concept_id')

      if (domain_id) query = query.eq('domain_id', Number(domain_id))
      if (level) query = query.eq('level', level)

      const { data: allConcepts } = await query
      if (!allConcepts || allConcepts.length === 0) {
        return NextResponse.json({ error: '해당 조건에 맞는 개념이 없습니다', results: [] }, { status: 400 })
      }

      // Atomic 캡슐이 없는 개념만 필터
      const conceptIds = allConcepts.map(c => c.concept_id)
      const { data: existingCapsules } = await supabase
        .from('ont_atomic_capsule')
        .select('concept_id')
        .in('concept_id', conceptIds)

      const hasCapsulesSet = new Set((existingCapsules || []).map(c => c.concept_id))

      if (force_regenerate) {
        targetConceptIds = conceptIds.slice(0, max_concepts)
      } else {
        targetConceptIds = conceptIds
          .filter(id => !hasCapsulesSet.has(id))
          .slice(0, max_concepts)
      }
    }

    if (targetConceptIds.length === 0) {
      return NextResponse.json({
        message: '생성할 대상이 없습니다. 모든 개념에 이미 Atomic 캡슐이 있습니다.',
        results: [],
      })
    }

    // 순차 생성
    const results: Array<{
      concept_id: number
      concept_name: string
      status: 'success' | 'error'
      capsules_created?: number
      error?: string
    }> = []

    for (const conceptId of targetConceptIds) {
      try {
        // 개념 정보 조회
        const { data: concept } = await supabase
          .from('ont_concept')
          .select('concept_id, name, level, description, domain:ont_domain(name)')
          .eq('concept_id', conceptId)
          .single()

        if (!concept) {
          results.push({ concept_id: conceptId, concept_name: '?', status: 'error', error: '개념을 찾을 수 없습니다' })
          continue
        }

        // 기존 캡슐 삭제 (재생성인 경우)
        if (force_regenerate) {
          await supabase
            .from('ont_atomic_capsule')
            .delete()
            .eq('concept_id', conceptId)
        }

        // 서브개념 조회
        const { data: subConcepts } = await supabase
          .from('ont_sub_concept')
          .select('sub_concept_id, name, description')
          .eq('concept_id', conceptId)

        const domainName = (concept.domain as any)?.name || '부동산'

        // Stage 1: 토픽 분해
        const topics = await decomposeConceptToAtomicTopics({
          conceptName: concept.name,
          conceptLevel: concept.level || '중급',
          domainName,
          conceptDescription: concept.description || '',
          existingKeywords: [],
          syllabusHints: (subConcepts || []).map((sc: any) => sc.name),
        })

        if (!topics) {
          results.push({ concept_id: conceptId, concept_name: concept.name, status: 'error', error: '토픽 분해 실패' })
          continue
        }

        // Stage 2: 전체 콘텐츠 생성
        const genResult = await generateAllAtomicCapsules({
          conceptId,
          conceptName: concept.name,
          conceptLevel: concept.level || '중급',
          domainName,
          atomicTopics: topics,
          transcriptClues: {
            keywords: [],
            segments: [],
            caseRefs: [],
            expertCount: 0,
          },
        })

        // DB 저장
        let savedCount = 0
        for (const cap of genResult.capsules) {
          const { error: insertErr } = await supabase
            .from('ont_atomic_capsule')
            .upsert({
              concept_id: conceptId,
              topic: cap.topic,
              description: cap.description || '',
              order_in_concept: cap.order,
              difficulty: cap.difficulty || 'beginner',
              estimated_min: cap.estimated_minutes || 10,
              content_json: cap.content,
              quiz_json: (cap.content as any)?.quiz || null,
              mastery_criteria: (cap.content as any)?.mastery || null,
              web_sources: [],
              ai_model: 'claude-sonnet',
              generation_stage: 'stage2',
            }, { onConflict: 'concept_id,order_in_concept' })

          if (!insertErr) savedCount++
        }

        results.push({
          concept_id: conceptId,
          concept_name: concept.name,
          status: 'success',
          capsules_created: savedCount,
        })
      } catch (err: any) {
        results.push({
          concept_id: conceptId,
          concept_name: '?',
          status: 'error',
          error: err.message,
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const totalCapsules = results.reduce((s, r) => s + (r.capsules_created || 0), 0)

    return NextResponse.json({
      message: `${successCount}/${results.length}개 개념 처리 완료 (총 ${totalCapsules}개 Atomic 캡슐 생성)`,
      total_concepts_processed: results.length,
      success_count: successCount,
      total_capsules_created: totalCapsules,
      results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
