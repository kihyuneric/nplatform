'use client'

import { useState } from 'react'
import { Key, Webhook, BookOpen, Activity, Copy, Eye, EyeOff, Plus, Trash2, RefreshCw, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import DS, { formatKRW } from '@/lib/design-system'

interface ApiKey {
  id: string; name: string; key: string
  created_at: string; last_used_at: string | null; is_active: boolean
}

const MOCK_KEYS: ApiKey[] = [
  { id: 'k1', name: '프로덕션 키',    key: 'npl_live_sk_••••••••••••••••1234', created_at: '2026-03-01', last_used_at: '2026-04-02', is_active: true },
  { id: 'k2', name: '개발 테스트 키', key: 'npl_test_sk_••••••••••••••••5678', created_at: '2026-03-15', last_used_at: null,          is_active: true },
]

const AVAILABLE_EVENTS = [
  'listing.published', 'listing.updated', 'listing.closed',
  'deal.created', 'deal.status_changed', 'deal.completed',
  'analysis.completed', 'payment.succeeded', 'payment.failed',
]

const USAGE_DATA = [
  3200, 4100, 3800, 5200, 4700, 6100, 5500, 4900, 6800, 7200,
  6500, 7800, 8100, 6900, 7400, 8800, 9100, 7600, 8400, 9300,
  8700, 10200, 9600, 11100, 10400, 9800, 11800, 12100, 11400, 12480,
]
const maxUsage = Math.max(...USAGE_DATA)

const TABS = ['API 키', 'Webhook', 'API 문서', '사용량'] as const
type Tab = typeof TABS[number]

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<Tab>('API 키')
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('https://myapp.example.com/webhook/npl')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['deal.created', 'listing.published'])
  const [copied, setCopied] = useState(false)

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const createKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 700))
    setKeys(prev => [...prev, {
      id: `k${Date.now()}`, name: newKeyName,
      key: `npl_live_sk_••••••••••••••••${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString().slice(0, 10), last_used_at: null, is_active: true,
    }])
    setNewKeyName('')
    setCreating(false)
  }

  const revokeKey = (id: string) => setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k))

  const toggleEvent = (ev: string) =>
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])

  const totalCalls = 124840
  const remaining = 1000000 - totalCalls
  const usedPct = Math.round((totalCalls / 1000000) * 100)

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[0.6875rem] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[var(--color-brand-mid)] font-bold">Beta</span>
              </div>
              <h1 className={DS.header.title}>개발자 포털</h1>
              <p className={DS.header.subtitle}>NPLatform API로 서비스를 구축하세요</p>
            </div>
            <div className="flex flex-wrap gap-4 text-center">
              <div className={DS.stat.card}>
                <p className={DS.stat.value}>{totalCalls.toLocaleString()}건</p>
                <p className={DS.stat.sub}>이번달 API 호출</p>
              </div>
              <div className={DS.stat.card}>
                <p className={DS.stat.value + " !text-[var(--color-positive)]"}>{remaining.toLocaleString()}건</p>
                <p className={DS.stat.sub}>남은 할당</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '활성 API 키',     value: `${keys.filter(k => k.is_active).length}개`,  icon: Key,          color: 'text-[var(--color-brand-mid)]',   border: 'border-l-[var(--color-brand-mid)]' },
            { label: '등록 Webhook',    value: '1개',                                          icon: Webhook,      color: 'text-purple-600',  border: 'border-l-purple-400' },
            { label: '이번달 API 호출', value: '124,840',                                      icon: Activity,     color: 'text-[var(--color-positive)]', border: 'border-l-emerald-400' },
            { label: '성공률',          value: '99.8%',                                        icon: CheckCircle2, color: 'text-emerald-600',   border: 'border-l-emerald-400' },
          ].map(s => (
            <div key={s.label} className={DS.stat.card + ` border-l-4 ${s.border}`}>
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <p className={DS.stat.value}>{s.value}</p>
              <p className={DS.stat.sub}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className={DS.tabs.list}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 ${activeTab === tab ? DS.tabs.active : DS.tabs.trigger}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab: API 키 */}
        {activeTab === 'API 키' && (
          <div className="space-y-4">
            {/* Create new key */}
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <p className={DS.text.cardSubtitle + " mb-1"}>새 API 키 발급</p>
              <p className={DS.text.captionLight + " mb-4"}>API 키는 한 번만 표시됩니다. 안전한 곳에 보관하세요.</p>
              <div className="flex gap-2">
                <input
                  type="text" placeholder="키 이름 (예: 프로덕션, 스테이징)"
                  value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createKey()}
                  className={DS.input.base + " max-w-xs"}
                />
                <button
                  onClick={createKey} disabled={!newKeyName.trim() || creating}
                  className={DS.button.primary + " disabled:opacity-50"}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {creating ? '생성중...' : '발급'}
                </button>
              </div>
            </div>

            {/* Key table */}
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {['키 이름', '키 (masked)', '생성일', '마지막 사용', '상태', '삭제'].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map(k => (
                    <tr key={k.id} className={DS.table.row + (!k.is_active ? ' opacity-40' : '')}>
                      <td className={DS.table.cell + " font-semibold"}>{k.name}</td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-2">
                          <code className="text-[0.8125rem] font-mono text-[var(--color-brand-mid)] bg-[var(--color-surface-sunken)] px-2 py-1 rounded border border-[var(--color-border-subtle)]">
                            {revealedKey === k.id ? k.key : '••••••••••••••••'}
                          </code>
                          <button onClick={() => setRevealedKey(p => p === k.id ? null : k.id)} className={DS.button.icon}>
                            {revealedKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => copyKey(k.key)} className={DS.button.icon}>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>{k.created_at}</td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>{k.last_used_at ?? '미사용'}</td>
                      <td className={DS.table.cell}>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold border ${
                          k.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>{k.is_active ? '활성' : '비활성'}</span>
                      </td>
                      <td className={DS.table.cell}>
                        {k.is_active && (
                          <button onClick={() => revokeKey(k.id)} className={DS.button.icon + " hover:!text-[var(--color-danger)] hover:!bg-red-50"}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Webhook */}
        {activeTab === 'Webhook' && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge + " space-y-5"}>
            <div>
              <p className={DS.text.cardSubtitle + " mb-1"}>Endpoint URL</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Globe className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                  <input
                    type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                    className={DS.input.base}
                    placeholder="https://your-app.com/webhook"
                  />
                </div>
                <button className={DS.button.secondary}>
                  <RefreshCw className="w-3.5 h-3.5" /> 테스트
                </button>
              </div>
            </div>

            <div>
              <p className={DS.text.cardSubtitle + " mb-3"}>구독할 이벤트</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox" checked={selectedEvents.includes(ev)} onChange={() => toggleEvent(ev)}
                      className="accent-[var(--color-brand-mid)]"
                    />
                    <span className={DS.text.caption + " font-mono group-hover:text-[var(--color-text-primary)] transition-colors"}>{ev}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className={DS.button.primary + " w-full justify-center"}>
              Webhook 저장
            </button>
          </div>
        )}

        {/* Tab: API 문서 */}
        {activeTab === 'API 문서' && (
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: 'API 레퍼런스',  desc: '전체 엔드포인트 목록과 파라미터', icon: BookOpen, href: '/developer/api-reference', accent: 'border-[var(--color-brand-bright)]' },
              { title: 'Quick Start',   desc: '첫 API 호출까지 5분 가이드',      icon: Key,      href: '/developer/docs',          accent: 'border-amber-200' },
              { title: 'Webhook 가이드', desc: '이벤트 수신 및 서명 검증',        icon: Webhook,  href: '/developer/webhooks',      accent: 'border-purple-200' },
            ].map(doc => (
              <a key={doc.href} href={doc.href} className={DS.card.interactive + " " + DS.card.padding + " block !border-l-4 " + doc.accent}>
                <doc.icon className="w-5 h-5 text-[var(--color-brand-mid)] mb-3" />
                <p className={DS.text.cardSubtitle + " mb-1"}>{doc.title}</p>
                <p className={DS.text.captionLight}>{doc.desc}</p>
              </a>
            ))}
          </div>
        )}

        {/* Tab: 사용량 */}
        {activeTab === '사용량' && (
          <div className="space-y-4">
            {/* Usage bar */}
            <div className={DS.card.elevated + " " + DS.card.padding}>
              <div className="flex items-center justify-between mb-3">
                <p className={DS.text.cardSubtitle}>이번달 API 사용량</p>
                <span className={DS.text.caption}>Pro Plan · 월 1,000,000건</span>
              </div>
              <div className="h-2 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[var(--color-brand-mid)] rounded-full transition-all" style={{ width: `${usedPct}%` }} />
              </div>
              <div className="flex justify-between">
                <span className={DS.text.captionLight}>{totalCalls.toLocaleString()} 사용</span>
                <span className={DS.text.captionLight}>{usedPct}% 사용</span>
                <span className={DS.text.captionLight}>{remaining.toLocaleString()} 남음</span>
              </div>
            </div>

            {/* Line chart: last 30 days */}
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-[var(--color-brand-mid)]" />
                <p className={DS.text.cardSubtitle}>API 호출 현황 (최근 30일)</p>
              </div>
              <div className="relative h-36">
                <svg viewBox={`0 0 ${USAGE_DATA.length * 16} 120`} className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand-mid)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--color-brand-mid)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d={`M0,120 ${USAGE_DATA.map((v, i) => `L${i * 16},${120 - (v / maxUsage) * 110}`).join(' ')} L${(USAGE_DATA.length - 1) * 16},120 Z`}
                    fill="url(#lineGrad)"
                  />
                  {/* Line */}
                  <polyline
                    points={USAGE_DATA.map((v, i) => `${i * 16},${120 - (v / maxUsage) * 110}`).join(' ')}
                    fill="none" stroke="var(--color-brand-mid)" strokeWidth="2" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex justify-between mt-2">
                <span className={DS.text.micro}>30일 전</span>
                <span className={DS.text.micro}>오늘</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
