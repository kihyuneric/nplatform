/**
 * Phase 2-G — 일일 운영 KPI 요약을 Slack 으로 발송
 *
 * 매일 09:00 KST 실행 (vercel.json cron 설정).
 * 핵심 지표: 활성 매물·신규 매물·신규 딜룸·완료 거래·신규 가입.
 *
 * 인증: Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSlackBlocks, slackBlocks } from '@/lib/notifications/slack'

interface SummaryData {
  date: string
  activeListings: number
  newListingsToday: number
  newDealsToday: number
  completedDealsToday: number
  newUsersToday: number
}

async function collectSummary(): Promise<SummaryData> {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const dayStartIso = `${dateStr}T00:00:00.000Z`

  const supabase = await createClient()

  const safeCount = async (table: string, build: (q: ReturnType<typeof supabase.from>) => unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = supabase.from(table).select('*', { count: 'exact', head: true }) as any
      const result = await build(q)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Number((result as any)?.count ?? 0)
    } catch {
      return 0
    }
  }

  const [activeListings, newListingsToday, newDealsToday, completedDealsToday, newUsersToday] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeCount('listings', (q: any) => q.eq('status', 'ACTIVE')),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeCount('listings', (q: any) => q.gte('created_at', dayStartIso)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeCount('deal_rooms', (q: any) => q.gte('created_at', dayStartIso)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeCount('deal_rooms', (q: any) => q.eq('stage', 'CONTRACT').gte('updated_at', dayStartIso)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    safeCount('profiles', (q: any) => q.gte('created_at', dayStartIso)),
  ])

  return {
    date: dateStr,
    activeListings,
    newListingsToday,
    newDealsToday,
    completedDealsToday,
    newUsersToday,
  }
}

function buildSlackBlocks(s: SummaryData) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nplatform.vercel.app'
  return [
    slackBlocks.header(`📊 NPLatform 일일 요약 — ${s.date}`),
    slackBlocks.fields([
      { label: '활성 매물', value: `${s.activeListings.toLocaleString()}건` },
      { label: '신규 매물 (오늘)', value: `${s.newListingsToday.toLocaleString()}건` },
      { label: '신규 딜룸 (오늘)', value: `${s.newDealsToday.toLocaleString()}건` },
      { label: '체결 (오늘)', value: `${s.completedDealsToday.toLocaleString()}건` },
      { label: '신규 가입 (오늘)', value: `${s.newUsersToday.toLocaleString()}명` },
    ]),
    slackBlocks.context([
      `_자동 생성 · ${new Date().toISOString()}_`,
      `Source: \`/api/v1/cron/daily-summary\``,
    ]),
    slackBlocks.actionLink('관리자 대시보드 열기', `${baseUrl}/admin`),
  ]
}

async function handle(request: NextRequest) {
  // CRON_SECRET 인증 (Vercel Cron 만 호출 가능하도록)
  const auth = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'invalid cron secret' } }, { status: 401 })
  }

  let summary: SummaryData
  try {
    summary = await collectSummary()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: { code: 'COLLECT_FAILED', message: msg } },
      { status: 500 },
    )
  }

  const slackResult = await sendSlackBlocks({
    text: `NPLatform 일일 요약 ${summary.date} — 활성 매물 ${summary.activeListings}건`,
    blocks: buildSlackBlocks(summary),
  })

  return NextResponse.json({
    data: {
      summary,
      slack: slackResult,
      executedAt: new Date().toISOString(),
    },
  })
}

// Vercel Cron 은 GET 으로 호출 (vercel.json schedule)
export async function GET(request: NextRequest) {
  return handle(request)
}

// 수동 트리거 / 테스트용 POST 도 허용
export async function POST(request: NextRequest) {
  return handle(request)
}
