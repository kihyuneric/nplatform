import { NextRequest, NextResponse } from 'next/server'
import { buildNewsletterData, buildDailyNewsletter } from '@/lib/newsletter-data'
import { renderNewsletterHtml, renderAINewsletterHtml } from '@/lib/newsletter-renderer'
import { getNewsletterHistory, updateNewsletterStatus } from '@/lib/ontology-db'
import type { NewsletterType } from '@/lib/ebook-types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { domain_id, period_days, type, concept_id, mode, theme } = body

    // Phase 5-4: AI 뉴스레터 모드
    if (mode === 'ai') {
      const newsletter = await buildDailyNewsletter({
        type: type as NewsletterType | undefined,
        concept_id: concept_id ? Number(concept_id) : undefined,
        domain_id: domain_id ? Number(domain_id) : undefined,
        theme: theme || undefined,
      })

      const html = renderAINewsletterHtml(newsletter)
      return NextResponse.json({ newsletter, html })
    }

    // Legacy 모드 (backward compat)
    const newsletter = await buildNewsletterData({
      domain_id: domain_id || undefined,
      period_days: period_days || 7,
    })

    const html = renderNewsletterHtml(newsletter)
    return NextResponse.json({ newsletter, html })
  } catch (error: any) {
    console.error('[newsletter/generate] Error:', error)
    return NextResponse.json(
      { error: '뉴스레터 생성 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}

// 이력 조회 + 상태 업데이트
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const history = await getNewsletterHistory(days)
    return NextResponse.json({ history })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { newsletter_id, status, recipient_count, error_message } = body

    await updateNewsletterStatus(newsletter_id, status, { recipient_count, error_message })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
