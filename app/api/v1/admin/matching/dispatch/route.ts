import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { NO_STORE } from '@/lib/api-cache'
import { notifyUserId } from '@/lib/notify'
import { sendEmail } from '@/lib/email/email-service'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

/**
 * 매칭 발송 (2026-08-19) — 운영기획서 v4 §3-6
 *
 * POST  선택한 매입 회원에게 매물을 보낸다 (알림함 + 이메일 병행)
 * GET   발송 이력 — 열람 · 관심 · NDA 로 이어졌는지 추적
 *
 * 공개 범위: 이메일에도 **채권기관·담당자 정보를 넣지 않는다.**
 * 지역 · 유형 · 금액대까지만 담는다 (§3-7 공개 범위).
 */

const eok = (n: number) => (n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n > 0 ? `${Math.round(n / 1e4).toLocaleString()}만` : '—')

export async function GET(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!me.role || !ADMIN_ROLES.includes(me.role)) {
    return apiError('FORBIDDEN', '운영관리자만 볼 수 있습니다.', 403)
  }

  const listing = request.nextUrl.searchParams.get('listing') || ''

  try {
    const supabase = await createClient()
    let q = supabase
      .from('match_dispatches')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(300)
    if (listing) q = q.eq('listing_id', listing)

    const { data, error } = await q
    if (error) throw error
    const rows = data ?? []

    // 표시용 — 관리번호 · 회원명
    const listingIds = Array.from(new Set(rows.map(r => String(r.listing_id))))
    const userIds = Array.from(new Set(rows.map(r => String(r.user_id))))
    const [{ data: ls }, { data: us }] = await Promise.all([
      supabase.from('npl_listings').select('id, listing_no').in('id', listingIds.length ? listingIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('users').select('id, name, company_name').in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
    ])
    const lMap = new Map((ls ?? []).map(l => [String(l.id), String(l.listing_no ?? '')]))
    const uMap = new Map((us ?? []).map(u => [String(u.id), [u.company_name, u.name].filter(Boolean).join(' · ')]))

    return NextResponse.json({
      data: rows.map(r => ({
        ...r,
        listing_no: lMap.get(String(r.listing_id)) ?? '—',
        member_label: uMap.get(String(r.user_id)) ?? '',
      })),
    }, { headers: NO_STORE })
  } catch (e) {
    console.error('dispatch GET error:', e)
    return apiError('INTERNAL_ERROR', '발송 이력 조회에 실패했습니다.', 500)
  }
}

export async function POST(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!me.role || !['SUPER_ADMIN', 'ADMIN'].includes(me.role)) {
    return apiError('FORBIDDEN', '운영관리자만 발송할 수 있습니다.', 403)
  }

  try {
    const body = await request.json()
    const listingId = String(body.listing_id ?? '')
    const targets = Array.isArray(body.targets) ? body.targets : []
    if (!listingId || targets.length === 0) {
      return apiError('BAD_REQUEST', '매물과 받는 회원을 지정해주세요.', 400)
    }

    const supabase = await createClient()
    const { data: l } = await supabase
      .from('npl_listings')
      .select('id, listing_no, sido, sigungu, collateral_type, claim_amount, appraised_value')
      .eq('id', listingId).maybeSingle()
    if (!l) return apiError('NOT_FOUND', '매물을 찾을 수 없습니다.', 404)

    const listingNo = String(l.listing_no ?? '')
    const region = [l.sido, l.sigungu].filter(Boolean).join(' ')
    // 공개 범위 — 지역 · 유형 · 금액대까지만 (채권기관·담당자 제외)
    const summary = [
      `관리번호 ${listingNo}`,
      region,
      String(l.collateral_type ?? ''),
      `채권액 ${eok(Number(l.claim_amount ?? 0))}`,
      `감정가 ${eok(Number(l.appraised_value ?? 0))}`,
    ].filter(Boolean).join(' · ')

    const sentAt = new Date().toISOString()
    let sent = 0
    let skipped = 0
    const failures: string[] = []

    for (const t of targets as Array<{ user_id: string; demand_id?: string; score?: number; reason?: string }>) {
      const uid = String(t.user_id ?? '')
      if (!uid) continue

      // 중복 발송 방지 — 유니크 인덱스로도 막히지만 미리 확인해 조용한 실패를 없앤다
      const { data: dup } = await supabase
        .from('match_dispatches').select('id').eq('listing_id', listingId).eq('user_id', uid).maybeSingle()
      if (dup) { skipped++; continue }

      const { data: member } = await supabase
        .from('users').select('email, name').eq('id', uid).maybeSingle()

      let emailStatus = '미발송'
      if (member?.email) {
        try {
          await sendEmail({
            to: member.email as string,
            subject: `[엔플랫폼] 매입조건에 맞는 NPL 매물 — ${listingNo}`,
            html: `
              <p>${member.name ?? '고객'}님, 등록하신 매입조건에 맞는 매물이 있어 안내드립니다.</p>
              <p><b>${summary}</b></p>
              <p>세부 자료는 NDA 체결 후 열람하실 수 있습니다.
                 채권기관과 담당자 정보는 협의 단계에서 운영사를 통해 공유됩니다.</p>
              <p><a href="https://nplatform-private.vercel.app/my/matches">자동매칭에서 확인하기</a></p>
            `,
          })
          emailStatus = '발송'
        } catch {
          emailStatus = '반송'
          failures.push(`${member.email} 메일 발송 실패`)
        }
      }

      void notifyUserId(uid, {
        type: 'NEW_LISTING',
        title: `매입조건에 맞는 매물 — ${listingNo}`,
        message: summary,
        link: '/my/matches',
      })

      const { error: insErr } = await supabase.from('match_dispatches').insert({
        listing_id: listingId,
        demand_id: t.demand_id ?? null,
        user_id: uid,
        score: Number(t.score ?? 0),
        reason: t.reason ?? null,
        channel: '알림함+이메일',
        email_status: emailStatus,
        sent_at: sentAt,
        sent_by: me.id,
      })
      if (insErr) { failures.push(`${uid} 이력 저장 실패`); continue }
      sent++
    }

    return NextResponse.json({ ok: true, sent, skipped, failures }, { headers: NO_STORE })
  } catch (e) {
    console.error('dispatch POST error:', e)
    return apiError('INTERNAL_ERROR', '발송에 실패했습니다.', 500)
  }
}
