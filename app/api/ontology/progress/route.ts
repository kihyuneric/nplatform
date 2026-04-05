// Phase 6: 학습 진도 통계 API
// GET ?user_id=anonymous — 전체 진도 현황 (대시보드용)
// GET ?user_id=anonymous&concept_id=N — 개념별 진도

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id') || 'anonymous'
  const conceptId = searchParams.get('concept_id')

  try {
    // 개념별 진도 상세
    if (conceptId) {
      const { data: capsules } = await supabase
        .from('ont_atomic_capsule')
        .select('atomic_id, topic, order_in_concept, difficulty, estimated_min')
        .eq('concept_id', Number(conceptId))
        .order('order_in_concept')

      const { data: progress } = await supabase
        .from('ont_user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('concept_id', Number(conceptId))

      const progressMap = new Map<number, any>()
      if (progress) {
        for (const p of progress) {
          progressMap.set(p.atomic_id, p)
        }
      }

      const capsuleProgress = (capsules || []).map(c => ({
        ...c,
        progress: progressMap.get(c.atomic_id) || null,
      }))

      const totalCapsules = capsuleProgress.length
      const masteredCount = capsuleProgress.filter(c => c.progress?.status === 'mastered').length
      const completedCount = capsuleProgress.filter(c => c.progress?.status === 'completed' || c.progress?.status === 'mastered').length
      const inProgressCount = capsuleProgress.filter(c => c.progress?.status === 'in_progress').length

      return NextResponse.json({
        concept_id: Number(conceptId),
        total_capsules: totalCapsules,
        mastered: masteredCount,
        completed: completedCount,
        in_progress: inProgressCount,
        not_started: totalCapsules - completedCount - inProgressCount,
        mastery_pct: totalCapsules > 0 ? Math.round((masteredCount / totalCapsules) * 100) : 0,
        capsules: capsuleProgress,
      })
    }

    // 전체 진도 현황 (대시보드)
    const { data: allProgress } = await supabase
      .from('ont_user_progress')
      .select('atomic_id, concept_id, status, quiz_score, mastered_at, last_studied')
      .eq('user_id', userId)

    // 전체 Atomic 캡슐 수
    const { count: totalAtomicCount } = await supabase
      .from('ont_atomic_capsule')
      .select('atomic_id', { count: 'exact', head: true })

    // 개념별 통계
    const conceptStats = new Map<number, { total: number; mastered: number; completed: number; in_progress: number }>()

    // 개념별 Atomic 캡슐 수
    const { data: conceptCapsuleCounts } = await supabase
      .from('ont_atomic_capsule')
      .select('concept_id')

    if (conceptCapsuleCounts) {
      for (const c of conceptCapsuleCounts) {
        const existing = conceptStats.get(c.concept_id) || { total: 0, mastered: 0, completed: 0, in_progress: 0 }
        existing.total++
        conceptStats.set(c.concept_id, existing)
      }
    }

    if (allProgress) {
      for (const p of allProgress) {
        const existing = conceptStats.get(p.concept_id) || { total: 0, mastered: 0, completed: 0, in_progress: 0 }
        if (p.status === 'mastered') existing.mastered++
        if (p.status === 'completed' || p.status === 'mastered') existing.completed++
        if (p.status === 'in_progress') existing.in_progress++
        conceptStats.set(p.concept_id, existing)
      }
    }

    const masteredTotal = allProgress?.filter(p => p.status === 'mastered').length || 0
    const completedTotal = allProgress?.filter(p => p.status === 'completed' || p.status === 'mastered').length || 0
    const inProgressTotal = allProgress?.filter(p => p.status === 'in_progress').length || 0
    const totalAtomic = totalAtomicCount || 0

    // 최근 학습 기록
    const recentStudy = allProgress
      ?.filter(p => p.last_studied)
      .sort((a, b) => new Date(b.last_studied).getTime() - new Date(a.last_studied).getTime())
      .slice(0, 10)

    // 최근 학습한 Atomic 캡슐의 상세 정보
    let recentDetails: any[] = []
    if (recentStudy && recentStudy.length > 0) {
      const atomicIds = recentStudy.map(r => r.atomic_id)
      const { data: atomicInfo } = await supabase
        .from('ont_atomic_capsule')
        .select('atomic_id, topic, concept_id')
        .in('atomic_id', atomicIds)

      if (atomicInfo) {
        const infoMap = new Map(atomicInfo.map(a => [a.atomic_id, a]))
        recentDetails = recentStudy.map(r => ({
          ...r,
          topic: infoMap.get(r.atomic_id)?.topic || '',
        }))
      }
    }

    // 마스터한 개념 수 (모든 캡슐 마스터)
    let masteredConceptCount = 0
    for (const [, stats] of conceptStats) {
      if (stats.total > 0 && stats.mastered >= stats.total) {
        masteredConceptCount++
      }
    }

    // 평균 퀴즈 점수
    const quizScores = allProgress?.filter(p => p.quiz_score !== null && p.quiz_score !== undefined).map(p => p.quiz_score) || []
    const avgQuizScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((s, q) => s + (q || 0), 0) / quizScores.length)
      : 0

    return NextResponse.json({
      user_id: userId,
      total_atomic_capsules: totalAtomic,
      mastered: masteredTotal,
      completed: completedTotal,
      in_progress: inProgressTotal,
      not_started: totalAtomic - completedTotal - inProgressTotal,
      mastery_pct: totalAtomic > 0 ? Math.round((masteredTotal / totalAtomic) * 100) : 0,
      mastered_concepts: masteredConceptCount,
      total_concepts_with_capsules: conceptStats.size,
      avg_quiz_score: avgQuizScore,
      quiz_attempts: quizScores.length,
      recent_study: recentDetails,
      concept_stats: Object.fromEntries(conceptStats),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
