export const dynamic = 'force-dynamic'

// Phase 6: Atomic 캡슐 학습자료 다운로드 API
// GET ?concept_id=N&format=docx|pdf
// Atomic 캡슐 전체를 전문 교재 수준의 DOCX/PDF로 출력

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  generateAtomicCapsuleDocx,
  packDocxToBuffer,
} from '@/lib/docx-generator'
import { generateAtomicCapsulePdf } from '@/lib/pdf-generator'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
  )
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const conceptId = Number(searchParams.get('concept_id'))
    const format = searchParams.get('format') || 'docx'

    if (!conceptId || isNaN(conceptId)) {
      return NextResponse.json({ error: 'concept_id가 필요합니다.' }, { status: 400 })
    }

    // 개념 정보 조회
    const { data: concept, error: conceptError } = await supabase
      .from('ont_concept')
      .select('concept_id, name, level, description, domain:ont_domain(name)')
      .eq('concept_id', conceptId)
      .single()

    if (conceptError || !concept) {
      return NextResponse.json({ error: '개념을 찾을 수 없습니다.' }, { status: 404 })
    }

    // Atomic 캡슐 조회
    const { data: capsules, error: capsuleError } = await supabase
      .from('ont_atomic_capsule')
      .select('topic, description, order_in_concept, difficulty, estimated_min, content_json')
      .eq('concept_id', conceptId)
      .order('order_in_concept')

    if (capsuleError) throw capsuleError

    if (!capsules || capsules.length === 0) {
      return NextResponse.json({ error: '이 개념에 생성된 Atomic 캡슐이 없습니다.' }, { status: 404 })
    }

    const domainName = (concept.domain as any)?.name || '부동산'

    const input = {
      conceptName: concept.name,
      conceptLevel: concept.level,
      domainName,
      capsules: capsules.map(c => ({
        topic: c.topic,
        description: c.description || '',
        order_in_concept: c.order_in_concept,
        difficulty: c.difficulty || 'beginner',
        estimated_min: c.estimated_min || 10,
        content_json: c.content_json,
      })),
    }

    if (format === 'pdf') {
      const pdfBytes = generateAtomicCapsulePdf(input)
      const filename = encodeURIComponent(`${concept.name}_Atomic캡슐학습교재.pdf`)
      return new NextResponse(new Uint8Array(pdfBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      const doc = generateAtomicCapsuleDocx(input)
      const buffer = await packDocxToBuffer(doc)
      const filename = encodeURIComponent(`${concept.name}_Atomic캡슐학습교재.docx`)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error: any) {
    console.error('[atomic-capsules/export] Error:', error)
    return NextResponse.json(
      { error: '파일 생성 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
