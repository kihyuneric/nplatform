'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Clock, ArrowRight, Upload,
  Sprout, Leaf, TreePine, Mountain, Crown,
  GitBranch, BarChart3, Mail, Map, Search,
  Home as HomeIcon, TrendingUp, Gavel, Landmark, FileText,
  Users, Zap, ChevronRight, Star, Activity,
} from 'lucide-react'
import OntologyGraph, { OntologyGraphLegend } from '@/components/ontology-graph'
import OntologyHierarchy from '@/components/ontology-hierarchy'

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
  estimated_minutes: number
  atomic_count?: number
  mastered_count?: number
}

interface HierarchyDomain {
  domain_id: number
  domain_name: string
  color: string
  concept_count: number
}

interface HierarchyConcept {
  concept_id: number
  name: string
  level: string
  domain_id: number
  atomic_count?: number
  mastered_count?: number
}

interface AtomicNode {
  atomic_id: number
  concept_id: number
  topic: string
  order_in_concept: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_min: number
  status?: 'not_started' | 'in_progress' | 'completed' | 'mastered'
}

interface LevelOverview {
  total_concepts: number
  domain_distribution: Array<{ domain_name: string; concept_count: number; color: string }>
  total_hours: number
  expert_count: number
  avg_difficulty: number
  graph_nodes: Array<{ id: number; name: string; level: string }>
  graph_edges: Array<{ source: number; target: number; type: 'prerequisite' | 'partOf' | 'related' }>
}

const LEVELS = [
  { key: '왕초보', label: '왕초보', description: '부동산의 기본 개념부터', icon: Sprout, color: 'var(--color-text-primary)', bg: 'bg-stone-100', border: 'border-stone-300', badge: 'bg-stone-100 text-stone-900' },
  { key: '초보', label: '초보', description: '본격적인 투자 준비', icon: Leaf, color: 'var(--color-text-primary)', bg: 'bg-stone-100', border: 'border-stone-300', badge: 'bg-stone-100 text-stone-900' },
  { key: '중급', label: '중급', description: '실전 투자 기법 습득', icon: TreePine, color: 'var(--color-text-primary)', bg: 'bg-stone-100', border: 'border-stone-300', badge: 'bg-stone-100 text-stone-900' },
  { key: '고급', label: '고급', description: '고급 전략과 리스크 관리', icon: Mountain, color: 'var(--color-text-primary)', bg: 'bg-stone-100', border: 'border-stone-300', badge: 'bg-stone-100 text-stone-900' },
  { key: '전문가', label: '전문가', description: '전문가 수준의 포트폴리오', icon: Crown, color: 'var(--color-danger)', bg: 'bg-stone-100', border: 'border-stone-300', badge: 'bg-stone-100 text-stone-900' },
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

export default function CurriculumPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [allConcepts, setAllConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)

  // 선택된 레벨 및 온톨로지 대시보드
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [levelOverview, setLevelOverview] = useState<LevelOverview | null>(null)
  const [levelLoading, setLevelLoading] = useState(false)

  // 4단계 온톨로지 계층 데이터
  const [hierarchyDomains, setHierarchyDomains] = useState<HierarchyDomain[]>([])
  const [hierarchyConcepts, setHierarchyConcepts] = useState<HierarchyConcept[]>([])
  const [atomicCapsules, setAtomicCapsules] = useState<AtomicNode[]>([])
  const [showHierarchy, setShowHierarchy] = useState(false)

  // 학습 추천
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [recStats, setRecStats] = useState<any>(null)

  // Atomic 캡슐 검색
  const [capsuleSearch, setCapsuleSearch] = useState('')
  const [capsuleResults, setCapsuleResults] = useState<any[]>([])
  const [capsuleSearching, setCapsuleSearching] = useState(false)

  const handleCapsuleSearch = async () => {
    if (!capsuleSearch.trim()) return
    setCapsuleSearching(true)
    try {
      const res = await fetch(`/api/ontology/atomic-capsules/search?q=${encodeURIComponent(capsuleSearch.trim())}&limit=8`)
      const data = await res.json()
      setCapsuleResults(data.results || [])
    } catch {
      setCapsuleResults([])
    } finally {
      setCapsuleSearching(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/ontology/domains').then(r => r.json()),
      fetch('/api/ontology/concepts').then(r => r.json()),
    ]).then(([domainRes, conceptRes]) => {
      const doms = domainRes.domains || []
      const concepts = conceptRes.concepts || []
      setDomains(doms)
      setAllConcepts(concepts)

      // 계층 시각화용 데이터 변환
      setHierarchyDomains(doms.map((d: Domain) => ({
        domain_id: d.domain_id,
        domain_name: d.name,
        color: d.color,
        concept_count: concepts.filter((c: Concept) => c.domain_id === d.domain_id).length,
      })))
      setHierarchyConcepts(concepts.map((c: Concept) => ({
        concept_id: c.concept_id,
        name: c.name,
        level: c.level,
        domain_id: c.domain_id,
        atomic_count: c.atomic_count || 0,
        mastered_count: c.mastered_count || 0,
      })))

      setLoading(false)
    })

    // 학습 추천 로드
    fetch('/api/ontology/recommend?user_id=anonymous&limit=4')
      .then(r => r.json())
      .then(data => {
        if (data.recommendations) setRecommendations(data.recommendations)
        if (data.stats) setRecStats(data.stats)
      })
      .catch(() => {})
  }, [])

  // 레벨 선택 시 온톨로지 개요 로드
  const handleLevelSelect = async (levelKey: string) => {
    if (selectedLevel === levelKey) {
      setSelectedLevel(null)
      setLevelOverview(null)
      return
    }
    setSelectedLevel(levelKey)
    setLevelLoading(true)
    setLevelOverview(null)
    try {
      const res = await fetch(`/api/ontology/level-overview?level=${encodeURIComponent(levelKey)}`)
      const data = await res.json()
      if (!data.error) setLevelOverview(data)
    } catch {}
    setLevelLoading(false)
  }

  const totalHours = Math.round(
    allConcepts.reduce((s, c) => s + (c.estimated_minutes || 30), 0) / 60
  )

  const levelStats = LEVELS.map(l => {
    const lc = allConcepts.filter(c => c.level === l.key)
    return { ...l, count: lc.length, hours: Math.round(lc.reduce((s, c) => s + (c.estimated_minutes || 30), 0) / 60) }
  })

  const selectedLevelMeta = LEVELS.find(l => l.key === selectedLevel)
  const levelConcepts = selectedLevel ? allConcepts.filter(c => c.level === selectedLevel) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-300" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* ── Hero ──────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative px-8 py-14 md:py-20 text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur rounded-full text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            온톨로지 기반 AI 합성 교육
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            체계적 부동산 투자 학습
          </h1>
          <p className="text-stone-900 text-lg max-w-2xl mx-auto mb-6">
            NPLatform 부동산 전문가들의 강의를 AI가 종합 분석하여<br className="hidden md:block" />
            왕초보부터 전문가까지, 당신에게 맞는 학습 경로를 제공합니다
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">{allConcepts.length}</span>
              <span className="text-stone-900">개 개념</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">{totalHours}</span>
              <span className="text-stone-900">시간 콘텐츠</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{domains.length}</span>
              <span className="text-stone-900">개 도메인</span>
            </div>
            {recStats?.total_capsules > 0 && (
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">{recStats.total_capsules}</span>
                <span className="text-stone-900">Atomic 캡슐</span>
              </div>
            )}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/curriculum/roadmap"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-stone-900 rounded-xl font-semibold hover:shadow-lg transition-all">
              <Map className="w-5 h-5" />
              학습 로드맵 보기
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/curriculum/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20">
              <BarChart3 className="w-5 h-5" />
              대시보드
            </Link>
          </div>
        </div>
      </div>

      {/* ── 학습 추천 (Atomic 캡슐 기반) ── */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 rounded-2xl border border-stone-300/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Zap className="w-5 h-5 text-stone-900" />
              다음 학습 추천
            </h2>
            {recStats && (
              <span className="text-xs text-stone-900">
                전체 진도 {recStats.mastery_pct}% · 마스터 {recStats.mastered}개
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec: any, i: number) => (
              <Link
                key={rec.atomic_id || i}
                href={`/curriculum/study/${rec.atomic_id}`}
                className="bg-[var(--color-surface-elevated)] rounded-xl p-4 border border-[var(--color-border-subtle)] hover:border-stone-300/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100/10 flex items-center justify-center text-stone-900 font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-900 mb-0.5">{rec.reason}</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-stone-900 transition-colors truncate">
                      {rec.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-muted)]">
                      <span>{rec.concept_level}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {rec.estimated_min}분
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-stone-900 mt-1 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Atomic 캡슐 빠른 검색 ── */}
      <div className="bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border-subtle)] shadow-sm p-6">
        <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-gray-400" />
          학습 캡슐 빠른 검색
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={capsuleSearch}
            onChange={e => setCapsuleSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCapsuleSearch()}
            placeholder="원하는 주제를 검색하세요 (예: 등기, 전세, 세금, 대출)"
            className="flex-1 px-4 py-2.5 border border-[var(--color-border-subtle)] rounded-xl text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)]"
          />
          <button
            onClick={handleCapsuleSearch}
            disabled={capsuleSearching || !capsuleSearch.trim()}
            className="px-5 py-2.5 bg-stone-100 text-white text-sm font-medium rounded-xl hover:bg-stone-100 disabled:opacity-50 transition-colors"
          >
            {capsuleSearching ? '검색 중...' : '검색'}
          </button>
        </div>
        {capsuleResults.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {capsuleResults.map((r: any) => (
              <Link
                key={r.atomic_id}
                href={`/curriculum/study/${r.atomic_id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border-subtle)] hover:border-stone-300/50 hover:bg-stone-100/5 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-stone-100/10 text-stone-900 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-stone-900 truncate">{r.topic}</p>
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                    <span className="text-stone-900">{r.concept_name}</span>
                    <span>·</span>
                    <span>{r.concept_level}</span>
                    <span>·</span>
                    <span>{r.estimated_min}분</span>
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-stone-900 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── 5단계 레벨 (클릭 → 온톨로지 대시보드) ── */}
      <div className="bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border-subtle)] shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">5단계 학습 레벨</h2>
          <span className="text-xs text-[var(--color-text-muted)]">레벨을 클릭하면 온톨로지 분석 결과를 확인할 수 있습니다</span>
        </div>

        {/* Level Timeline */}
        <div className="relative flex items-start justify-between px-2 md:px-8 py-2">
          <div className="absolute top-9 left-12 right-12 h-1 bg-[var(--color-surface-overlay)] hidden md:block" />
          {levelStats.map((level) => {
            const Icon = level.icon
            const isSelected = selectedLevel === level.key
            return (
              <button
                key={level.key}
                onClick={() => handleLevelSelect(level.key)}
                className="relative z-10 flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all group-hover:scale-110 group-hover:shadow-lg ${isSelected ? 'scale-110 shadow-lg' : ''}`}
                  style={{
                    borderColor: level.color,
                    color: isSelected ? 'white' : level.color,
                    backgroundColor: isSelected ? level.color : `${level.color}15`,
                  }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-sm font-bold ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>{level.label}</span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {level.count}개 · {level.hours}h
                </span>
                {isSelected && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: level.color }} />
                )}
              </button>
            )
          })}
        </div>

        {/* 온톨로지 대시보드 패널 */}
        {selectedLevel && selectedLevelMeta && (
          <div className={`mt-6 rounded-xl border ${selectedLevelMeta.border} ${selectedLevelMeta.bg} p-5 space-y-5`}>
            <div className="flex items-center gap-2">
              <selectedLevelMeta.icon className="w-5 h-5" style={{ color: selectedLevelMeta.color }} />
              <h3 className="font-bold text-[var(--color-text-primary)]">{selectedLevel} 과정 — 온톨로지 분석</h3>
              <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedLevelMeta.badge}`}>
                {levelConcepts.length}개 개념
              </span>
            </div>

            {levelLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-500">
                <div className="animate-spin w-5 h-5 border-2 rounded-full border-gray-300"
                  style={{ borderTopColor: selectedLevelMeta.color }} />
                온톨로지 분석 데이터 로딩 중...
              </div>
            ) : levelOverview ? (
              <>
                {/* 통계 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--color-surface-overlay)] rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold" style={{ color: selectedLevelMeta.color }}>
                      {levelOverview.total_concepts}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">총 개념 수</div>
                  </div>
                  <div className="bg-[var(--color-surface-overlay)] rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-stone-900">
                      {levelOverview.total_hours}h
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">총 학습시간</div>
                  </div>
                  <div className="bg-[var(--color-surface-overlay)] rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-stone-900">
                      {levelOverview.expert_count}명
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">참여 전문가</div>
                  </div>
                  <div className="bg-[var(--color-surface-overlay)] rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-stone-900 flex items-center justify-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5"
                          fill={i < Math.round(levelOverview.avg_difficulty) ? '#051C2C' : 'none'}
                          stroke="#051C2C"
                        />
                      ))}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">평균 난이도</div>
                  </div>
                </div>

                {/* 도메인 분포 */}
                {levelOverview.domain_distribution.length > 0 && (
                  <div className="bg-[var(--color-surface-overlay)] rounded-xl p-4 shadow-sm">
                    <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-3 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" />
                      도메인별 개념 분포
                    </h4>
                    <div className="space-y-2">
                      {levelOverview.domain_distribution.map(d => {
                        const pct = Math.round((d.concept_count / (levelOverview.total_concepts || 1)) * 100)
                        return (
                          <div key={d.domain_name} className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-[var(--color-text-secondary)] truncate flex-shrink-0">{d.domain_name}</span>
                            <div className="flex-1 bg-[var(--color-surface-overlay)] rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: d.color || selectedLevelMeta.color }}
                              />
                            </div>
                            <span className="text-gray-500 w-10 text-right">{d.concept_count}개</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 개념 관계 그래프 */}
                {levelOverview.graph_nodes.length > 0 && (
                  <div className="bg-[var(--color-surface-overlay)] rounded-xl p-4 shadow-sm">
                    <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      개념 관계 그래프
                      <span className="ml-1 text-gray-400 font-normal">({levelOverview.graph_nodes.length}개 개념)</span>
                    </h4>
                    <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
                      <OntologyGraph
                        nodes={levelOverview.graph_nodes}
                        edges={levelOverview.graph_edges}
                        layout="tree"
                      />
                    </div>
                    <div className="mt-2">
                      <OntologyGraphLegend />
                    </div>
                  </div>
                )}

                {/* 개념 목록 (최대 10개 미리보기) */}
                <div className="bg-[var(--color-surface-overlay)] rounded-xl p-4 shadow-sm">
                  <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-1 justify-between">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {selectedLevel} 과정 강의 목록
                    </span>
                    {levelConcepts.length > 10 && (
                      <Link
                        href={`/curriculum/roadmap`}
                        className="text-xs font-normal hover:underline"
                        style={{ color: selectedLevelMeta.color }}
                      >
                        전체 보기 →
                      </Link>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {levelConcepts.slice(0, 10).map((concept, idx) => {
                      const domain = domains.find(d => d.domain_id === concept.domain_id)
                      return (
                        <Link
                          key={concept.concept_id}
                          href={`/curriculum/concept/${concept.concept_id}`}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-overlay)] group text-xs"
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: selectedLevelMeta.color }}
                          >
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] truncate">{concept.name}</span>
                          {domain && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                              style={{ backgroundColor: `${domain.color}20`, color: domain.color }}
                            >
                              {domain.name}
                            </span>
                          )}
                          <Zap className="w-3 h-3 text-stone-900 group-hover:text-stone-900 flex-shrink-0" />
                        </Link>
                      )
                    })}
                  </div>
                  {levelConcepts.length > 10 && (
                    <p className="text-center text-xs text-gray-400 mt-2">
                      외 {levelConcepts.length - 10}개 더 있음
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-sm text-gray-400">
                온톨로지 데이터를 불러올 수 없습니다.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5개 도메인 카드 ───────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">학습 도메인</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-5">관심 분야를 선택하면 맞춤 학습 경로를 안내합니다</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map(d => {
            const Icon = DOMAIN_ICONS[d.name] || BookOpen
            const conceptCount = allConcepts.filter(c => c.domain_id === d.domain_id).length
            const hours = Math.round(
              allConcepts.filter(c => c.domain_id === d.domain_id)
                .reduce((s, c) => s + (c.estimated_minutes || 30), 0) / 60
            )
            return (
              <Link
                key={d.domain_id}
                href={`/curriculum/roadmap?domain=${encodeURIComponent(d.name)}`}
                className="group bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border-subtle)] p-5 hover:shadow-lg transition-all hover:border-stone-300/50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: d.color }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-stone-900 transition-colors">
                      {d.name}
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                      {DOMAIN_DESCRIPTIONS[d.name] || d.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                      <span>{conceptCount}개 개념</span>
                      <span>{hours}시간</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-stone-900 transition-colors mt-1 flex-shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── 4단계 온톨로지 계층 ─────────────────── */}
      <div className="bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border-subtle)] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Zap className="w-5 h-5 text-stone-900" />
              Atomic 캡슐 학습 트리
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              도메인 → 개념 → Atomic 캡슐 4단계 계층 · 캡슐을 클릭하면 바로 학습을 시작합니다
            </p>
          </div>
          <button
            onClick={() => setShowHierarchy(!showHierarchy)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showHierarchy
                ? 'bg-stone-100/10 text-stone-900'
                : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] hover:bg-stone-100/5 hover:text-stone-900'
            }`}
          >
            {showHierarchy ? '접기' : '펼쳐보기'}
          </button>
        </div>

        {showHierarchy && (
          <div className="border border-[var(--color-border-subtle)] rounded-xl p-4 bg-[var(--color-surface-overlay)]/50">
            <OntologyHierarchy
              domains={hierarchyDomains}
              concepts={hierarchyConcepts}
              atomicCapsules={atomicCapsules}
              showProgress={false}
            />
          </div>
        )}

        {!showHierarchy && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {hierarchyDomains.slice(0, 4).map(d => {
              const domConcepts = hierarchyConcepts.filter(c => c.domain_id === d.domain_id)
              return (
                <button
                  key={d.domain_id}
                  onClick={() => setShowHierarchy(true)}
                  className="text-left p-3 rounded-xl border border-[var(--color-border-subtle)] hover:border-stone-300/50 hover:bg-stone-100/5 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{d.domain_name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{domConcepts.length}개 개념</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 빠른 진입 ─────────────────────────── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/curriculum/dashboard" className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow group">
          <BarChart3 className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-1">대시보드</h3>
          <p className="text-sm text-stone-900">전체 현황, 커버리지, 전문가 분석</p>
        </Link>
        <Link href="/curriculum/upload" className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow group">
          <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-1">대본 분석</h3>
          <p className="text-sm text-stone-900">YouTube 대본 업로드 → 개념 자동 매핑</p>
        </Link>
        <Link href="/curriculum/graph" className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow group">
          <GitBranch className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-1">지식그래프</h3>
          <p className="text-sm text-stone-900">{allConcepts.length}개 개념의 관계 탐색</p>
        </Link>
        <Link href="/curriculum/newsletter" className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow group">
          <Mail className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-1">AI 뉴스레터</h3>
          <p className="text-sm text-stone-900">온톨로지 기반 매일 교육 콘텐츠</p>
        </Link>
      </div>

      {/* ── 데이터 플로우 설명 ──────────────────── */}
      <div className="bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border-subtle)] p-6">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 text-center">학습 플랫폼 흐름</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-2">
          {[
            { icon: Upload, label: '대본 분석', desc: 'YouTube 대본 업로드', color: 'var(--color-text-primary)' },
            { icon: GitBranch, label: '지식그래프', desc: '개념 관계 시각화', color: 'var(--color-text-primary)' },
            { icon: BarChart3, label: '대시보드', desc: '통계 분석', color: 'var(--color-text-primary)' },
            { icon: Map, label: '로드맵', desc: '학습 경로 설계', color: 'var(--color-text-primary)' },
            { icon: Zap, label: 'Atomic 캡슐', desc: '원자적 완전학습', color: 'var(--color-danger)' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: step.color }}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{step.label}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{step.desc}</span>
              </div>
              {i < 4 && <ArrowRight className="w-4 h-4 text-gray-300 hidden md:block mt-[-20px]" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
