import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/email-service'
import { dailyDigestEmail, weeklyReportEmail } from '@/lib/email/templates'
import { notifyUserId } from '@/lib/notify'

/**
 * /api/v1/cron/digest — D5 알림 발송 (2026-08-18)
 *
 * GET ?type=daily   매입 회원 일일 다이제스트 — 신규 매물 + 하이라이트 최대 2건 + ?alert= 구간 링크
 * GET ?type=weekly  매각 회원 주간 리포트 — NDA +7일 · 관심 · 상담 요약
 *
 * 보안: CRON_SECRET 환경변수가 설정된 경우 `Authorization: Bearer <secret>` 필수
 *       (Vercel Cron 은 CRON_SECRET 을 자동으로 넣어 호출한다)
 * 발송 결과는 { sent, skipped, errors } 로 반환 — 개별 실패는 전체를 막지 않는다.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface UserRow { id: string; email: string; name: string; role: string; roles?: string[] | null; kyc_status: string }

function hasRole(u: UserRow, target: 'BUYER' | 'SELLER'): boolean {
  const roles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role]
  return roles.some(r => {
    const up = String(r ?? '').toUpperCase()
    if (target === 'BUYER') return up.startsWith('BUYER') || up === 'INVESTOR'
    return up === 'SELLER' || up === 'INSTITUTION'
  })
}

export async function GET(req: NextRequest) {
  // Vercel Cron 인증 — CRON_SECRET 미설정(로컬/데브)이면 통과
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'invalid cron secret' } }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get('type') === 'weekly' ? 'weekly' : 'daily'
  const result = { type, sent: 0, skipped: 0, errors: [] as string[] }

  try {
    const supabase = await createClient()

    // 수신자 — 활성(APPROVED) 회원만
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role, roles, kyc_status')
      .eq('kyc_status', 'APPROVED')
      .limit(500)
    if (usersError) throw usersError
    const users = (usersData ?? []) as UserRow[]

    // 수신 설정 — 마이페이지 설정과 연동 (행이 없으면 기본값: 인앱·이메일 모두 ON)
    // daily → 'new_listing' · weekly → 'deal_update'
    const prefKey = type === 'daily' ? 'new_listing' : 'deal_update'
    const prefs = new Map<string, { enabled: boolean; email: boolean }>()
    try {
      const { data: prefRows } = await supabase
        .from('notification_preferences')
        .select('user_id, enabled, email_enabled')
        .eq('key', prefKey)
      for (const p of prefRows ?? []) {
        prefs.set(p.user_id as string, { enabled: p.enabled !== false, email: p.email_enabled !== false })
      }
    } catch { /* 테이블 미생성 시 기본값 사용 */ }
    const prefOf = (id: string) => prefs.get(id) ?? { enabled: true, email: true }

    if (type === 'daily') {
      // ── 매입 일일 다이제스트 ──
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const alertDate = since.toISOString().slice(0, 10)
      const { data: fresh } = await supabase
        .from('npl_listings')
        .select('id, title, sido, sigungu, claim_amount')
        .eq('status', 'ACTIVE')
        .gte('created_at', since.toISOString())
        .order('claim_amount', { ascending: false })
        .limit(20)
      const newListings = fresh ?? []
      if (newListings.length === 0) {
        return NextResponse.json({ ...result, skipped: users.length, note: '신규 매물 없음 — 발송 생략' })
      }
      const highlights = newListings.slice(0, 2).map(l => ({
        title: (l.title as string) ?? '',
        region: [l.sido, l.sigungu].filter(Boolean).join(' '),
        amount: `채권액 ${Math.round(((l.claim_amount as number) ?? 0) / 100000000)}억`,
      }))

      for (const u of users.filter(x => hasRole(x, 'BUYER'))) {
        const pref = prefOf(u.id)
        if (!pref.enabled && !pref.email) { result.skipped++; continue }
        try {
          if (pref.enabled) {
            void notifyUserId(u.id, {
              type: 'NEW_LISTING',
              title: `오늘의 매칭 브리핑 — 신규 ${newListings.length}건`,
              message: highlights.map(h => `${h.region} ${h.title}`).join(' · '),
              link: `/exchange?alert=${alertDate}`,
            })
          }
          if (pref.email && u.email) {
            await sendEmail({ to: u.email, ...dailyDigestEmail({ name: u.name || '회원', newCount: newListings.length, highlights, alertDate }) })
          }
          result.sent++
        } catch (e) {
          result.errors.push(`${u.email}: ${e instanceof Error ? e.message : 'send failed'}`)
        }
      }
    } else {
      // ── 매각 주간 리포트 ──
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
      const { data: mkData } = await supabase.from('listing_marketing').select('listing_id, interest_count, consult_count, nda_requests')
      const mkRows = mkData ?? []
      const { data: listingsData } = await supabase.from('npl_listings').select('id, seller_id').not('seller_id', 'is', null)
      const bySeller = new Map<string, string[]>()
      for (const l of listingsData ?? []) {
        const sid = l.seller_id as string
        bySeller.set(sid, [...(bySeller.get(sid) ?? []), l.id as string])
      }

      for (const u of users.filter(x => hasRole(x, 'SELLER'))) {
        const pref = prefOf(u.id)
        if (!pref.enabled && !pref.email) { result.skipped++; continue }
        const myIds = new Set(bySeller.get(u.id) ?? [])
        if (myIds.size === 0) { result.skipped++; continue }
        let nda7 = 0, interestTotal = 0, consultTotal = 0
        for (const mk of mkRows) {
          if (!myIds.has(mk.listing_id as string)) continue
          interestTotal += (mk.interest_count as number) ?? 0
          consultTotal += (mk.consult_count as number) ?? 0
          const reqs = Array.isArray(mk.nda_requests) ? mk.nda_requests as Array<{ requested_at?: string }> : []
          nda7 += reqs.filter(r => r.requested_at && new Date(r.requested_at).getTime() >= cutoff).length
        }
        try {
          if (pref.enabled) {
            void notifyUserId(u.id, {
              type: 'ALERT',
              title: `주간 활동 리포트 — NDA 요청 +${nda7}`,
              message: `관심 누적 ${interestTotal} · 상담 누적 ${consultTotal} (등록 매물 ${myIds.size}건)`,
              link: '/my/seller',
            })
          }
          if (pref.email && u.email) {
            await sendEmail({ to: u.email, ...weeklyReportEmail({ name: u.name || '회원', nda7, interestTotal, consultTotal, listingCount: myIds.size }) })
          }
          result.sent++
        } catch (e) {
          result.errors.push(`${u.email}: ${e instanceof Error ? e.message : 'send failed'}`)
        }
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { ...result, error: { code: 'DIGEST_FAILED', message: (e as { message?: string })?.message ?? 'unknown' } },
      { status: 500 },
    )
  }
}
