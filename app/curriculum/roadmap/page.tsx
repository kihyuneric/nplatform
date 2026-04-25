'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Map, Clock, ChevronRight, ArrowRight, Zap,
  Sprout, Leaf, TreePine, Mountain, Crown,
  Home as HomeIcon, TrendingUp, Gavel, Landmark, FileText,
  BarChart3, Users, BookOpen,
} from 'lucide-react'
import OntologyGraph from '@/components/ontology-graph'

// ── 타입 ──────────────────────────────────────────
interface Domain {
  domain_id: number
  name: string
  description: string
  color: string
}

interface Concept {
  concept_id: number
  name: string
  level: string
  domain_id: number
  description: string
  difficulty: number
  estimated_minutes: number
  atomic_count?: number
}

interface ImportanceItem {
  concept_id: number
  expert_count: number
  avg_relevance: number
}

// ── 상수 ──────────────────────────────────────────
const LEVELS = [
  { key: '왕초보', label: '왕초보', description: '부동산의 기본 개념부터', icon: Sprout, color: 'var(--color-text-primary)', bgColor: 'bg-stone-100', textColor: 'text-stone-900', borderColor: 'border-stone-300' },
  { key: '초보', label: '초보', description: '본격적인 투자 준비', icon: Leaf, color: 'var(--color-text-primary)', bgColor: 'bg-stone-100', textColor: 'text-stone-900', borderColor: 'border-stone-300' },
  { key: '중급', label: '중급', description: '실전 투자 기법 습득', icon: TreePine, color: 'var(--color-text-primary)', bgColor: 'bg-stone-100', textColor: 'text-stone-900', borderColor: 'border-stone-300' },
  { key: '고급', label: '고급', description: '고급 전략과 리스크 관리', icon: Mountain, color: 'var(--color-text-primary)', bgColor: 'bg-stone-100', textColor: 'text-stone-900', borderColor: 'border-stone-300' },
  { key: '전문가', label: '전문가', description: '전문가 수준의 포트폴리오', icon: Crown, color: 'var(--color-danger)', bgColor: 'bg-stone-100', textColor: 'text-stone-900', borderColor: 'border-stone-300' },
]

const DOMAIN_ICONS: Record<string, typeof HomeIcon> = {
  '내집마련': HomeIcon,
  '부동산 투자': TrendingUp,
  '경매': Gavel,
  '공매': Landmark,
  '부실채권(NPL)': FileText,
}

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  '내집마련': '처음 내 집을 마련하는 분을 위한 기초부터 실전까지',
  '부동산 투자': '자산 증식을 위한 투자 전략과 분석 기법',
  '경매': '법원경매를 통한 부동산 투자 전 과정',
  '공매': '한국자산관리공사(캠코) 공매 투자 가이드',
  '부실채권(NPL)': '부실채권 매입을 통한 고수익 투자 전략',
}

export default function RoadmapPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-300" />
      </div>
    }>
      <RoadmapPage />
    </Suspense>
  )
}

function RoadmapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [domains, setDomains] = useState<Domain[]>([])
  const [allConcepts, setAllConcepts] = useState<Concept[]>([])
  const [importanceMap, setImportanceMap] = useState<Record<number, ImportanceItem>>({})
  const [loading, setLoading] = useState(true)

  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string>('왕초보')

  // 레벨 overview (그래프 데이터)
  const [levelOverview, setLevelOverview] = useState<any>(null)

  // URL 파라미터에서 도메인 초기값 설정
  useEffect(() => {
    const domainParam = searchParams?.get('domain')
    if (domainParam && domains.length > 0) {
      const found = domains.find(d => d.name === domainParam || d.domain_id === Number(domainParam))
      if (found) setSelectedDomainId(found.domain_id)
    }
  }, [searchParams, domains])

  // 초기 데이터 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/ontology/domains').then(r => r.json()),
      fetch('/api/ontology/concepts').then(r => r.json()),
    ]).then(([domainRes, conceptRes]) => {
      const doms = domainRes.domains || []
      setDomains(doms)
      setAllConcepts(conceptRes.concepts || [])
      // 기본 선택: 첫 번째 도메인
      if (doms.length > 0 && !selectedDomainId) {
        setSelectedDomainId(doms[0].domain_id)
      }
      setLoading(false)
    })
  }, [])

  // importance 로드 (레벨 변경 시)
  useEffect(() => {
    if (loading) return
    fetch(`/api/ontology/importance?level=${selectedLevel}`)
      .then(r => r.json())
      .then(data => {
        const impRecord: Record<number, ImportanceItem> = {}
        for (const imp of (data.importance || [])) {
          impRecord[imp.concept_id] = imp
        }
        setImportanceMap(impRecord)
      })
  }, [selectedLevel, loading])

  // 레벨 overview 로드 (그래프 데이터)
  useEffect(() => {
    if (loading) return
    fetch(`/api/ontology/level-overview?level=${selectedLevel}`)
      .then(r => r.json())
      .then(data => setLevelOverview(data))
      .catch(() => setLevelOverview(null))
  }, [selectedLevel, loading])

  // 선택된 도메인 정보
  const selectedDomain = useMemo(() =>
    domains.find(d => d.domain_id === selectedDomainId),
    [domains, selectedDomainId]
  )

  // 도메인×레벨별 개념 수 매트릭스
  const domainLevelMatrix = useMemo(() => {
    const matrix: Record<number, Record<string, number>> = {}
    for (const d of domains) {
      matrix[d.domain_id] = {}
      for (const l of LEVELS) {
        matrix[d.domain_id][l.key] = allConcepts.filter(
          c => c.domain_id === d.domain_id && c.level === l.key
        ).length
      }
    }
    return matrix
  }, [domains, allConcepts])

  // 선택된 도메인+레벨의 개념 목록
  const filteredConcepts = useMemo(() => {
    if (!selectedDomainId) return []
    return allConcepts
      .filter(c => c.domain_id === selectedDomainId && c.level === selectedLevel)
      .sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1))
  }, [allConcepts, selectedDomainId, selectedLevel])

  // 도메인 내 레벨별 통계
  const domainLevelStats = useMemo(() => {
    if (!selectedDomainId) return []
    return LEVELS.map(l => {
      const concepts = allConcepts.filter(c => c.domain_id === selectedDomainId && c.level === l.key)
      return {
        level: l.key,
        count: concepts.length,
        hours: Math.round(concepts.reduce((s, c) => s + (c.estimated_minutes || 30), 0) / 60 * 10) / 10,
        totalMinutes: concepts.reduce((s, c) => s + (c.estimated_minutes || 30), 0),
      }
    })
  }, [allConcepts, selectedDomainId])

  // 그래프 노드/엣지 (현재 도메인 필터)
  const graphData = useMemo(() => {
    if (!levelOverview || !selectedDomainId) return { nodes: [], edges: [] }
    const domainConceptIds = new Set(
      allConcepts
        .filter(c => c.domain_id === selectedDomainId && c.level === selectedLevel)
        .map(c => c.concept_id)
    )
    const nodes = (levelOverview.graph_nodes || []).filter((n: any) => domainConceptIds.has(n.id))
    const nodeIds = new Set(nodes.map((n: any) => n.id))
    const edges = (levelOverview.graph_edges || []).filter(
      (e: any) => nodeIds.has(e.source) && nodeIds.has(e.target)
    )
    return { nodes, edges }
  }, [levelOverview, selectedDomainId, selectedLevel, allConcepts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-300" />
          <span className="text-sm text-gray-400">로드맵 데이터 로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-stone-100 rounded-full text-stone-900 text-sm font-medium mb-3">
          <Map className="w-4 h-4" />
          도메인 × 레벨 학습 경로
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">나에게 맞는 학습 경로 찾기</h1>
        <p className="text-gray-500">관심 분야를 선택하고, 레벨별로 체계적으로 학습하세요</p>
      </div>

      {/* ── 도메인 선택 ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {domains.map(d => {
          const Icon = DOMAIN_ICONS[d.name] || BookOpen
          const isSelected = selectedDomainId === d.domain_id
          const totalConcepts = allConcepts.filter(c => c.domain_id === d.domain_id).length
          return (
            <button
              key={d.domain_id}
              onClick={() => setSelectedDomainId(d.domain_id)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-stone-300 bg-stone-100 shadow-lg shadow-purple-100'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isSelected ? d.color : '#F3F4F6', color: isSelected ? 'white' : '#6B7280' }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-semibold ${isSelected ? 'text-stone-900' : 'text-gray-700'}`}>
                {d.name}
              </span>
              <span className="text-xs text-gray-400">{totalConcepts}개 개념</span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-stone-100 rounded-full flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 도메인 설명 */}
      {selectedDomain && (
        <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: selectedDomain.color }}>
            {(() => { const DIcon = DOMAIN_ICONS[selectedDomain.name] || BookOpen; return <DIcon className="w-6 h-6" /> })()}
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{selectedDomain.name} 학습 경로</h2>
            <p className="text-sm text-gray-500">{DOMAIN_DESCRIPTIONS[selectedDomain.name] || selectedDomain.description}</p>
          </div>
          <div className="ml-auto text-right hidden md:block">
            <div className="text-2xl font-bold text-stone-900">
              {allConcepts.filter(c => c.domain_id === selectedDomainId).length}
            </div>
            <div className="text-xs text-gray-400">총 개념 수</div>
          </div>
        </div>
      )}

      {/* ── 레벨 타임라인 ────────────────────────── */}
      {selectedDomainId && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">레벨별 학습 경로</h3>
          <div className="relative flex items-start justify-between px-2 md:px-8">
            {/* Progress line */}
            <div className="absolute top-7 left-12 right-12 h-1 bg-gray-200 hidden md:block" />
            <div
              className="absolute top-7 left-12 h-1 transition-all duration-500 hidden md:block"
              style={{
                width: `${LEVELS.findIndex(l => l.key === selectedLevel) * 25}%`,
                backgroundColor: selectedDomain?.color || '#051C2C',
              }}
            />

            {LEVELS.map((level, i) => {
              const stat = domainLevelStats[i]
              const isSelected = selectedLevel === level.key
              const isPast = LEVELS.findIndex(l => l.key === selectedLevel) >= i
              const Icon = level.icon
              const hasContent = stat && stat.count > 0

              return (
                <button
                  key={level.key}
                  onClick={() => setSelectedLevel(level.key)}
                  className="relative z-10 flex flex-col items-center gap-1.5 group"
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all ${
                    isSelected
                      ? 'text-white shadow-lg scale-110'
                      : isPast
                        ? 'bg-opacity-20 border-current'
                        : 'bg-white border-gray-200 text-gray-300'
                  }`}
                    style={
                      isSelected
                        ? { backgroundColor: level.color, borderColor: level.color }
                        : isPast
                          ? { borderColor: level.color, color: level.color, backgroundColor: `${level.color}20` }
                          : {}
                    }
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                    {level.label}
                  </span>
                  {hasContent ? (
                    <span className="text-xs text-gray-400">
                      {stat.count}개 · {stat.hours}h
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">준비중</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 레벨 설명 */}
          <div className="text-center mt-4">
            <span className="text-sm text-gray-500">
              {LEVELS.find(l => l.key === selectedLevel)?.description}
            </span>
          </div>
        </div>
      )}

      {/* ── 선택된 도메인×레벨의 개념 목록 ──────── */}
      {selectedDomainId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedDomain?.name} · {selectedLevel}
              <span className="text-gray-400 font-normal ml-2">
                {filteredConcepts.length}개 개념
              </span>
            </h2>
            {filteredConcepts.length > 0 && (
              <span className="text-xs text-gray-400">
                총 {Math.round(filteredConcepts.reduce((s, c) => s + (c.estimated_minutes || 30), 0) / 60 * 10) / 10}시간
              </span>
            )}
          </div>

          {filteredConcepts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 text-sm">이 도메인의 {selectedLevel} 레벨 콘텐츠가 아직 준비되지 않았습니다.</p>
              <p className="text-gray-300 text-xs mt-1">대본을 업로드하면 자동으로 개념이 생성됩니다.</p>
              <Link href="/curriculum/upload"
                className="inline-flex items-center gap-1 mt-4 text-sm text-stone-900 hover:text-stone-900">
                대본 분석하러 가기 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConcepts.map((concept, idx) => {
                const imp = importanceMap[concept.concept_id]
                const expertCount = imp?.expert_count || 0
                const avgRelevance = imp?.avg_relevance || 0
                const levelInfo = LEVELS.find(l => l.key === selectedLevel)

                return (
                  <div
                    key={concept.concept_id}
                    className="bg-white rounded-xl border hover:shadow-md transition-all group cursor-pointer"
                    onClick={() => router.push(`/curriculum/concept/${concept.concept_id}`)}
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* 순서 번호 */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: levelInfo?.color || '#051C2C' }}
                      >
                        {idx + 1}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-stone-900 transition-colors">
                          {concept.name}
                        </h3>
                        {concept.description && (
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{concept.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {concept.estimated_minutes || 30}분
                          </span>
                          <span>난이도 {'★'.repeat(concept.difficulty || 1)}{'☆'.repeat(5 - (concept.difficulty || 1))}</span>
                          {expertCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> 전문가 {expertCount}명
                            </span>
                          )}
                          {(concept.atomic_count || 0) > 0 && (
                            <span className="flex items-center gap-1 text-stone-900">
                              <Zap className="w-3 h-3" /> {concept.atomic_count}캡슐
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 관련도 */}
                      {avgRelevance > 0 && (
                        <div className="hidden md:flex flex-col items-center gap-1">
                          <div className="w-12 h-12 rounded-full border-[3px] flex items-center justify-center"
                            style={{ borderColor: levelInfo?.color || '#051C2C' }}>
                            <span className="text-xs font-bold" style={{ color: levelInfo?.color || '#051C2C' }}>
                              {Math.round(avgRelevance * 100)}%
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">관련도</span>
                        </div>
                      )}

                      {/* 화살표 */}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-stone-900 transition-colors flex-shrink-0" />
                    </div>

                    {/* 다음 개념 연결선 */}
                    {idx < filteredConcepts.length - 1 && (
                      <div className="flex justify-center -mb-3 relative z-10">
                        <div className="w-px h-6 bg-gray-200" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 온톨로지 관계 그래프 ────────────────── */}
      {graphData.nodes.length > 0 && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-stone-900" />
            {selectedDomain?.name} · {selectedLevel} — 개념 관계 그래프
          </h3>
          <div className="border rounded-xl p-4 bg-gray-50">
            <OntologyGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              layout="tree"
            />
          </div>
        </div>
      )}

      {/* ── 전체 도메인×레벨 매트릭스 ──────────── */}
      <div className="bg-white rounded-2xl border p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Map className="w-4 h-4 text-stone-900" />
          전체 학습 매트릭스
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium">도메인</th>
              {LEVELS.map(l => (
                <th key={l.key} className="text-center py-2 px-2 text-gray-500 font-medium">{l.label}</th>
              ))}
              <th className="text-center py-2 pl-4 text-gray-500 font-medium">합계</th>
            </tr>
          </thead>
          <tbody>
            {domains.map(d => {
              const total = LEVELS.reduce((s, l) => s + (domainLevelMatrix[d.domain_id]?.[l.key] || 0), 0)
              return (
                <tr key={d.domain_id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-medium text-gray-700">{d.name}</span>
                    </div>
                  </td>
                  {LEVELS.map(l => {
                    const count = domainLevelMatrix[d.domain_id]?.[l.key] || 0
                    const isCurrentCell = d.domain_id === selectedDomainId && l.key === selectedLevel
                    return (
                      <td key={l.key} className="text-center py-2.5 px-2">
                        <button
                          onClick={() => { setSelectedDomainId(d.domain_id); setSelectedLevel(l.key) }}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            isCurrentCell
                              ? 'bg-stone-100 text-white shadow-sm'
                              : count > 0
                                ? 'bg-gray-100 text-gray-700 hover:bg-stone-100 hover:text-stone-900'
                                : 'text-gray-300'
                          }`}
                        >
                          {count || '·'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="text-center py-2.5 pl-4">
                    <span className="font-bold text-gray-700">{total}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2">
              <td className="py-2.5 pr-4 font-semibold text-gray-700">합계</td>
              {LEVELS.map(l => {
                const total = domains.reduce((s, d) => s + (domainLevelMatrix[d.domain_id]?.[l.key] || 0), 0)
                return (
                  <td key={l.key} className="text-center py-2.5 px-2 font-bold text-gray-700">{total}</td>
                )
              })}
              <td className="text-center py-2.5 pl-4 font-bold text-stone-900">{allConcepts.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
