/**
 * 하위 개념 조회 + 콘텐츠 합성 API
 *
 * GET: 특정 상위 개념의 하위 개념 목록 조회
 * POST: 특정 하위 개념의 콘텐츠 합성 (AI)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: 하위 개념 목록
export async function GET(req: NextRequest) {
  const conceptId = req.nextUrl.searchParams.get('concept_id')

  if (!conceptId) {
    // 전체 하위 개념 (샘플용)
    const { data, error } = await supabase
      .from('ont_sub_concept')
      .select('*, ont_concept(name, domain_id, difficulty)')
      .order('concept_id')
      .order('order_in_parent')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ sub_concepts: data })
  }

  // 특정 상위 개념의 하위 개념
  const { data, error } = await supabase
    .from('ont_sub_concept')
    .select('*')
    .eq('concept_id', parseInt(conceptId))
    .order('order_in_parent')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 각 하위 개념의 매핑 영상 수
  for (const sc of (data || [])) {
    const { count } = await supabase
      .from('ont_sub_concept_video')
      .select('*', { count: 'exact', head: true })
      .eq('sub_concept_id', sc.sub_concept_id)

    sc.video_count = count || 0
  }

  return NextResponse.json({ sub_concepts: data })
}
