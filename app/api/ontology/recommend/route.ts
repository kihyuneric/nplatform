// Phase 6: 학습 추천 시스템 API
// 진도 기반 다음 학습 추천
// GET ?user_id=anonymous — 추천 캡슐 목록

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || 'anonymous'
  const limit = parseInt(searchParams.get('limit') || '5')

  try {
    // 1. 사용자 진도 조회
    const { data: userProgress } = await supabase
      .from('ont_user_progress')
      .select('atomic_id, concept_id, status')
      .eq('user_id', userId)

    const masteredAtomicIds = new Set<number>()
    const completedAtomicIds = new Set<number>()
    const inProgressAtomicIds = new Set<number>()
    const touchedConceptIds = new Set<number>()

    if (userProgress) {
      for (const p of userProgress) {
        touchedConceptIds.add(p.concept_id)
        if (p.status === 'mastered') masteredAtomicIds.add(p.atomic_id)
        else if (p.status === 'completed') completedAtomicIds.add(p.atomic_id)
        else if (p.status === 'in_progress') inProgressAtomicIds.add(p.atomic_id)
      }
    }

    // 2. 전체 Atomic 캡슐 조회
    const { data: allCapsules } = await supabase
      .from('ont_atomic_capsule')
      .select('atomic_id, concept_id, topic, order_in_concept, difficulty, estimated_min')
      .order('concept_id')
      .order('order_in_concept')

    if (!allCapsules || allCapsules.length === 0) {
      return NextResponse.json({ recommendations: [], reason: '아직 Atomic 캡슐이 없습니다' })
    }

    // 3. 개념 정보
    const conceptIds = [...new Set(allCapsules.map(c => c.concept_id))]
    const { data: concepts } = await supabase
      .from('ont_concept')
      .select('concept_id, name, level, domain_id')
      .in('concept_id', conceptIds)

    const conceptMap = new Map(concepts?.map(c => [c.concept_id, c]) || [])

    // 4. 추천 로직
    const recommendations: any[] = []

    // 4a. 진행 중인 캡슐 계속 (최우선)
    for (const cap of allCapsules) {
      if (inProgressAtomicIds.has(cap.atomic_id)) {
        const concept = conceptMap.get(cap.concept_id)
        recommendations.push({
          ...cap,
          concept_name: concept?.name || '',
          concept_level: concept?.level || '',
          reason: '학습 중인 캡슐 계속하기',
          priority: 1,
        })
      }
      if (recommendations.length >= limit) break
    }

    // 4b. 진행 중인 개념의 다음 캡슐
    if (recommendations.length < limit) {
      for (const conceptId of touchedConceptIds) {
        const conceptCapsules = allCapsules.filter(c => c.concept_id === conceptId)
        const nextCapsule = conceptCapsules.find(c =>
          !masteredAtomicIds.has(c.atomic_id) &&
          !completedAtomicIds.has(c.atomic_id) &&
          !inProgressAtomicIds.has(c.atomic_id)
        )
        if (nextCapsule) {
          const concept = conceptMap.get(conceptId)
          const alreadyAdded = recommendations.some(r => r.atomic_id === nextCapsule.atomic_id)
          if (!alreadyAdded) {
            recommendations.push({
              ...nextCapsule,
              concept_name: concept?.name || '',
              concept_level: concept?.level || '',
              reason: `"${concept?.name}" 개념의 다음 캡슐`,
              priority: 2,
            })
          }
        }
        if (recommendations.length >= limit) break
      }
    }

    // 4c. 아직 시작하지 않은 개념 (왕초보 → 전문가 순)
    if (recommendations.length < limit) {
      const levelOrder = ['왕초보', '초보', '중급', '고급', '전문가']
      const untouchedConcepts = concepts
        ?.filter(c => !touchedConceptIds.has(c.concept_id))
        .sort((a, b) => {
          const aIdx = levelOrder.indexOf(a.level)
          const bIdx = levelOrder.indexOf(b.level)
          return aIdx - bIdx
        }) || []

      for (const concept of untouchedConcepts) {
        const firstCapsule = allCapsules.find(c => c.concept_id === concept.concept_id && c.order_in_concept === 1)
        if (firstCapsule) {
          const alreadyAdded = recommendations.some(r => r.atomic_id === firstCapsule.atomic_id)
          if (!alreadyAdded) {
            recommendations.push({
              ...firstCapsule,
              concept_name: concept.name,
              concept_level: concept.level,
              reason: `새로운 개념 시작: ${concept.name}`,
              priority: 3,
            })
          }
        }
        if (recommendations.length >= limit) break
      }
    }

    // 5. 학습 통계 요약
    const totalCapsules = allCapsules.length
    const totalMastered = masteredAtomicIds.size
    const totalCompleted = completedAtomicIds.size
    const masteryPct = totalCapsules > 0 ? Math.round((totalMastered / totalCapsules) * 100) : 0

    return NextResponse.json({
      recommendations: recommendations.slice(0, limit).sort((a, b) => a.priority - b.priority),
      stats: {
        total_capsules: totalCapsules,
        mastered: totalMastered,
        completed: totalCompleted,
        in_progress: inProgressAtomicIds.size,
        mastery_pct: masteryPct,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
