export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/ontology-db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { concept_id, overview, teaching_guidelines, syllabus } = body

    if (!concept_id) {
      return NextResponse.json({ error: 'concept_id is required' }, { status: 400 })
    }

    // Fetch existing capsule
    const { data: existing, error: fetchErr } = await supabase
      .from('ont_lecture_capsule')
      .select('*')
      .eq('concept_id', concept_id)
      .limit(1)

    if (fetchErr) throw fetchErr
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: '캡슐이 존재하지 않습니다.' }, { status: 404 })
    }

    const capsule = existing[0]

    // Merge edited fields
    const updated = {
      ...capsule,
      overview: overview ?? capsule.overview,
      teaching_guidelines: teaching_guidelines ?? capsule.teaching_guidelines,
      syllabus: syllabus ?? capsule.syllabus,
      generated_at: new Date().toISOString(),
    }

    const { error: upsertErr } = await supabase
      .from('ont_lecture_capsule')
      .upsert(updated, { onConflict: 'concept_id,level' })

    if (upsertErr) throw upsertErr

    // Return updated capsule
    const { data: result } = await supabase
      .from('ont_lecture_capsule')
      .select('*')
      .eq('concept_id', concept_id)
      .limit(1)

    return NextResponse.json({ capsule: result?.[0] || updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
