import { NextRequest, NextResponse } from 'next/server'
import { generateCapsuleFromData, upsertLectureCapsule } from '@/lib/ontology-db'

export async function POST(request: NextRequest) {
  try {
    const { concept_id } = await request.json()

    if (!concept_id) {
      return NextResponse.json({ error: 'concept_id is required' }, { status: 400 })
    }

    // 캡슐 자동 생성
    const capsule = await generateCapsuleFromData(concept_id)

    // DB 저장
    await upsertLectureCapsule(capsule)

    return NextResponse.json({ success: true, capsule })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
