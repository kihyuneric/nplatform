"use client"

/**
 * PropertyCollateralAnalysis
 *
 * 부동산 담보 가치 분석 컴포넌트 (슬림 버전 — 리포트 섹션 인라인 스타일)
 *
 * 동작 순서:
 *   1. 마운트 즉시 → 결정적(Deterministic) 분석 표시 (API 키 불필요)
 *   2. Claude API 키 연동 후 → "AI 실시간 분석" 버튼으로 스트리밍 분석으로 교체
 *
 * "주소는 보여주지마" 정책:
 *   - 주소는 API 전달 / deterministic 생성에만 사용
 *   - UI에 절대 노출하지 않음
 */

import { useEffect, useRef, useState } from "react"
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Code2 } from "lucide-react"
import {
  buildDeterministicCollateral,
  buildCollateralAnalysisPrompt,
  COLLATERAL_SYSTEM_PROMPT,
} from "@/lib/analysis/collateral-analysis"

// ── 팔레트 ──────────────────────────────────────────────────────────────────
const NAVY    = '#1B3A5C'
const EMERALD = '#10B981'
const BORDER  = '#E2E8F0'
const BG_SOFT = '#F8FAFC'
const BG_HEAD = '#F1F5F9'
const TEXT_PRI = '#0F172A'
const TEXT_SEC = '#64748B'
const TEXT_MUT = '#94A3B8'

// ── 마크다운 → JSX 경량 렌더러 ──────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  const isTableRow = (l: string) => l.trim().startsWith('|')
  const isTableSep = (l: string) => /^\|[\s\-:|]+\|/.test(l.trim())

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { nodes.push(<div key={i} style={{ height: 4 }} />); i++; continue }

    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={i} style={{
          fontSize: 11, fontWeight: 700, color: NAVY,
          margin: '14px 0 4px', paddingBottom: 4,
          borderBottom: `1px solid ${NAVY}30`,
          letterSpacing: '-0.01em', textTransform: 'uppercase',
        }}>
          {line.slice(3)}
        </h3>
      ); i++; continue
    }

    if (isTableRow(line)) {
      const tableLines: string[] = []
      while (i < lines.length && isTableRow(lines[i])) { tableLines.push(lines[i]); i++ }
      const rows = tableLines.filter(l => !isTableSep(l))
      const parseRow = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
      const [header, ...dataRows] = rows
      if (!header) continue
      const headers = parseRow(header)
      nodes.push(
        <div key={`tbl-${i}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: NAVY }}>
                {headers.map((h, j) => (
                  <th key={j} style={{ padding: '5px 8px', color: '#fff', fontWeight: 700, textAlign: j === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = parseRow(row)
                return (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : BG_SOFT }}>
                    {cells.map((c, ci) => (
                      <td key={ci} style={{ padding: '5px 8px', color: ci === 0 ? TEXT_PRI : TEXT_SEC, fontWeight: ci === 0 ? 600 : 400, borderBottom: `1px solid ${BORDER}`, textAlign: ci === 0 ? 'left' : 'center' }}>
                        {renderInline(c)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (/^[-*]\s/.test(line)) {
      nodes.push(
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 3, paddingLeft: 2 }}>
          <span style={{ color: EMERALD, fontWeight: 900, marginTop: 1, flexShrink: 0, fontSize: 10 }}>·</span>
          <span style={{ fontSize: 11, color: TEXT_PRI, lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span>
        </div>
      ); i++; continue
    }

    if (/^\*\*한 줄 결론\*\*/.test(line)) {
      const content = line.replace(/^\*\*한 줄 결론\*\*:\s*/, '')
      nodes.push(
        <div key={i} style={{ margin: '10px 0 2px', padding: '8px 12px', background: `${NAVY}08`, borderLeft: `2px solid ${NAVY}`, borderRadius: '0 4px 4px 0' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>한 줄 결론</span>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: TEXT_PRI, lineHeight: 1.5 }}>{renderInline(content)}</p>
        </div>
      ); i++; continue
    }

    nodes.push(
      <p key={i} style={{ fontSize: 11, color: TEXT_SEC, margin: '2px 0', lineHeight: 1.6 }}>{renderInline(line)}</p>
    ); i++
  }

  return nodes
}

function renderInline(text: string): React.ReactNode {
  if (!text.includes('**') && !text.includes('*')) return text
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} style={{ color: TEXT_PRI, fontWeight: 700 }}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>
        return part
      })}
    </>
  )
}

// ── 컴포넌트 ────────────────────────────────────────────────────────────────

interface PropertyCollateralAnalysisProps {
  /** 분석할 부동산 주소 (API·deterministic에만 사용 — UI 미노출) */
  address?: string
  assetTitle?: string
}

type Status = 'deterministic' | 'loading' | 'done' | 'error'

export function PropertyCollateralAnalysis({ address, assetTitle }: PropertyCollateralAnalysisProps) {
  const [text,       setText]       = useState('')
  const [status,     setStatus]     = useState<Status>('deterministic')
  const [collapsed,  setCollapsed]  = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const liveCalledRef = useRef(false)

  // ── 마운트 시 즉시 결정적 분석 표시 ──────────────────────────────────────
  useEffect(() => {
    if (!address) return
    const det = buildDeterministicCollateral(address, assetTitle)
    setText(det)
    setStatus('deterministic')
  }, [address, assetTitle])

  // ── Claude API 실시간 스트리밍 ────────────────────────────────────────────
  const generateLive = async () => {
    if (!address) return
    liveCalledRef.current = true
    setStatus('loading')
    setText('')

    try {
      const res = await fetch('/api/v1/analysis/collateral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, assetTitle }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') { setStatus('done'); return }
          try {
            const parsed = JSON.parse(raw)
            if (parsed.text) setText(prev => prev + parsed.text)
            if (parsed.error) {
              const det = buildDeterministicCollateral(address, assetTitle)
              setText(det)
              setStatus('deterministic')
              await reader.cancel()
              return
            }
          } catch {/* JSON parse error */}
        }
      }
      setStatus('done')
    } catch {
      const det = buildDeterministicCollateral(address, assetTitle)
      setText(det)
      setStatus('deterministic')
    }
  }

  if (!address) return null

  const isDeterministic = status === 'deterministic'
  const isLive    = status === 'done'
  const isLoading = status === 'loading'

  const prompt = buildCollateralAnalysisPrompt(address, assetTitle)

  return (
    <div style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      marginTop: 16,
      overflow: 'hidden',
      background: '#fff',
    }}>

      {/* ── 헤더 (라이트 스타일 — 리포트 섹션 맞춤) ──────────────────── */}
      <div style={{
        background: BG_HEAD,
        borderBottom: `1px solid ${BORDER}`,
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={12} color={NAVY} />
          <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, letterSpacing: '-0.01em' }}>
            부동산 담보 가치 분석
          </span>
          {isDeterministic && (
            <span style={{
              fontSize: 9, color: TEXT_SEC, fontWeight: 600,
              background: '#E2E8F0', padding: '1px 6px',
              borderRadius: 99,
            }}>
              사전 분석
            </span>
          )}
          {(isLive || isLoading) && (
            <span style={{
              fontSize: 9, color: EMERALD, fontWeight: 600,
              background: `${EMERALD}18`, padding: '1px 6px',
              borderRadius: 99, border: `1px solid ${EMERALD}44`,
            }}>
              Claude AI
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* 프롬프트 보기 */}
          <button
            onClick={() => setShowPrompt(s => !s)}
            style={{
              background: 'transparent', border: `1px solid ${BORDER}`,
              borderRadius: 5, padding: '3px 8px',
              display: 'flex', alignItems: 'center', gap: 4,
              color: TEXT_MUT, fontSize: 10, cursor: 'pointer',
            }}
          >
            <Code2 size={9} />
            프롬프트
          </button>

          {/* AI 실시간 분석 */}
          {!isLoading && (
            <button
              onClick={generateLive}
              style={{
                background: 'transparent', border: `1px solid ${NAVY}44`,
                borderRadius: 5, padding: '3px 8px',
                display: 'flex', alignItems: 'center', gap: 4,
                color: NAVY, fontSize: 10, cursor: 'pointer', fontWeight: 600,
              }}
            >
              <RefreshCw size={9} />
              {isDeterministic ? 'AI 실시간 분석' : '재생성'}
            </button>
          )}

          {/* 접기/펼치기 */}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ background: 'transparent', border: 'none', color: TEXT_MUT, cursor: 'pointer', padding: '2px 4px' }}
          >
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {/* ── 프롬프트 보기 (토글) ──────────────────────────────────── */}
      {showPrompt && (
        <div style={{ background: '#0F172A', padding: '12px 16px' }}>
          <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            System Prompt
          </div>
          <pre style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.6, margin: '0 0 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {COLLATERAL_SYSTEM_PROMPT}
          </pre>
          <div style={{ fontSize: 9, color: '#475569', fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            User Prompt (주소 마스킹됨)
          </div>
          <pre style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {prompt.replace(address, '[REDACTED — 주소 비공개]')}
          </pre>
        </div>
      )}

      {/* ── 본문 ──────────────────────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '12px 16px' }}>

          {/* 로딩 */}
          {isLoading && !text && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: `2px solid ${EMERALD}`, borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 11, color: TEXT_MUT }}>Claude AI가 담보 가치를 분석 중입니다…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* 분석 텍스트 */}
          {text && (
            <div style={{ position: 'relative' }}>
              {renderMarkdown(text)}
              {isLoading && (
                <span style={{ display: 'inline-block', width: 2, height: 12, background: EMERALD, marginLeft: 2, animation: 'blink 0.8s step-end infinite' }} />
              )}
              <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
            </div>
          )}

          {/* 푸터 */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: TEXT_MUT }}>
              {isDeterministic
                ? '사전 분석 데이터 · "AI 실시간 분석" 클릭 시 Claude AI로 전환'
                : 'Claude AI 담보 분석 · 참고용 자료 (법적 효력 없음)'}
            </span>
            {isDeterministic && (
              <span style={{ fontSize: 9, color: TEXT_MUT }}>
                🔑 ANTHROPIC_API_KEY 연동 후 실시간 분석 자동 전환
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
