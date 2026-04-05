'use client'

import { useState } from 'react'
import { Users, TrendingUp, Wallet, Copy, Download, Medal, Crown, Star, Trophy } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DS, { formatKRW } from '@/lib/design-system'

const STATS = [
  { label: '총 추천', value: '148명', icon: Users, color: 'text-[var(--color-brand-mid)]' },
  { label: '이번달 추천', value: '24명', icon: TrendingUp, color: 'text-[var(--color-positive)]' },
  { label: '누적 정산', value: '₩8,420,000', icon: Wallet, color: 'text-amber-600' },
  { label: '추천 전환율', value: '31.2%', icon: TrendingUp, color: 'text-violet-600' },
]
const REFERRALS = [
  { name: '김민준', joined: '2026-03-20', status: '가입완료', payout: '₩35,000' },
  { name: '이서연', joined: '2026-03-18', status: '구독전환', payout: '₩70,000' },
  { name: '박지훈', joined: '2026-03-15', status: '가입완료', payout: '₩35,000' },
  { name: '최유나', joined: '2026-03-12', status: '구독전환', payout: '₩70,000' },
  { name: '정현우', joined: '2026-03-10', status: '심사중', payout: '-' },
  { name: '강소희', joined: '2026-03-08', status: '구독전환', payout: '₩70,000' },
]
const EARNINGS = [
  { month: '10월', amount: 420000 }, { month: '11월', amount: 560000 },
  { month: '12월', amount: 700000 }, { month: '1월', amount: 630000 },
  { month: '2월', amount: 980000 }, { month: '3월', amount: 840000 },
]
const BOARD = [
  { rank: 1, name: '최우수파트너A', refs: 312, earn: '₩10,920,000', Icon: Crown, cls: 'text-amber-500' },
  { rank: 2, name: '김골드파트너', refs: 278, earn: '₩9,730,000', Icon: Medal, cls: 'text-slate-400' },
  { rank: 3, name: '이실버에이전트', refs: 241, earn: '₩8,435,000', Icon: Star, cls: 'text-amber-700' },
  { rank: 4, name: '박프리미엄파트너', refs: 196, earn: '₩6,860,000', Icon: Trophy, cls: 'text-slate-500' },
  { rank: 5, name: '정엘리트리퍼럴', refs: 175, earn: '₩6,125,000', Icon: Trophy, cls: 'text-slate-500' },
  { rank: 6, name: '나', refs: 148, earn: '₩8,420,000', Icon: null, cls: '', isMe: true },
  { rank: 7, name: '서탑파트너', refs: 134, earn: '₩4,690,000', Icon: null, cls: '' },
  { rank: 8, name: '우액티브리퍼럴', refs: 121, earn: '₩4,235,000', Icon: null, cls: '' },
  { rank: 9, name: '조포커스파트너', refs: 108, earn: '₩3,780,000', Icon: null, cls: '' },
  { rank: 10, name: '문실버파트너', refs: 97, earn: '₩3,395,000', Icon: null, cls: '' },
]
const STATUS_CLR: Record<string, string> = {
  '가입완료': 'bg-blue-50 text-blue-700 border border-blue-200',
  '구독전환': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  '심사중': 'bg-amber-50 text-amber-700 border border-amber-200',
}
const REFERRAL_CODE = 'NPL2024XYZ'
const REFERRAL_LINK = `https://nplatform.co.kr/join?ref=${REFERRAL_CODE}`
const TABS = [
  { id: 'referrals', label: '추천 현황' }, { id: 'earnings', label: '수익' },
  { id: 'marketing', label: '마케팅 자료' }, { id: 'leaderboard', label: '리더보드' },
]
const MARKETING = ['SNS 배너 (1080×1080)', 'SNS 스토리 (1080×1920)', '이메일 템플릿', '소개 브로셔 PDF']

export default function PartnerDashboardPage() {
  const [tab, setTab] = useState('referrals')
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(REFERRAL_LINK); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className={DS.header.eyebrow}>마이페이지</p>
              <h1 className={DS.header.title}>파트너 대시보드</h1>
              <p className={DS.header.subtitle}>골드 파트너 · 활동 중</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="text-center">
                <div className={DS.text.caption}>추천 코드</div>
                <div className="text-amber-600 font-bold text-[0.9375rem] font-mono">{REFERRAL_CODE}</div>
              </div>
              <div className="w-px bg-[var(--color-border-subtle)]" />
              <div className="text-center">
                <div className={DS.text.caption}>이번달 추천</div>
                <div className={DS.text.metricMedium}>24명</div>
              </div>
              <div className="w-px bg-[var(--color-border-subtle)]" />
              <div className="text-center">
                <div className={DS.text.caption}>미지급 정산</div>
                <div className={DS.text.metricMedium + " !text-[var(--color-positive)]"}>₩840,000</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>
        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className={DS.stat.card}>
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <div className={DS.stat.value}>{s.value}</div>
              <div className={DS.stat.sub}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className={DS.tabs.list}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 ${tab === t.id ? DS.tabs.active : DS.tabs.trigger}`}>
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
                <p className="text-[0.8125rem] font-mono text-[var(--color-text-primary)]">{REFERRAL_LINK}</p>
              </div>
              <button onClick={handleCopy} className={DS.button.primary}>
                <Copy className="h-3.5 w-3.5" />{copied ? '복사됨!' : '링크 복사'}
              </button>
            </div>
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <h2 className={DS.text.cardTitle + " mb-4"}>최근 추천 현황</h2>
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
                    {REFERRALS.map((r, i) => (
                      <tr key={i} className={DS.table.row}>
                        <td className={DS.table.cell + " font-medium"}>{r.name}</td>
                        <td className={DS.table.cellMuted + " tabular-nums"}>{r.joined}</td>
                        <td className={DS.table.cell}><span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold ${STATUS_CLR[r.status] ?? 'bg-slate-50 text-slate-500 border border-slate-200'}`}>{r.status}</span></td>
                        <td className={DS.table.cell + " tabular-nums font-semibold"}>{r.payout}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {tab === 'earnings' && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
            <h2 className={DS.text.cardTitle + " mb-4"}>월별 수익 현황</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={EARNINGS} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`₩${v.toLocaleString()}`, '수익']} contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, color: 'var(--color-text-primary)' }} />
                <Bar dataKey="amount" fill="var(--color-brand-mid)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className={"mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex justify-between"}>
              <span className={DS.text.body}>이번달 수익</span>
              <span className={DS.text.metricSmall}>₩840,000</span>
            </div>
          </div>
        )}

        {/* Marketing Tab */}
        {tab === 'marketing' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MARKETING.map((item) => (
              <div key={item} className={DS.card.interactive + " " + DS.card.padding + " flex items-center justify-between"}>
                <span className={DS.text.body}>{item}</span>
                <button className={DS.text.link + " flex items-center gap-1.5 text-[0.8125rem]"}>
                  <Download className="h-3.5 w-3.5" />다운로드
                </button>
              </div>
            ))}
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
                  {BOARD.map((p) => (
                    <tr key={p.rank} className={DS.table.row + (p.isMe ? ' !bg-blue-50' : '')}>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5">
                          {p.Icon ? <p.Icon className={`h-4 w-4 ${p.cls}`} /> : <span className="w-4" />}
                          <span className={`font-bold tabular-nums ${p.rank <= 3 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>{p.rank}</span>
                        </div>
                      </td>
                      <td className={DS.table.cell + ` font-medium ${p.isMe ? '!text-[var(--color-brand-mid)]' : ''}`}>
                        {p.name}{p.isMe && <span className="text-[0.6875rem] text-[var(--color-brand-mid)] ml-1">(나)</span>}
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
    </div>
  )
}
