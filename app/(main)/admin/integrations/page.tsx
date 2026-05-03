'use client'
/**
 * 관리자 · 외부 연동 통합 대시보드
 *
 * 사용자 정책 (2026-05-03):
 *   - 모든 외부 API/서비스 연동을 lib/integrations/registry.ts SSoT 에서 관리
 *   - LIVE: ENV 등록 완료 → 즉시 동작
 *   - MOCK: ENV 미등록 시 mock 데이터 fallback
 *   - MISSING: ENV 미등록 + fallback 없음
 *   - PLANNED: UI 미구현 → 키 등록해도 효과 없음 (UI 개발 우선)
 *   - PARTIAL: 백엔드만 존재 (cron / admin / fetcher 만)
 */
import { useEffect, useState } from 'react'
import {
  CATEGORY_LABELS,
  INTEGRATIONS,
  type Integration,
  type IntegrationCategory,
  type IntegrationStatus,
  type OutputStatus,
} from '@/lib/integrations/registry'

interface ResolvedIntegration extends Integration {
  resolvedStatus: IntegrationStatus
  missingEnvVars: string[]
  isReady: boolean
}

interface ApiResponse {
  integrations: ResolvedIntegration[]
  stats: { total: number; live: number; mock: number; missing: number }
}

const c = {
  navy: '#1B3A5C', navyDark: '#051C2C', blue: '#2E75B6',
  emerald: '#10B981', amber: '#F59E0B', red: '#DC2626',
  bg: '#FFFFFF', bgSoft: '#F5F7FA', border: '#E5E8EC',
  text: '#1B3A5C', textSub: '#6B7280', textTertiary: '#9CA3AF',
}

const statusColor: Record<IntegrationStatus, string> = { LIVE: c.emerald, MOCK: c.amber, MISSING: c.red }
const statusLabel: Record<IntegrationStatus, string> = { LIVE: '✅ LIVE', MOCK: '⚠ MOCK', MISSING: '❌ MISSING' }

function outputBadge(s?: OutputStatus): { label: string; color: string; bg: string } {
  if (s === 'PLANNED') return { label: '⚠ UI 미구현', color: c.red, bg: '#FEF2F2' }
  if (s === 'PARTIAL') return { label: '🟡 백엔드만', color: c.amber, bg: '#FFFBEB' }
  return { label: '✅ UI 연결됨', color: c.emerald, bg: '#F0FDF4' }
}

export default function IntegrationsAdminPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [filter, setFilter] = useState<'ALL' | IntegrationStatus>('ALL')
  const [outputFilter, setOutputFilter] = useState<'ALL' | OutputStatus>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | 'ALL'>('ALL')

  useEffect(() => {
    fetch('/api/v1/admin/integrations')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({
        integrations: INTEGRATIONS.map(i => ({ ...i, resolvedStatus: i.status, missingEnvVars: i.envVars, isReady: false })),
        stats: { total: 0, live: 0, mock: 0, missing: 0 },
      }))
  }, [])

  if (!data) return <div style={{ padding: 24, color: c.textSub }}>로딩 중…</div>

  const filtered = data.integrations.filter(i => {
    if (filter !== 'ALL' && i.resolvedStatus !== filter) return false
    if (outputFilter !== 'ALL' && (i.outputStatus ?? 'CONNECTED') !== outputFilter) return false
    if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false
    return true
  })

  const grouped: Record<string, ResolvedIntegration[]> = {}
  filtered.forEach(i => { (grouped[i.category] ??= []).push(i) })

  // outputStatus 통계
  const outputStats = {
    connected: data.integrations.filter(i => (i.outputStatus ?? 'CONNECTED') === 'CONNECTED').length,
    partial: data.integrations.filter(i => i.outputStatus === 'PARTIAL').length,
    planned: data.integrations.filter(i => i.outputStatus === 'PLANNED').length,
  }

  return (
    <div style={{ background: c.bg, padding: '24px 32px', maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: c.textTertiary, letterSpacing: 1.5, marginBottom: 4 }}>
          ADMIN · INTEGRATIONS
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: c.navy, margin: 0 }}>
          외부 연동 통합 대시보드
        </h1>
        <p style={{ fontSize: 13, color: c.textSub, marginTop: 4, lineHeight: 1.6 }}>
          개발자는 ENV 변수 등록 시 자동으로 LIVE 전환. 단, <strong style={{ color: c.red }}>⚠ UI 미구현</strong> 항목은
          UI 개발이 선행되어야 효과가 있습니다 (등록해도 사용자가 보는 효과 없음).
        </p>
      </div>

      {/* 통계 — API 등록 + UI 연결 분리 표시 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, background: c.bgSoft, border: `1px solid ${c.border}`, borderTop: `3px solid ${c.navy}` }}>
          <div style={{ fontSize: 11, color: c.textSub, marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>API 등록 상태</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <Mini label="전체" value={data.stats.total} tint={c.navy} />
            <Mini label="LIVE" value={data.stats.live} tint={c.emerald} />
            <Mini label="MOCK" value={data.stats.mock} tint={c.amber} />
            <Mini label="MISSING" value={data.stats.missing} tint={c.red} />
          </div>
        </div>
        <div style={{ padding: 16, background: c.bgSoft, border: `1px solid ${c.border}`, borderTop: `3px solid ${c.blue}` }}>
          <div style={{ fontSize: 11, color: c.textSub, marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>UI 출력 연결</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <Mini label="✅ 연결됨" value={outputStats.connected} tint={c.emerald} />
            <Mini label="🟡 백엔드만" value={outputStats.partial} tint={c.amber} />
            <Mini label="⚠ UI 미구현" value={outputStats.planned} tint={c.red} />
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: c.textSub }}>API:</span>
        {(['ALL', 'LIVE', 'MOCK', 'MISSING'] as const).map(s => (
          <FilterButton key={s} active={filter === s} label={s === 'ALL' ? '전체' : s}
            onClick={() => setFilter(s)}
            tint={s === 'ALL' ? c.navy : s === 'LIVE' ? c.emerald : s === 'MOCK' ? c.amber : c.red} />
        ))}
        <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: c.textSub }}>UI:</span>
        {(['ALL', 'CONNECTED', 'PARTIAL', 'PLANNED'] as const).map(s => (
          <FilterButton key={s} active={outputFilter === s}
            label={s === 'ALL' ? '전체' : s === 'CONNECTED' ? '연결됨' : s === 'PARTIAL' ? '백엔드' : '미구현'}
            onClick={() => setOutputFilter(s)}
            tint={s === 'ALL' ? c.navy : s === 'CONNECTED' ? c.emerald : s === 'PARTIAL' ? c.amber : c.red} />
        ))}
        <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: c.textSub }}>카테고리:</span>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as IntegrationCategory | 'ALL')}
          style={{ padding: '6px 10px', fontSize: 12, border: `1px solid ${c.border}`, background: c.bg, color: c.text }}>
          <option value="ALL">전체</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: c.navy, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${c.border}` }}>
            {CATEGORY_LABELS[category as IntegrationCategory]} ({items.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((i, idx) => <IntegrationCard key={`${category}-${idx}`} integration={i} />)}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: c.textSub, fontSize: 13 }}>
          필터 조건에 맞는 연동이 없습니다.
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: c.textSub }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: tint }}>{value}</div>
    </div>
  )
}

function FilterButton({ active, label, onClick, tint }: { active: boolean; label: string; onClick: () => void; tint: string }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 12px', fontSize: 12, fontWeight: 600,
      background: active ? tint : c.bg, color: active ? c.bg : tint,
      border: `1px solid ${tint}`, cursor: 'pointer',
    }}>{label}</button>
  )
}

function IntegrationCard({ integration }: { integration: ResolvedIntegration }) {
  const ob = outputBadge(integration.outputStatus)
  const sc = statusColor[integration.resolvedStatus]
  return (
    <div style={{ padding: 16, background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${sc}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: c.navy, margin: 0 }}>
              {integration.name}
              {integration.priority && <span style={{ marginLeft: 8, fontSize: 10, color: c.textTertiary, fontWeight: 500 }}>우선 {integration.priority}순위</span>}
            </h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: sc + '15', color: sc, border: `1px solid ${sc}` }}>
              {statusLabel[integration.resolvedStatus]}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: ob.bg, color: ob.color, border: `1px solid ${ob.color}` }}>
              {ob.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: c.textSub, marginTop: 4, marginBottom: 0 }}>{integration.notes}</p>
          {integration.uiConsumer && (
            <p style={{ fontSize: 11, color: ob.color, marginTop: 4, marginBottom: 0, fontWeight: 500 }}>
              UI: {integration.uiConsumer}
            </p>
          )}
        </div>
        {integration.cost && <div style={{ fontSize: 11, color: c.textSub, fontFamily: 'tabular-nums', whiteSpace: 'nowrap' }}>💰 {integration.cost}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, fontSize: 12, marginTop: 12 }}>
        {integration.envVars.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.textSub, marginBottom: 4 }}>
              필수 ENV ({integration.missingEnvVars.length > 0 ? `${integration.missingEnvVars.length}개 미등록` : '모두 등록됨'})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {integration.envVars.map(v => (
                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: integration.missingEnvVars.includes(v) ? c.red : c.emerald }} />
                  <code style={{ color: c.navy, fontFamily: 'monospace' }}>{v}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {integration.primaryFiles.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.textSub, marginBottom: 4 }}>코드 사용처</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {integration.primaryFiles.map(f => <code key={f} style={{ fontSize: 10, color: c.navy, fontFamily: 'monospace' }}>{f}</code>)}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: c.textSub, marginBottom: 4 }}>링크</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {integration.docsUrl && <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: c.blue, textDecoration: 'underline' }}>📘 공급사 문서</a>}
            {integration.signupUrl && <a href={integration.signupUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: c.blue, textDecoration: 'underline' }}>🔑 가입 / API 키 발급</a>}
          </div>
        </div>
      </div>
    </div>
  )
}
