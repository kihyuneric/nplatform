'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Webhook, BookOpen, Activity, Copy, Eye, EyeOff, Plus, Trash2, RefreshCw, Globe, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react'
import DS, { formatKRW } from '@/lib/design-system'
import { useAuth } from '@/components/auth/auth-provider'
import { toast } from 'sonner'

interface ApiKey {
  id: string
  name: string
  /** Display prefix, e.g. "npl_live_sk_a1b2..." — full key never stored after creation */
  key_prefix: string
  /** Full key is only available on the response immediately after creation */
  full_key?: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

const AVAILABLE_EVENTS = [
  'listing.published', 'listing.updated', 'listing.closed',
  'deal.created', 'deal.status_changed', 'deal.completed',
  'analysis.completed', 'payment.succeeded', 'payment.failed',
]

// Fallback usage data (last 30 days) — replaced with real data when API is available
const FALLBACK_usageData = [
  3200, 4100, 3800, 5200, 4700, 6100, 5500, 4900, 6800, 7200,
  6500, 7800, 8100, 6900, 7400, 8800, 9100, 7600, 8400, 9300,
  8700, 10200, 9600, 11100, 10400, 9800, 11800, 12100, 11400, 12480,
]

const TABS = ['API 키', 'Webhook', 'API 문서', '사용량'] as const
type Tab = typeof TABS[number]

// ─── Hook: fetch developer data ────────────────────────────
interface DeveloperProfile {
  name: string
  email: string
  company: string | null
  subscriptionTier: string
}

function useDeveloperData() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<DeveloperProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Try fetching from the dashboard API for extended info
      const res = await fetch('/api/v1/my/dashboard', {
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const json = await res.json()
        setProfile({
          name: json.data?.name ?? json.name ?? user.name ?? '개발자',
          email: json.data?.email ?? json.email ?? user.email ?? '',
          company: json.data?.company_name ?? json.company_name ?? user.company_name ?? null,
          subscriptionTier: json.data?.subscription_tier ?? json.subscription_tier ?? user.subscription_tier ?? 'Free',
        })
      } else {
        // API not available — use auth context user directly
        setProfile({
          name: user.name ?? '개발자',
          email: user.email ?? '',
          company: user.company_name ?? null,
          subscriptionTier: user.subscription_tier ?? 'Free',
        })
      }
    } catch {
      // Fallback to auth context
      setProfile({
        name: user.name ?? '개발자',
        email: user.email ?? '',
        company: user.company_name ?? null,
        subscriptionTier: user.subscription_tier ?? 'Free',
      })
    } finally {
      setLoading(false)
    }
  }, [user, authLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { profile, loading: loading || authLoading, user }
}

// ─── Page Component ──────────────────────────────────────────
export default function DeveloperPage() {
  const { profile, loading: profileLoading, user } = useDeveloperData()
  const [activeTab, setActiveTab] = useState<Tab>('API 키')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('https://myapp.example.com/webhook/npl')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['deal.created', 'listing.published'])
  const [copied, setCopied] = useState(false)

  // Usage chart data (dynamic)
  const [usageData, setUsageData] = useState<number[]>(FALLBACK_usageData)
  const [totalCalls, setTotalCalls] = useState(124840)
  const [usageLoading, setUsageLoading] = useState(true)

  // Load API usage data on mount
  useEffect(() => {
    if (!user) { setUsageLoading(false); return }
    fetch('/api/v1/my/api-usage')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.data?.daily && Array.isArray(json.data.daily) && json.data.daily.length > 0) {
          setUsageData(json.data.daily as number[])
        }
        if (typeof json?.data?.total === 'number') {
          setTotalCalls(json.data.total)
        }
      })
      .catch(() => { /* Keep fallback data */ })
      .finally(() => setUsageLoading(false))
  }, [user])

  // Load real API keys on mount
  useEffect(() => {
    if (!user) { setKeysLoading(false); return }
    fetch('/api/v1/api-keys')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(json => {
        setKeys(
          (json.data ?? []).map((k: Record<string, unknown>) => ({
            ...k,
            key_prefix: (k.key_prefix as string) ?? (k.key as string) ?? '',
          }))
        )
      })
      .catch(() => setKeys([]))
      .finally(() => setKeysLoading(false))
  }, [user])

  const copyKey = (k: string) => {
    navigator.clipboard.writeText(k)
    setCopied(true)
    toast.success('API 키가 클립보드에 복사되었습니다')
    setTimeout(() => setCopied(false), 1500)
  }

  const createKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message ?? 'API 키 생성에 실패했습니다.')
        return
      }
      const newKey: ApiKey = {
        ...(json.data as ApiKey),
        full_key: json.full_key ?? undefined,
      }
      setKeys(prev => [newKey, ...prev])
      setRevealedKey(newKey.id) // Show the newly generated key once
      setNewKeyName('')
      toast.success('새 API 키가 발급되었습니다. 이 키는 한 번만 표시됩니다.')
    } catch {
      toast.error('API 키 생성 중 오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id: string) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k))
    try {
      await fetch(`/api/v1/api-keys/${id}`, { method: 'PATCH' })
      toast.info('API 키가 비활성화되었습니다')
    } catch {
      // Revert on failure
      setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: true } : k))
      toast.error('비활성화에 실패했습니다.')
    }
  }

  const toggleEvent = (ev: string) =>
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])

  const remaining = 1000000 - totalCalls
  const usedPct = Math.round((totalCalls / 1000000) * 100)
  const maxUsage = usageData.length > 0 ? Math.max(...usageData) : 1

  if (profileLoading) {
    return (
      <div className={DS.page.wrapper}>
        <div className={DS.page.container + " " + DS.page.paddingTop}>
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-mid)]" />
            <span className="ml-3 text-[var(--color-text-muted)]">개발자 정보를 불러오는 중...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={DS.page.wrapper}>
        <div className={DS.page.container + " " + DS.page.paddingTop}>
          <div className="text-center py-24">
            <p className={DS.text.body}>로그인이 필요합니다.</p>
          </div>
        </div>
      </div>
    )
  }

  const displayName = profile?.name ?? '개발자'
  const displayEmail = profile?.email ?? ''
  const displayTier = profile?.subscriptionTier ?? 'Free'

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[0.6875rem] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[var(--color-brand-mid)] font-bold">Beta</span>
              </div>
              <h1 className={DS.header.title}>개발자 포털</h1>
              <p className={DS.header.subtitle}>
                {displayName}{displayEmail ? ` (${displayEmail})` : ''} · {displayTier} Plan
              </p>
              {profile?.company && (
                <p className={DS.text.captionLight + " mt-0.5"}>{profile.company}</p>
              )}
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
            {/* Info banner */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Info className="w-4 h-4 text-[var(--color-brand-mid)] mt-0.5 shrink-0" />
              <p className="text-[0.8125rem] text-[var(--color-brand-mid)]">
                API 키 관리 기능은 베타 단계입니다. 발급된 키는 현재 세션에서만 유효하며,
                정식 출시 시 서버에 안전하게 저장됩니다.
              </p>
            </div>

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
            {keysLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-[var(--color-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[0.8125rem]">API 키 목록을 불러오는 중...</span>
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-text-muted)] text-[0.8125rem]">
                발급된 API 키가 없습니다. 위 양식에서 새 키를 생성하세요.
              </div>
            ) : (
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
                            {revealedKey === k.id && k.full_key
                              ? k.full_key
                              : k.key_prefix || '••••••••••••••••'}
                          </code>
                          {k.full_key && (
                            <button onClick={() => setRevealedKey(p => p === k.id ? null : k.id)} className={DS.button.icon}>
                              {revealedKey === k.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => copyKey(revealedKey === k.id && k.full_key ? k.full_key : k.key_prefix)}
                            className={DS.button.icon}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>{k.created_at}</td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>{k.last_used_at ?? '미사용'}</td>
                      <td className={DS.table.cell}>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold border ${
                          k.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
                        }`}>{k.is_active ? '활성' : '비활성'}</span>
                      </td>
                      <td className={DS.table.cell}>
                        {k.is_active && (
                          <button onClick={() => revokeKey(k.id)} className={DS.button.icon + " hover:!text-[var(--color-danger)] hover:!bg-red-500/10"}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
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
              { title: 'Quick Start',   desc: '첫 API 호출까지 5분 가이드',      icon: Key,      href: '/developer/docs',          accent: 'border-amber-500/20' },
              { title: 'Webhook 가이드', desc: '이벤트 수신 및 서명 검증',        icon: Webhook,  href: '/developer/webhooks',      accent: 'border-purple-500/20' },
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
                <div className="flex items-center gap-2">
                  {usageLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-muted)]" />}
                  <span className={DS.text.caption}>{displayTier} Plan · 월 1,000,000건</span>
                </div>
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
                <svg viewBox={`0 0 ${usageData.length * 16} 120`} className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand-mid)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--color-brand-mid)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d={`M0,120 ${usageData.map((v, i) => `L${i * 16},${120 - (v / maxUsage) * 110}`).join(' ')} L${(usageData.length - 1) * 16},120 Z`}
                    fill="url(#lineGrad)"
                  />
                  {/* Line */}
                  <polyline
                    points={usageData.map((v, i) => `${i * 16},${120 - (v / maxUsage) * 110}`).join(' ')}
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
