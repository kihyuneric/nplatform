'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, Loader2, CheckCircle2, XCircle,
  Filter, RefreshCw, Play, AlertCircle, BarChart2,
  ChevronDown, ChevronUp
} from 'lucide-react'
import Link from 'next/link'

interface ConceptItem {
  concept_id: number
  name: string
  level: string
  domain_name: string
  domain_id: number
  atomic_count: number
  has_capsules: boolean
}

interface BulkResult {
  concept_id: number
  concept_name: string
  status: 'success' | 'error'
  capsules_created?: number
  error?: string
}

interface DomainOption {
  domain_id: number
  domain_name: string
}

export default function BulkGeneratePage() {
  const router = useRouter()

  // Data
  const [concepts, setConcepts] = useState<ConceptItem[]>([])
  const [stats, setStats] = useState({
    total_concepts: 0,
    with_capsules: 0,
    without_capsules: 0,
    total_atomic_capsules: 0,
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [domainFilter, setDomainFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false)

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Generation
  const [generating, setGenerating] = useState(false)
  const [genResults, setGenResults] = useState<BulkResult[]>([])
  const [genMessage, setGenMessage] = useState('')
  const [maxConcepts, setMaxConcepts] = useState(5)
  const [forceRegenerate, setForceRegenerate] = useState(false)

  // UI
  const [showResults, setShowResults] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (domainFilter) params.set('domain_id', domainFilter)
      if (levelFilter) params.set('level', levelFilter)

      const res = await fetch(`/api/ontology/atomic-capsules/bulk-generate?${params}`)
      const data = await res.json()

      setConcepts(data.concepts || [])
      setStats({
        total_concepts: data.total_concepts || 0,
        with_capsules: data.with_capsules || 0,
        without_capsules: data.without_capsules || 0,
        total_atomic_capsules: data.total_atomic_capsules || 0,
      })
    } catch (err) {
      console.error('Failed to load concepts:', err)
    } finally {
      setLoading(false)
    }
  }, [domainFilter, levelFilter])

  useEffect(() => { loadData() }, [loadData])

  // Extract unique domains
  const domains: DomainOption[] = []
  const seenDomains = new Set<number>()
  for (const c of concepts) {
    if (c.domain_id && !seenDomains.has(c.domain_id)) {
      seenDomains.add(c.domain_id)
      domains.push({ domain_id: c.domain_id, domain_name: c.domain_name })
    }
  }

  // Extract unique levels
  const levels = [...new Set(concepts.map(c => c.level).filter(Boolean))].sort()

  // Filtered concepts
  const filtered = concepts.filter(c => {
    if (showOnlyEmpty && c.has_capsules) return false
    return true
  })

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllEmpty = () => {
    const emptyIds = filtered.filter(c => !c.has_capsules).map(c => c.concept_id)
    setSelected(new Set(emptyIds))
  }

  const selectAll = () => {
    setSelected(new Set(filtered.map(c => c.concept_id)))
  }

  const clearSelection = () => setSelected(new Set())

  // Generate
  const handleGenerate = async () => {
    if (selected.size === 0 && !domainFilter && !levelFilter) return

    setGenerating(true)
    setGenResults([])
    setGenMessage('')
    setShowResults(true)

    try {
      const body: any = {
        max_concepts: maxConcepts,
        force_regenerate: forceRegenerate,
      }

      if (selected.size > 0) {
        body.concept_ids = Array.from(selected)
      } else {
        if (domainFilter) body.domain_id = Number(domainFilter)
        if (levelFilter) body.level = levelFilter
      }

      const res = await fetch('/api/ontology/atomic-capsules/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')

      setGenResults(data.results || [])
      setGenMessage(data.message || '')

      // Reload data
      await loadData()
    } catch (err: any) {
      setGenMessage(`오류: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const completionPct = stats.total_concepts > 0
    ? Math.round((stats.with_capsules / stats.total_concepts) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Atomic 캡슐 벌크 생성
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">여러 개념의 Atomic 캡슐을 일괄 생성합니다</p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.total_concepts}</div>
            <div className="text-xs text-purple-500">전체 개념</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.with_capsules}</div>
            <div className="text-xs text-green-500">캡슐 있음</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.without_capsules}</div>
            <div className="text-xs text-amber-500">미생성</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total_atomic_capsules}</div>
            <div className="text-xs text-blue-500">총 캡슐 수</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>전체 생성 진행률</span>
            <span className="font-semibold text-purple-700">{completionPct}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />

          <select
            value={domainFilter}
            onChange={(e) => { setDomainFilter(e.target.value); setSelected(new Set()) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">모든 도메인</option>
            {domains.map(d => (
              <option key={d.domain_id} value={d.domain_id}>{d.domain_name}</option>
            ))}
          </select>

          <select
            value={levelFilter}
            onChange={(e) => { setLevelFilter(e.target.value); setSelected(new Set()) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">모든 레벨</option>
            {levels.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showOnlyEmpty}
              onChange={(e) => setShowOnlyEmpty(e.target.checked)}
              className="rounded text-purple-600"
            />
            미생성만 표시
          </label>

          <div className="flex-1" />

          <button
            onClick={loadData}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Selection controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-500">선택:</span>
          <button onClick={selectAllEmpty} className="px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">
            미생성 전체 선택
          </button>
          <button onClick={selectAll} className="px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
            전체 선택
          </button>
          <button onClick={clearSelection} className="px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
            선택 해제
          </button>
          <span className="text-purple-600 font-medium ml-2">{selected.size}개 선택됨</span>
        </div>

        {/* Generation controls */}
        <div className="flex items-center gap-3 flex-wrap border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">한 번에 최대:</label>
            <select
              value={maxConcepts}
              onChange={(e) => setMaxConcepts(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              {[1, 3, 5, 10, 20].map(n => (
                <option key={n} value={n}>{n}개</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              className="rounded text-red-500"
            />
            <span className={forceRegenerate ? 'text-red-600 font-medium' : ''}>
              기존 캡슐 재생성 (덮어쓰기)
            </span>
          </label>

          <div className="flex-1" />

          <button
            onClick={handleGenerate}
            disabled={generating || (selected.size === 0 && !domainFilter && !levelFilter)}
            className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {generating ? '생성 중...' : '벌크 생성 실행'}
          </button>
        </div>
      </div>

      {/* Generation Results */}
      {showResults && (genResults.length > 0 || genMessage) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-purple-500" />
              생성 결과
            </h3>
            <button onClick={() => setShowResults(false)} className="text-gray-400 hover:text-gray-600">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {genMessage && (
            <p className="text-sm text-gray-700 bg-purple-50 rounded-lg p-3">{genMessage}</p>
          )}

          {genResults.length > 0 && (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {genResults.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                  r.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {r.status === 'success'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  }
                  <span className="font-medium">{r.concept_name}</span>
                  {r.status === 'success' && (
                    <span className="text-green-600 ml-auto">{r.capsules_created}개 생성</span>
                  )}
                  {r.status === 'error' && (
                    <span className="text-red-500 ml-auto text-xs">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Concept List */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-sm text-gray-500">개념 목록 로딩 중...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_100px_80px_80px_60px] gap-2 px-4 py-2.5 bg-gray-50 text-xs font-medium text-gray-500 border-b">
            <div></div>
            <div>개념명</div>
            <div>도메인</div>
            <div>레벨</div>
            <div className="text-center">캡슐 수</div>
            <div className="text-center">상태</div>
          </div>

          {/* Rows */}
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                조건에 맞는 개념이 없습니다.
              </div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.concept_id}
                  onClick={() => toggleSelect(c.concept_id)}
                  className={`grid grid-cols-[40px_1fr_100px_80px_80px_60px] gap-2 px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                    selected.has(c.concept_id) ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selected.has(c.concept_id)}
                      onChange={() => toggleSelect(c.concept_id)}
                      className="rounded text-purple-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="font-medium text-gray-800 truncate">
                    <Link
                      href={`/curriculum/concept/${c.concept_id}`}
                      className="hover:text-purple-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.name}
                    </Link>
                  </div>
                  <div className="text-gray-500 truncate">{c.domain_name}</div>
                  <div>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      c.level === '초급' ? 'bg-emerald-100 text-emerald-700' :
                      c.level === '중급' ? 'bg-blue-100 text-blue-700' :
                      c.level === '고급' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {c.level || '-'}
                    </span>
                  </div>
                  <div className="text-center">
                    {c.atomic_count > 0 ? (
                      <span className="text-purple-600 font-medium">{c.atomic_count}</span>
                    ) : (
                      <span className="text-gray-300">0</span>
                    )}
                  </div>
                  <div className="text-center">
                    {c.has_capsules ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 inline-block" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 inline-block" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t text-xs text-gray-500">
            표시: {filtered.length}개 / 전체: {concepts.length}개
          </div>
        </div>
      )}

      {/* Generating overlay */}
      {generating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm mx-4 text-center space-y-4">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Atomic 캡슐 생성 중</h3>
              <p className="text-sm text-gray-500 mt-1">
                AI가 주제 분해 → 웹 조사 → 콘텐츠 합성 중입니다.<br />
                개념당 약 1~3분 소요됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center text-xs text-purple-600">
              <Zap className="w-3.5 h-3.5" />
              최대 {maxConcepts}개 개념을 순차 처리합니다
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
