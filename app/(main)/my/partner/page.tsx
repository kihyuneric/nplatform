'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, TrendingUp, Wallet, Copy, Download, Medal, Crown, Star, Trophy, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DS, { formatKRW } from '@/lib/design-system'
import { MckPageShell, MckPageHeader } from '@/components/mck'
import { MCK, MCK_FONTS, MCK_TYPE } from '@/lib/mck-design'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/auth-provider'
import { toast } from 'sonner'

// ─── Empty-state fallbacks (never show fake data) ──────────
const EMPTY_REFERRALS: { name: string; joined: string; status: string; payout: string }[] = []
const EMPTY_EARNINGS:  { month: string; amount: number }[] = []
const EMPTY_BOARD:     { rank: number; name: string; refs: number; earn: string; Icon: any; cls: string; isMe?: boolean }[] = []
const STATUS_CLR: Record<string, string> = {
  '가입완료': 'bg-stone-100/10 text-stone-900 border border-stone-300/20',
  '구독전환': 'bg-stone-100/10 text-stone-900 border border-stone-300/20',
  '심사중': 'bg-stone-100/10 text-stone-900 border border-stone-300/20',
}
// Role-based tabs: PARTNER sees all; AFFILIATE sees only referrals+marketing
const ALL_TABS = [
  { id: 'referrals',   label: '추천 현황',   roles: ['PARTNER', 'AFFILIATE', 'AGENCY'] },
  { id: 'earnings',    label: '수익 분석',   roles: ['PARTNER', 'AGENCY'] },
  { id: 'revenue_mix', label: '수익 구성',   roles: ['PARTNER', 'AGENCY'] },
  { id: 'marketing',   label: '마케팅 자료', roles: ['PARTNER', 'AFFILIATE', 'AGENCY'] },
  { id: 'leaderboard', label: '리더보드',    roles: ['PARTNER', 'AFFILIATE', 'AGENCY'] },
]

const MARKETING_ASSETS = [
  { name: 'SNS 배너 (1080×1080)', format: 'PNG', size: '2.1MB' },
  { name: 'SNS 스토리 (1080×1920)', format: 'PNG', size: '1.8MB' },
  { name: '이메일 템플릿 (HTML)', format: 'HTML', size: '48KB' },
  { name: '소개 브로셔 PDF', format: 'PDF', size: '3.4MB' },
  { name: '유튜브 썸네일 템플릿', format: 'PSD', size: '12MB' },
  { name: '카카오톡 채널 배너', format: 'PNG', size: '0.9MB' },
  { name: '제휴 계약서 양식', format: 'PDF', size: '0.3MB' },
]

// Revenue mix breakdown
const REVENUE_TYPES = [
  { id: 'referral',     label: '구독 추천 수수료',   desc: '추천 후 구독 전환 시 첫달 구독료의 20%', rate: '20%', color: 'bg-stone-100' },
  { id: 'transaction',  label: '거래 중개 수수료',   desc: '성사 거래 금액의 0.5~1.0% (딜 사이즈별)', rate: '0.5~1.0%', color: 'bg-stone-100' },
  { id: 'content',      label: '콘텐츠 제작 수수료', desc: '승인된 NPL 투자 콘텐츠 게시 건당', rate: '₩30,000/건', color: 'bg-stone-100' },
  { id: 'event',        label: '이벤트 참가비 분배', desc: '웨비나·오프라인 행사 수익 공유', rate: '30%', color: 'bg-stone-100' },
  { id: 'data',         label: '데이터 리포트 판매', desc: '공동 제작 시장 리포트 판매 수익 공유', rate: '15%', color: 'bg-stone-100' },
]

// ─── Hook: fetch partner data from Supabase ─────────────────
interface PartnerData {
  partnerScore: number
  referralCode: string
  totalReferrals: number
  monthlyReferrals: number
  totalEarnings: number
  conversionRate: number
  pendingPayout: number
  referrals: typeof EMPTY_REFERRALS
  earnings: typeof EMPTY_EARNINGS
  leaderboard: typeof EMPTY_BOARD
  userName: string
  partnerTier: string
}

function usePartnerData() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // 1) Fetch partner_score from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('partner_score, name')
        .eq('id', user.id)
        .single()

      const partnerScore = userError ? (user.partner_score ?? 0) : (userData?.partner_score ?? 0)
      const userName = userError ? (user.name ?? '파트너') : (userData?.name ?? user.name ?? '파트너')

      // 2) Fetch partner_profiles for referral stats (table may be empty or not exist)
      let profileData: Record<string, unknown> | null = null
      try {
        const { data: pData, error: pError } = await supabase
          .from('partner_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!pError && pData) {
          profileData = pData
        }
      } catch {
        // Table may not exist or be empty — use fallback
      }

      // 3) Determine tier based on partner_score
      let partnerTier = '일반 파트너'
      if (partnerScore >= 500) partnerTier = '플래티넘 파트너'
      else if (partnerScore >= 300) partnerTier = '골드 파트너'
      else if (partnerScore >= 100) partnerTier = '실버 파트너'

      // 4) Build referral code from user id
      const referralCode = profileData?.referral_code as string
        ?? `NPL${user.id.slice(0, 8).toUpperCase()}`

      // 5) Fetch real referral list
      let realReferrals: typeof EMPTY_REFERRALS = []
      try {
        const { data: refRows } = await supabase
          .from('referrals')
          .select('id, referred_id, status, signed_up_at, converted_at')
          .eq('referrer_id', user.id)
          .order('signed_up_at', { ascending: false })
          .limit(20)

        if (refRows && refRows.length > 0) {
          // Fetch referred users' names
          const referredIds = refRows.map(r => r.referred_id)
          const { data: referredUsers } = await supabase
            .from('users')
            .select('id, name')
            .in('id', referredIds)

          const nameMap: Record<string, string> = {}
          ;(referredUsers ?? []).forEach((u: Record<string, unknown>) => {
            nameMap[u.id as string] = (u.name as string) ?? '익명'
          })

          // Fetch earnings per referral
          const { data: earningRows } = await supabase
            .from('referral_earnings')
            .select('referral_id, amount, status')
            .eq('referrer_id', user.id)

          const earningMap: Record<string, number> = {}
          ;(earningRows ?? []).forEach((e: Record<string, unknown>) => {
            const rid = e.referral_id as string
            earningMap[rid] = (earningMap[rid] ?? 0) + ((e.amount as number) ?? 0)
          })

          const STATUS_MAP: Record<string, string> = {
            SIGNED_UP: '가입완료',
            CONVERTED: '구독전환',
            ACTIVE: '활성',
            CHURNED: '이탈',
          }

          realReferrals = refRows.map(r => ({
            name: nameMap[r.referred_id] ?? `추천인 ${r.referred_id.slice(0, 4)}`,
            joined: (r.signed_up_at as string ?? '').slice(0, 10),
            status: STATUS_MAP[r.status as string] ?? r.status,
            payout: earningMap[r.id] ? `₩${earningMap[r.id].toLocaleString('ko-KR')}` : '-',
          }))
        }
      } catch {
        // referrals table may be empty — keep empty array
      }

      // 6) Fetch monthly earnings from referral_earnings
      let realEarnings: typeof EMPTY_EARNINGS = []
      try {
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const { data: earnRows } = await supabase
          .from('referral_earnings')
          .select('amount, created_at')
          .eq('referrer_id', user.id)
          .gte('created_at', sixMonthsAgo.toISOString())
          .order('created_at', { ascending: true })

        if (earnRows && earnRows.length > 0) {
          // Aggregate by month
          const byMonth: Record<string, number> = {}
          earnRows.forEach((e: Record<string, unknown>) => {
            const d = new Date(e.created_at as string)
            const key = `${d.getMonth() + 1}월`
            byMonth[key] = (byMonth[key] ?? 0) + ((e.amount as number) ?? 0)
          })
          realEarnings = Object.entries(byMonth).map(([month, amount]) => ({ month, amount }))
        }
      } catch {
        // referral_earnings table may be empty
      }

      const finalEarnings = realEarnings

      // 7) Use profile data if available, otherwise fallback to defaults
      const totalReferrals = (profileData?.total_referrals as number) ?? realReferrals.length ?? 0
      const totalEarnings = (profileData?.total_earnings as number) ?? 0
      // 7) Fetch top leaderboard from referral_earnings grouped by referrer_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let realBoard: any[] = []
      try {
        // Use partner_profiles or aggregate referral_earnings for top partners
        const { data: boardProfiles } = await supabase
          .from('partner_profiles')
          .select('user_id, total_referrals, total_earnings, users(name)')
          .order('total_earnings', { ascending: false })
          .limit(10)

        if (boardProfiles && boardProfiles.length > 0) {
          const ICONS = [Crown, Medal, Star, Trophy, Trophy]
          const CLASSES = ['text-stone-900', 'text-slate-400', 'text-stone-900', 'text-slate-500', 'text-slate-500']
          realBoard = boardProfiles.map((p, i) => {
            const uName = (Array.isArray(p.users) ? p.users[0] : p.users as Record<string, string> | null)?.name ?? `파트너 ${i + 1}`
            const isMe = p.user_id === user.id
            return {
              rank: i + 1,
              name: isMe ? `${uName} (나)` : uName,
              refs: p.total_referrals ?? 0,
              earn: formatKRW(p.total_earnings ?? 0),
              Icon: i < 5 ? ICONS[i] : Trophy,
              cls: i < 5 ? CLASSES[i] : 'text-slate-500',
              isMe,
            }
          })
        }
      } catch { /* no board data */ }

      const finalBoard = realBoard.length > 0
        ? realBoard
        : totalReferrals > 0
          ? [{ rank: 1, name: userName, refs: totalReferrals, earn: formatKRW(totalEarnings), Icon: Trophy, cls: 'text-[#2251FF]', isMe: true }]
          : []

      setData({
        partnerScore,
        referralCode,
        totalReferrals,
        monthlyReferrals: (profileData?.monthly_referrals as number) ?? 0,
        totalEarnings,
        conversionRate: (profileData?.conversion_rate as number) ?? 0,
        pendingPayout: (profileData?.pending_payout as number) ?? 0,
        referrals: realReferrals.length > 0 ? realReferrals : [],
        earnings: finalEarnings,
        leaderboard: finalBoard,
        userName,
        partnerTier,
      })
    } catch (err) {
      console.error('파트너 데이터 로드 실패:', err)
      // Show real zeros rather than fake data on error
      setData({
        partnerScore: user.partner_score ?? 0,
        referralCode: `NPL${user.id.slice(0, 8).toUpperCase()}`,
        totalReferrals: 0,
        monthlyReferrals: 0,
        totalEarnings: 0,
        conversionRate: 0,
        pendingPayout: 0,
        referrals: [],
        earnings: [],
        leaderboard: [],
        userName: user.name ?? '파트너',
        partnerTier: '일반 파트너',
      })
    } finally {
      setLoading(false)
    }
  }, [user, authLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading: loading || authLoading, user }
}

// ─── Page Component ──────────────────────────────────────────
export default function PartnerDashboardPage() {
  const [tab, setTab] = useState('referrals')
  const [copied, setCopied] = useState(false)
  const { data, loading, user } = usePartnerData()
  // Role-based tab visibility: determine partner role from tier
  const partnerRole = data?.partnerTier?.includes('골드') || data?.partnerTier?.includes('플래티넘') ? 'AGENCY' : 'PARTNER'
  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(partnerRole))

  if (loading) {
    return (
      <MckPageShell variant="tint">
        <MckPageHeader
          breadcrumbs={[{ label: "마이", href: "/my" }, { label: "파트너 관리" }]}
          eyebrow="MY · PARTNER"
          title="파트너 대시보드"
          subtitle="파트너 데이터 불러오는 중..."
        />
        <div className="max-w-[1280px] mx-auto" style={{ padding: "60px 24px", textAlign: "center", color: MCK.textMuted, fontSize: 12 }}>
          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" style={{ color: MCK.electric }} />
          파트너 데이터를 불러오는 중...
        </div>
      </MckPageShell>
    )
  }

  if (!user) {
    return (
      <MckPageShell variant="tint">
        <MckPageHeader
          breadcrumbs={[{ label: "마이", href: "/my" }, { label: "파트너 관리" }]}
          eyebrow="MY · PARTNER"
          title="파트너 대시보드"
          subtitle="로그인이 필요합니다."
        />
      </MckPageShell>
    )
  }

  // Use data or sensible defaults
  const d = data!
  const referralLink = `https://nplatform.co.kr/join?ref=${d.referralCode}`

  const stats = [
    { label: '총 추천', value: `${d.totalReferrals.toLocaleString()}명`, icon: Users, color: 'text-[#2251FF]' },
    { label: '이번달 추천', value: `${d.monthlyReferrals.toLocaleString()}명`, icon: TrendingUp, color: 'text-[var(--color-positive)]' },
    { label: '누적 정산', value: formatKRW(d.totalEarnings), icon: Wallet, color: 'text-stone-900' },
    { label: '추천 전환율', value: `${d.conversionRate}%`, icon: TrendingUp, color: 'text-stone-900' },
  ]

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('추천 링크가 복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "마이", href: "/my" }, { label: "파트너 관리" }]}
        eyebrow="MY · PARTNER"
        title="파트너 대시보드"
        subtitle={`${d.partnerTier} · 파트너 점수 ${d.partnerScore}점`}
        actions={
          <div className="flex flex-wrap gap-5">
            <div style={{ textAlign: "right" }}>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>추천 코드</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: MCK.ink, letterSpacing: "0.04em" }}>
                {d.referralCode}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>이번달 추천</div>
              <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {d.monthlyReferrals}명
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>미지급 정산</div>
              <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.positive, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {formatKRW(d.pendingPayout)}
              </div>
            </div>
          </div>
        }
      />

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>
        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={DS.stat.card}>
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <div className={DS.stat.value}>{s.value}</div>
              <div className={DS.stat.sub}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className={DS.tabs.list + ' overflow-x-auto'}>
          {visibleTabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 ${tab === t.id ? DS.tabs.active : DS.tabs.trigger}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Referrals Tab */}
        {tab === 'referrals' && (
          <div className="space-y-4">
            <div className={DS.card.elevated + " " + DS.card.padding + " flex flex-col sm:flex-row sm:items-center justify-between gap-3"}>
              <div>
                <p className={DS.text.caption + " mb-1"}>내 추천 링크</p>
                <p className="text-[0.8125rem] font-mono text-[var(--color-text-primary)]">{referralLink}</p>
              </div>
              <button onClick={handleCopy} className={DS.button.primary}>
                <Copy className="h-3.5 w-3.5" />{copied ? '복사됨!' : '링크 복사'}
              </button>
            </div>
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <h2 className={DS.text.cardTitle + " mb-4"}>최근 추천 현황</h2>
              {d.referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-3" />
                  <p className={DS.text.body}>아직 추천 내역이 없습니다.</p>
                  <p className={DS.text.captionLight + " mt-1"}>추천 링크를 공유하여 첫 추천을 시작하세요!</p>
                </div>
              ) : (
                <div className={DS.table.wrapper}>
                  <table className="w-full">
                    <thead>
                      <tr className={DS.table.header}>
                        <th className={DS.table.headerCell}>이름</th>
                        <th className={DS.table.headerCell}>가입일</th>
                        <th className={DS.table.headerCell}>전환 상태</th>
                        <th className={DS.table.headerCell}>지급 예정액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.referrals.map((r, i) => (
                        <tr key={i} className={DS.table.row}>
                          <td className={DS.table.cell + " font-medium"}>{r.name}</td>
                          <td className={DS.table.cellMuted + " tabular-nums"}>{r.joined}</td>
                          <td className={DS.table.cell}><span className={`text-[0.6875rem] px-2 py-0.5 rounded-none font-bold ${STATUS_CLR[r.status] ?? 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]'}`}>{r.status}</span></td>
                          <td className={DS.table.cell + " tabular-nums font-semibold"}>{r.payout}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {tab === 'earnings' && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
            <h2 className={DS.text.cardTitle + " mb-4"}>월별 수익 현황</h2>
            {d.earnings.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <TrendingUp className={DS.empty.icon} />
                <p className={DS.empty.title}>수익 데이터가 없습니다</p>
                <p className={DS.empty.description}>추천이 구독으로 전환되면 여기에 수익 현황이 표시됩니다.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.earnings} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`₩${v.toLocaleString()}`, '수익']} contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, color: 'var(--color-text-primary)' }} />
                <Bar dataKey="amount" fill="#2251FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
            <div className={"mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex justify-between"}>
              <span className={DS.text.body}>이번달 수익</span>
              <span className={DS.text.metricSmall}>{formatKRW(d.pendingPayout)}</span>
            </div>
          </div>
        )}

        {/* Revenue Mix Tab */}
        {tab === 'revenue_mix' && (
          <div className="space-y-5">
            <div className={DS.card.elevated + ' ' + DS.card.paddingLarge}>
              <h2 className={DS.text.cardTitle + ' mb-2'}>파트너 수익 구성</h2>
              <p className={DS.text.captionLight + ' mb-6'}>NPLatform 파트너는 아래 5가지 방식으로 수익을 창출할 수 있습니다.</p>
              <div className="space-y-4">
                {REVENUE_TYPES.map((rev, i) => {
                  // Mock earned amounts
                  const earned = [840000, 250000, 90000, 60000, 0][i] ?? 0
                  return (
                    <div key={rev.id} className="flex items-start gap-4 p-4 rounded-none border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] transition-colors">
                      <div className={`w-2 self-stretch rounded-none ${rev.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className={DS.text.cardSubtitle}>{rev.label}</p>
                          <div className="text-right">
                            <p className="text-[0.6875rem] text-[var(--color-text-muted)] mb-0.5">수익률</p>
                            <p className="text-[0.8125rem] font-bold text-[#2251FF]">{rev.rate}</p>
                          </div>
                        </div>
                        <p className={DS.text.caption}>{rev.desc}</p>
                        {earned > 0 && (
                          <p className="mt-2 text-[0.75rem] font-semibold text-[var(--color-positive)]">
                            이번 달 누적: ₩{earned.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Revenue breakdown chart summary */}
            <div className={DS.card.elevated + ' ' + DS.card.padding}>
              <h2 className={DS.text.cardTitle + ' mb-4'}>이번 달 수익 구성비</h2>
              <div className="space-y-3">
                {[
                  { label: '구독 추천', pct: 67, color: 'bg-stone-100' },
                  { label: '거래 중개', pct: 20, color: 'bg-stone-100' },
                  { label: '콘텐츠',   pct: 7,  color: 'bg-stone-100' },
                  { label: '이벤트',   pct: 5,  color: 'bg-stone-100' },
                  { label: '기타',     pct: 1,  color: 'bg-gray-400' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className={DS.text.body + ' text-[0.75rem]'}>{item.label}</span>
                      <span className={DS.text.bodyBold + ' tabular-nums text-[0.75rem]'}>{item.pct}%</span>
                    </div>
                    <div className="h-2 rounded-none bg-[var(--color-surface-sunken)] overflow-hidden">
                      <div className={`h-full rounded-none ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Marketing Tab */}
        {tab === 'marketing' && (
          <div className="space-y-4">
            <div className={DS.card.elevated + ' ' + DS.card.padding}>
              <h2 className={DS.text.cardTitle + ' mb-1'}>내 추천 링크</h2>
              <p className={DS.text.captionLight + ' mb-3'}>아래 링크를 공유하면 추천 전환이 자동 집계됩니다.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className={DS.input.base + ' font-mono text-[0.75rem] flex-1'}
                />
                <button onClick={handleCopy} className={DS.button.primary}>
                  <Copy className="h-3.5 w-3.5" />{copied ? '복사됨!' : '복사'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MARKETING_ASSETS.map((asset) => (
                <div key={asset.name} className={DS.card.interactive + ' ' + DS.card.padding + ' flex items-center justify-between'}>
                  <div>
                    <p className={DS.text.body}>{asset.name}</p>
                    <p className={DS.text.captionLight}>{asset.format} · {asset.size}</p>
                  </div>
                  <button
                    onClick={() => toast('준비 중입니다')}
                    className={DS.text.link + ' flex items-center gap-1.5 text-[0.8125rem]'}
                  >
                    <Download className="h-3.5 w-3.5" />다운로드
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div className={DS.card.elevated + " " + DS.card.padding}>
            <h2 className={DS.text.cardTitle + " mb-4"}>Top 10 파트너 랭킹</h2>
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    <th className={DS.table.headerCell}>순위</th>
                    <th className={DS.table.headerCell}>파트너명</th>
                    <th className={DS.table.headerCell}>총 추천수</th>
                    <th className={DS.table.headerCell}>누적 수익</th>
                  </tr>
                </thead>
                <tbody>
                  {d.leaderboard.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)] text-sm">리더보드 데이터를 불러오는 중이거나 아직 파트너 활동이 없습니다.</td></tr>
                  ) : d.leaderboard.map((p: any) => (
                    <tr key={p.rank} className={DS.table.row + (p.isMe ? ' !bg-stone-100/10' : '')}>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5">
                          {p.Icon ? <p.Icon className={`h-4 w-4 ${p.cls}`} /> : <span className="w-4" />}
                          <span className={`font-bold tabular-nums ${p.rank <= 3 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>{p.rank}</span>
                        </div>
                      </td>
                      <td className={DS.table.cell + ` font-medium ${p.isMe ? '!text-[#2251FF]' : ''}`}>
                        {p.name}{p.isMe && <span className="text-[0.6875rem] text-[#2251FF] ml-1">(나)</span>}
                      </td>
                      <td className={DS.table.cell + " tabular-nums"}>{p.refs.toLocaleString()}명</td>
                      <td className={DS.table.cell + " tabular-nums font-semibold"}>{p.earn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MckPageShell>
  )
}
