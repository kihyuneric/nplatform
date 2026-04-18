export const dynamic = 'force-dynamic'

// Phase 6: Atomic 캡슐 CRUD API
// GET ?concept_id=N              — 개념 전체 Atomic 캡슐 목록
// GET ?atomic_id=N               — 단일 Atomic 캡슐 상세 (content_json 포함)
// GET ?concept_id=N&progress=user123 — 캡슐 + 학습 진도
// POST (body: progress 업데이트)  — 학습 진도 저장

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const conceptId = searchParams.get('concept_id')
  const atomicId = searchParams.get('atomic_id')
  const userId = searchParams.get('progress')

  try {
    // 단일 Atomic 캡슐 상세 조회
    if (atomicId) {
      const { data, error } = await supabase
        .from('ont_atomic_capsule')
        .select('*')
        .eq('atomic_id', Number(atomicId))
        .single()

      if (error) throw error
      if (!data) return NextResponse.json({ error: '캡슐을 찾을 수 없습니다' }, { status: 404 })

      // 학습 진도 포함
      let progress = null
      if (userId) {
        const { data: prog } = await supabase
          .from('ont_user_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('atomic_id', Number(atomicId))
          .single()
        progress = prog
      }

      // 이전/다음 캡슐
      const { data: neighbors } = await supabase
        .from('ont_atomic_capsule')
        .select('atomic_id, topic, order_in_concept')
        .eq('concept_id', data.concept_id)
        .order('order_in_concept')

      const idx = neighbors?.findIndex(n => n.atomic_id === Number(atomicId)) ?? -1
      const prev = idx > 0 ? neighbors![idx - 1] : null
      const next = idx >= 0 && idx < (neighbors?.length || 0) - 1 ? neighbors![idx + 1] : null

      return NextResponse.json({ capsule: data, progress, prev, next })
    }

    // 개념별 Atomic 캡슐 목록
    if (conceptId) {
      const { data, error } = await supabase
        .from('ont_atomic_capsule')
        .select('atomic_id, topic, description, order_in_concept, difficulty, estimated_min, generation_stage')
        .eq('concept_id', Number(conceptId))
        .order('order_in_concept')

      if (error) throw error

      // 학습 진도 포함
      let progressMap: Record<number, any> = {}
      if (userId && data && data.length > 0) {
        const atomicIds = data.map(d => d.atomic_id)
        const { data: progData } = await supabase
          .from('ont_user_progress')
          .select('*')
          .eq('user_id', userId)
          .in('atomic_id', atomicIds)

        if (progData) {
          progressMap = Object.fromEntries(progData.map(p => [p.atomic_id, p]))
        }
      }

      const capsules = (data || []).map(cap => ({
        ...cap,
        progress: progressMap[cap.atomic_id] || null,
      }))

      // 개념 정보
      const { data: concept } = await supabase
        .from('ont_concept')
        .select('concept_id, name, level, description, domain:ont_domain(name)')
        .eq('concept_id', Number(conceptId))
        .single()

      const totalEstimated = capsules.reduce((s, c) => s + (c.estimated_min || 10), 0)
      const masteredCount = userId
        ? Object.values(progressMap).filter((p: any) => p.status === 'mastered').length
        : 0

      return NextResponse.json({
        concept,
        total: capsules.length,
        total_estimated_min: totalEstimated,
        mastered_count: masteredCount,
        capsules,
      })
    }

    return NextResponse.json({ error: 'concept_id 또는 atomic_id 필요' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// 학습 진도 저장
export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  try {
    const body = await req.json()
    const { user_id = 'anonymous', atomic_id, concept_id, status, quiz_score, notes } = body

    if (!atomic_id) {
      return NextResponse.json({ error: 'atomic_id 필요' }, { status: 400 })
    }

    const updateData: any = {
      user_id,
      atomic_id,
      concept_id,
      status: status || 'in_progress',
      last_studied: new Date().toISOString(),
    }

    if (quiz_score !== undefined) updateData.quiz_score = quiz_score
    if (notes !== undefined) updateData.notes = notes
    if (status === 'mastered') updateData.mastered_at = new Date().toISOString()

    // upsert
    const { data, error } = await supabase
      .from('ont_user_progress')
      .upsert(updateData, { onConflict: 'user_id,atomic_id' })
      .select()
      .single()

    if (error) throw error

    // 학습 횟수 증가 (RPC 없으면 무시)
    try {
      await supabase.rpc('increment_study_count', { p_user_id: user_id, p_atomic_id: atomic_id })
    } catch {
      // RPC 없으면 무시
    }

    return NextResponse.json({ success: true, progress: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
