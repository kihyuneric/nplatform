"use client"

/**
 * PropertyCollateralAnalysis
 *
 * 부동산 담보 가치 분석 컴포넌트.
 *
 * 동작 순서:
 *   1. 마운트 즉시 → 결정적(Deterministic) 분석 표시 (API 키 불필요)
 *   2. Claude API 키 연동 후 → 재생성 버튼 또는 자동으로 실시간 스트리밍 분석으로 교체
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
const BG_CARD = '#FFFFFF'
const BG_SOFT = '#F8FAFC'
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

    if (!line.trim()) { nodes.push(<div key={i} style={{ height: 6 }} />); i++; continue }

    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={i} style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '18px 0 6px', paddingBottom: 6, borderBottom: `2px solid ${NAVY}`, letterSpacing: '-0.01em' }}>
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
        <div key={`tbl-${i}`} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: NAVY }}>
                {headers.map((h, j) => (
                  <th key={j} style={{ padding: '7px 10px', color: '#fff', fontWeight: 700, textAlign: j === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = parseRow(row)
                return (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : BG_SOFT }}>
                    {cells.map((c, ci) => (
                      <td key={ci} style={{ padding: '6px 10px', color: ci === 0 ? TEXT_PRI : TEXT_SEC, fontWeight: ci === 0 ? 600 : 400, borderBottom: `1px solid ${BORDER}`, textAlign: ci === 0 ? 'left' : 'center' }}>
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
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4, paddingLeft: 4 }}>
          <span style={{ color: EMERALD, fontWeight: 900, marginTop: 1, flexShrink: 0 }}>·</span>
          <span style={{ fontSize: 12, color: TEXT_PRI, lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span>
        </div>
      ); i++; continue
    }

    if (/^\*\*한 줄 결론\*\*/.test(line)) {
      const content = line.replace(/^\*\*한 줄 결론\*\*:\s*/, '')
      nodes.push(
        <div key={i} style={{ margin: '14px 0 2px', padding: '10px 14px', background: `${NAVY}10`, borderLeft: `3px solid ${NAVY}`, borderRadius: '0 6px 6px 0' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>한 줄 결론</span>
          <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: TEXT_PRI, lineHeight: 1.5 }}>{renderInline(content)}</p>
        </div>
      ); i++; continue
    }

    nodes.push(
      <p key={i} style={{ fontSize: 12, color: TEXT_SEC, margin: '3px 0', lineHeight: 1.7 }}>{renderInline(line)}</p>
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
  const [text,           setText]           = useState('')
  const [status,         setStatus]         = useState<Status>('deterministic')
  const [collapsed,      setCollapsed]      = useState(false)
  const [showPrompt,     setShowPrompt]     = useState(false)
  const liveCalledRef = useRef(false)

  // ── 마운트 시 즉시 결정적 분석 표시 ──────────────────────────────────────
  useEffect(() => {
    if (!address) return
    const det = buildDeterministicCollateral(address, assetTitle)
    setText(det)
    setStatus('deterministic')
  }, [address, assetTitle])

  // ── Claude API 실시간 스트리밍 (API 키 연동 후 사용) ──────────────────────
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
              // API 키 없음 → 결정적 분석으로 복귀
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
      // 네트워크 실패 → 결정적 분석으로 복귀
      const det = buildDeterministicCollateral(address, assetTitle)
      setText(det)
      setStatus('deterministic')
    }
  }

  if (!address) return null

  const isDeterministic = status === 'deterministic'
  const isLive = status === 'done'
  const isLoading = status === 'loading'

  const prompt = buildCollateralAnalysisPrompt(address, assetTitle)

  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>

      {/* ── 헤더 ──────────────────────────────────────────────────── */}
      <div style={{ background: NAVY, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} color={EMERALD} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>부동산 담보 가치 분석</span>
          {isDeterministic && (
            <span style={{ fontSize: 10, color: EMERALD, fontWeight: 600, background: `${EMERALD}22`, padding: '2px 7px', borderRadius: 99, border: `1px solid ${EMERALD}44` }}>
              사전 분석
            </span>
          )}
          {(isLive || isLoading) && (
            <span style={{ fontSize: 10, color: EMERALD, fontWeight: 600, background: `${EMERALD}22`, padding: '2px 7px', borderRadius: 99, border: `1px solid ${EMERALD}44` }}>
              Claude AI
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 프롬프트 보기 */}
          <button
            onClick={() => setShowPrompt(s => !s)}
            style={{ background: 'transparent', border: `1px solid #ffffff33`, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#ffffffaa', fontSize: 11, cursor: 'pointer' }}
          >
            <Code2 size={11} />
            프롬프트
          </button>
          {/* Live AI 분석 (재생성) */}
          {!isLoading && (
            <button
              onClick={generateLive}
              style={{ background: 'transparent', border: `1px solid #ffffff44`, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#ffffffcc', fontSize: 11, cursor: 'pointer' }}
            >
              <RefreshCw size={11} />
              {isDeterministic ? 'AI 실시간 분석' : '재생성'}
            </button>
          )}
          {/* 접기/펼치기 */}
          <button onClick={() => setCollapsed(c => !c)} style={{ background: 'transparent', border: 'none', color: '#ffffffaa', cursor: 'pointer', padding: 4 }}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* ── 프롬프트 보기 (토글) ──────────────────────────────────── */}
      {showPrompt && (
        <div style={{ background: '#0F172A', padding: '14px 20px' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            System Prompt
          </div>
          <pre style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.7, margin: '0 0 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {COLLATERAL_SYSTEM_PROMPT}
          </pre>
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            User Prompt (주소 마스킹됨)
          </div>
          <pre style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {prompt.replace(address, '[REDACTED — 주소 비공개]')}
          </pre>
        </div>
      )}

      {/* ── 본문 ──────────────────────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '16px 20px' }}>
          {/* 로딩 */}
          {isLoading && !text && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${EMERALD}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, color: TEXT_MUT }}>Claude AI가 담보 가치를 분석 중입니다…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* 분석 텍스트 */}
          {text && (
            <div style={{ position: 'relative' }}>
              {renderMarkdown(text)}
              {isLoading && (
                <span style={{ display: 'inline-block', width: 2, height: 14, background: EMERALD, marginLeft: 2, animation: 'blink 0.8s step-end infinite' }} />
              )}
              <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
            </div>
          )}

          {/* 푸터 */}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={10} color={TEXT_MUT} />
              <span style={{ fontSize: 10, color: TEXT_MUT }}>
                {isDeterministic
                  ? '사전 분석 데이터 · "AI 실시간 분석" 클릭 시 Claude AI 실시간 분석으로 전환'
                  : 'Claude AI 담보 분석 · 참고용 자료 (법적 효력 없음)'}
              </span>
            </div>
            {isDeterministic && (
              <span style={{ fontSize: 10, color: `${EMERALD}`, fontWeight: 600 }}>
                🔑 ANTHROPIC_API_KEY 연동 후 실시간 분석 자동 전환
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
