'use client'

import { useState, useEffect } from 'react'
import { BarChart3, BookOpen, Users, Video, TrendingUp, Download, X, ExternalLink, Zap, Star, Award, Clock, Flame, Trophy, Target, Search } from 'lucide-react'
import Link from 'next/link'
import { exportDashboardToXlsx } from '@/lib/dashboard-export'
import dynamic from 'next/dynamic'

const CurriculumRadarChart = dynamic(
  () => import('@/components/charts/curriculum-dashboard-charts').then(m => m.CurriculumRadarChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-[var(--color-surface-overlay)]" /> }
)
const CurriculumLevelChart = dynamic(
  () => import('@/components/charts/curriculum-dashboard-charts').then(m => m.CurriculumLevelChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-[var(--color-surface-overlay)]" /> }
)
const CurriculumPieChart = dynamic(
  () => import('@/components/charts/curriculum-dashboard-charts').then(m => m.CurriculumPieChart),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse rounded-lg bg-[var(--color-surface-overlay)]" /> }
)

interface DashboardStats {
  total_concepts: number
  total_videos: number
  total_mappings: number
  total_experts: number
  coverage_rate: number
  domain_stats: Array<{
    domain_id: number
    domain_name: string
    color: string
    concept_count: number
    covered_count: number
    coverage_rate: number
  }>
  level_stats: Array<{
    level: string
    concept_count: number
    covered_count: number
    coverage_rate: number
  }>
  top_concepts: Array<{
    concept_id: number
    concept_name: string
    domain_name: string
    domain_color: string
    expert_count: number
    avg_relevance: number
    experts: Array<{ channel_name: string; relevance: number }>
  }>
  lecture_type_distribution: Record<string, number>
  expert_list: Array<{
    channel_name: string
    video_count: number
    concept_count: number
  }>
  structure_templates: Array<{
    lecture_type: string
    avg_hooking: number
    avg_information: number
    avg_case: number
    avg_cta: number
    sample_count: number
  }>
  coverage_matrix: Record<string, Record<string, { total: number; covered: number; rate: number }>>
}

const LECTURE_TYPE_LABELS: Record<string, string> = {
  informational: '정보성',
  case_study: '사례',
  hooking: '후킹',
  knowhow: '노하우',
  mixed: '혼합',
}

const LECTURE_TYPE_COLORS: Record<string, string> = {
  informational: '#051C2C',
  case_study: '#051C2C',
  hooking: '#051C2C',
  knowhow: '#051C2C',
  mixed: '#6B7280',
}

const STRUCTURE_COLORS: Record<string, string> = {
  hooking: '#051C2C',
  information: '#051C2C',
  case: '#051C2C',
  cta: '#A53F8A',
}

interface DrillDownInfo {
  domainId: number
  domainName: string
  level: string
}

interface DrillDownConcept {
  concept_id: number
  name: string
  difficulty: number
  estimated_minutes: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drillDown, setDrillDown] = useState<DrillDownInfo | null>(null)
  const [drillDownConcepts, setDrillDownConcepts] = useState<DrillDownConcept[]>([])
  const [drillDownLoading, setDrillDownLoading] = useState(false)

  // 학습 진도 데이터
  const [progressStats, setProgressStats] = useState<any>(null)
  // 스트릭 & 게이미피케이션
  const [streakData, setStreakData] = useState<any>(null)
  // 캡슐 검색
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const loadStats = () => {
    setLoading(true)
    setError(null)
    fetch('/api/ontology/dashboard')
      .then(r => r.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || '대시보드 데이터를 불러오는 중 오류가 발생했습니다.')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadStats()
    // 학습 진도 로드
    fetch('/api/ontology/progress?user_id=anonymous')
      .then(r => r.json())
      .then(data => { if (!data.error) setProgressStats(data) })
      .catch(() => {})
    // 스트릭 로드
    fetch('/api/ontology/streak?user_id=anonymous')
      .then(r => r.json())
      .then(data => { if (!data.error) setStreakData(data) })
      .catch(() => {})
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/ontology/atomic-capsules/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleDrillDown = async (domainId: number, domainName: string, level: string) => {
    setDrillDown({ domainId, domainName, level })
    setDrillDownLoading(true)
    try {
      const res = await fetch(`/api/ontology/concepts?domain_id=${domainId}&level=${level}`)
      const data = await res.json()
      setDrillDownConcepts(data.concepts || [])
    } catch {
      setDrillDownConcepts([])
    } finally {
      setDrillDownLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin w-8 h-8 border-3 border-stone-300 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-3">
        <p className="text-gray-500">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button onClick={loadStats} className="text-stone-900 text-sm hover:underline">다시 시도</button>
      </div>
    )
  }

  const pieData = Object.entries(stats.lecture_type_distribution).map(([key, value]) => ({
    name: LECTURE_TYPE_LABELS[key] || key,
    value,
    color: LECTURE_TYPE_COLORS[key] || '#888',
  }))

  const radarData = stats.domain_stats.map(d => ({
    domain: d.domain_name,
    concepts: d.concept_count,
    coverage: d.coverage_rate,
  }))

  const levelData = stats.level_stats.map(l => ({
    level: l.level,
    total: l.concept_count,
    covered: l.covered_count,
    uncovered: l.concept_count - l.covered_count,
  }))

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-6 h-6 text-stone-900" />
        <h1 className="text-2xl font-bold">온톨로지 분석 대시보드</h1>
        <div className="flex-1" />
        <button
          onClick={() => stats && exportDashboardToXlsx(stats)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          XLSX 내보내기
        </button>
      </div>

      {/* Atomic 캡슐 학습 진도 */}
      {progressStats && progressStats.total_atomic_capsules > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-stone-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-stone-900" />
              Atomic 캡슐 학습 진도
            </h2>
            <Link href="/curriculum" className="text-xs text-stone-900 hover:underline">
              학습하러 가기 →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-stone-900">{progressStats.total_atomic_capsules}</div>
              <div className="text-xs text-gray-500 mt-0.5">총 캡슐</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-stone-900">{progressStats.mastered}</div>
              <div className="text-xs text-stone-900 mt-0.5 flex items-center justify-center gap-0.5"><Star className="w-3 h-3" /> 마스터</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-stone-900">{progressStats.completed}</div>
              <div className="text-xs text-stone-900 mt-0.5">완료</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-stone-900">{progressStats.in_progress}</div>
              <div className="text-xs text-stone-900 mt-0.5">학습중</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-stone-900">{progressStats.avg_quiz_score || 0}<span className="text-sm text-gray-400">점</span></div>
              <div className="text-xs text-gray-500 mt-0.5">평균 퀴즈</div>
            </div>
          </div>

          {/* 마스터 진도 바 */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>전체 마스터 진도</span>
              <span className="font-semibold text-stone-900">{progressStats.mastery_pct}%</span>
            </div>
            <div className="w-full bg-white rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${progressStats.mastery_pct}%` }}
              />
            </div>
          </div>

          {/* 마스터 완료 개념 */}
          {progressStats.mastered_concepts > 0 && (
            <div className="flex items-center gap-2 text-sm text-stone-900 font-medium">
              <Award className="w-4 h-4" />
              {progressStats.mastered_concepts}개 개념 완전 마스터 완료!
            </div>
          )}

          {/* 최근 학습 기록 */}
          {progressStats.recent_study && progressStats.recent_study.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-300">
              <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 최근 학습
              </h3>
              <div className="space-y-1">
                {progressStats.recent_study.slice(0, 5).map((r: any, i: number) => (
                  <Link
                    key={i}
                    href={`/curriculum/study/${r.atomic_id}`}
                    className="flex items-center gap-2 text-xs hover:bg-white/60 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      r.status === 'mastered' ? 'bg-stone-100' :
                      r.status === 'completed' ? 'bg-stone-100' :
                      'bg-stone-100'
                    }`} />
                    <span className="text-gray-700 truncate flex-1">{r.topic}</span>
                    {r.quiz_score !== null && (
                      <span className={`font-medium ${r.quiz_score >= 70 ? 'text-stone-900' : 'text-stone-900'}`}>
                        {r.quiz_score}점
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 학습 스트릭 & 게이미피케이션 */}
      {streakData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 스트릭 패널 */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-stone-300 p-6">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-stone-900" />
              학습 스트릭
            </h2>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="text-3xl font-bold text-stone-900">{streakData.current_streak}</div>
                <div className="text-xs text-gray-500 mt-0.5">현재 연속</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-stone-900">{streakData.longest_streak}</div>
                <div className="text-xs text-gray-500 mt-0.5">최장 기록</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-stone-900">{streakData.total_study_days}</div>
                <div className="text-xs text-gray-500 mt-0.5">총 학습일</div>
              </div>
            </div>

            {/* 7일 히트맵 */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-2">최근 7일</div>
              <div className="flex gap-1.5">
                {(streakData.heatmap_7d || []).map((d: any, i: number) => {
                  const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][new Date(d.date).getDay()]
                  const intensity = d.count === 0 ? 'bg-gray-100' :
                    d.count <= 2 ? 'bg-stone-100' :
                    d.count <= 5 ? 'bg-stone-100' : 'bg-stone-100'
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={`w-full aspect-square rounded-lg ${intensity} transition-all`}
                        title={`${d.date}: ${d.count}개 캡슐`}
                      />
                      <span className="text-[9px] text-gray-400">{dayLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 오늘 요약 */}
            <div className="bg-white/60 rounded-lg p-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-stone-900" />
                <span className="text-gray-600">오늘</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-700 font-medium">{streakData.today_capsules}개 캡슐</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-700 font-medium">{streakData.today_minutes}분</span>
              </div>
            </div>

            {/* 30일 히트맵 (소형) */}
            {streakData.heatmap_30d && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1.5">최근 30일</div>
                <div className="flex flex-wrap gap-[3px]">
                  {streakData.heatmap_30d.map((d: any, i: number) => {
                    const intensity = d.count === 0 ? 'bg-gray-100' :
                      d.count <= 2 ? 'bg-stone-100' :
                      d.count <= 5 ? 'bg-stone-100' : 'bg-stone-100'
                    return (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${intensity}`}
                        title={`${d.date}: ${d.count}개`}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 뱃지 & 업적 패널 */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-stone-300 p-6">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-stone-900" />
              업적 & 뱃지
            </h2>

            {/* 통계 요약 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-stone-900">{streakData.total_capsules_studied}</div>
                <div className="text-xs text-gray-500 mt-0.5">학습 캡슐</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-stone-900">
                  {streakData.total_minutes >= 60
                    ? `${Math.floor(streakData.total_minutes / 60)}h ${streakData.total_minutes % 60}m`
                    : `${streakData.total_minutes}m`
                  }
                </div>
                <div className="text-xs text-gray-500 mt-0.5">총 학습시간</div>
              </div>
            </div>

            {/* 획득 뱃지 */}
            {streakData.badges && streakData.badges.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-600">획득 뱃지 ({streakData.badges.length}개)</div>
                <div className="grid grid-cols-2 gap-2">
                  {streakData.badges.map((b: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2.5 shadow-sm">
                      <span className="text-xl">{b.badge_icon}</span>
                      <div>
                        <div className="text-xs font-medium text-gray-800">{b.badge_name}</div>
                        <div className="text-[9px] text-gray-400">
                          {new Date(b.earned_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-sm text-gray-500">아직 획득한 뱃지가 없습니다</p>
                <p className="text-xs text-gray-400 mt-1">학습을 시작하면 뱃지를 획득할 수 있어요!</p>
              </div>
            )}

            {/* 새로 획득한 뱃지 */}
            {streakData.new_badges && streakData.new_badges.length > 0 && (
              <div className="mt-3 p-3 bg-stone-100 border border-stone-300 rounded-xl animate-pulse">
                <div className="text-xs font-bold text-stone-900 mb-1">🎉 새로운 뱃지 획득!</div>
                {streakData.new_badges.map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-stone-900">
                    <span>{b.icon}</span>
                    <span className="font-medium">{b.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 다음 목표 */}
            <div className="mt-4 pt-3 border-t border-stone-300">
              <div className="text-xs font-semibold text-gray-600 mb-2">다음 목표</div>
              <div className="space-y-1.5">
                {streakData.current_streak < 3 && (
                  <NextGoal icon="🔥" name="3일 연속 학습" current={streakData.current_streak} target={3} />
                )}
                {streakData.current_streak >= 3 && streakData.current_streak < 7 && (
                  <NextGoal icon="💪" name="1주일 연속 학습" current={streakData.current_streak} target={7} />
                )}
                {streakData.current_streak >= 7 && streakData.current_streak < 30 && (
                  <NextGoal icon="👑" name="30일 연속 학습" current={streakData.current_streak} target={30} />
                )}
                {streakData.total_capsules_studied < 10 && (
                  <NextGoal icon="📚" name="10개 캡슐 완료" current={streakData.total_capsules_studied} target={10} />
                )}
                {streakData.total_capsules_studied >= 10 && streakData.total_capsules_studied < 50 && (
                  <NextGoal icon="🏆" name="50개 캡슐 완료" current={streakData.total_capsules_studied} target={50} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Atomic 캡슐 검색 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500" />
            Atomic 캡슐 검색
          </h2>
          <Link
            href="/curriculum/bulk-generate"
            className="text-xs text-stone-900 hover:text-stone-900 flex items-center gap-1 px-3 py-1.5 bg-stone-100 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            벌크 생성 관리
          </Link>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="검색어를 입력하세요 (예: 임차권, 경매, 세금)"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-2.5 bg-stone-100 text-white text-sm font-medium rounded-xl hover:bg-stone-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {searching ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            검색
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((r: any) => (
              <Link
                key={r.atomic_id}
                href={`/curriculum/study/${r.atomic_id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-stone-300 hover:bg-stone-100/30 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-900 flex items-center justify-center text-xs font-bold shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 group-hover:text-stone-900 truncate">{r.topic}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span className="text-stone-900">{r.concept_name}</span>
                    <span>·</span>
                    <span>{r.concept_level}</span>
                    <span>·</span>
                    <span>{r.domain_name}</span>
                    <span>·</span>
                    <span>{r.estimated_min}분</span>
                  </div>
                  {r.preview && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.preview}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        {searchResults.length === 0 && searchQuery && !searching && (
          <p className="text-center text-sm text-gray-400 py-4">검색 결과가 없습니다</p>
        )}
      </div>

      {/* Summary Cards Row */}
      {(() => {
        const avgRelevance = stats.top_concepts.length > 0
          ? Math.round(stats.top_concepts.reduce((sum, c) => sum + c.avg_relevance, 0) / stats.top_concepts.length * 100)
          : 0
        const domainConceptCounts: Record<string, number> = {}
        stats.top_concepts.forEach(c => {
          domainConceptCounts[c.domain_name] = (domainConceptCounts[c.domain_name] || 0) + 1
        })
        const topDomain = Object.entries(domainConceptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-stone-100 text-stone-900">
                  <Video className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_videos}개</div>
              <div className="text-xs text-gray-500 mt-0.5">총 전문가 강의</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-stone-100 text-stone-900">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.coverage_rate}%</div>
              <div className="text-xs text-gray-500 mt-0.5">개념 커버리지</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-stone-100 text-stone-900">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{avgRelevance}%</div>
              <div className="text-xs text-gray-500 mt-0.5">평균 관련도</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-stone-100 text-stone-900">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 truncate text-base leading-tight pt-1">{topDomain}</div>
              <div className="text-xs text-gray-500 mt-0.5">가장 많은 도메인</div>
            </div>
          </div>
        )
      })()}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={BookOpen} label="전체 개념" value={stats.total_concepts} color="purple" />
        <StatCard icon={Video} label="분석 영상" value={stats.total_videos} color="blue" />
        <StatCard icon={TrendingUp} label="매핑 수" value={stats.total_mappings} color="green" />
        <StatCard icon={Users} label="전문가" value={stats.total_experts} color="orange" />
        <StatCard icon={BarChart3} label="커버리지" value={`${stats.coverage_rate}%`} color="red" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">도메인 깊이 분석</h3>
          <CurriculumRadarChart data={radarData} />
        </div>

        {/* Bar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">레벨별 분포</h3>
          <CurriculumLevelChart data={levelData} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">강의 유형 분포</h3>
          <CurriculumPieChart data={pieData} />
        </div>

        {/* Expert consensus */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">전문가 합의도 Top 20</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 px-2 text-gray-500">#</th>
                  <th className="text-left py-1.5 px-2 text-gray-500">개념</th>
                  <th className="text-left py-1.5 px-2 text-gray-500">도메인</th>
                  <th className="text-center py-1.5 px-2 text-gray-500">전문가</th>
                  <th className="text-left py-1.5 px-2 text-gray-500">관련도</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_concepts.slice(0, 20).map((concept, i) => (
                  <tr key={concept.concept_id} className="border-b border-gray-50 hover:bg-gray-50 group relative">
                    <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                    <td className="py-1.5 px-2 font-medium text-gray-700">
                      <div className="relative">
                        <span>{concept.concept_name}</span>
                        {concept.experts && concept.experts.length > 0 && (
                          <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-48 space-y-1">
                            <div className="text-[9px] font-semibold text-gray-400 uppercase mb-1">관련 전문가</div>
                            {concept.experts.slice(0, 3).map((exp, ei) => (
                              <div key={ei} className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-700">전문가 {String.fromCharCode(65 + ei)}</span>
                                <span className="text-stone-900 font-medium">{Math.round(exp.relevance * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: concept.domain_color }} />
                        {concept.domain_name}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="bg-stone-100 text-stone-900 px-1.5 py-0.5 rounded-full font-medium">
                        {concept.expert_count}명
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.round(concept.avg_relevance * 100)}%`,
                              background: `linear-gradient(90deg, #8B5CF6 0%, #6D28D9 100%)`,
                            }}
                          />
                        </div>
                        <span className="text-gray-400">{Math.round(concept.avg_relevance * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.top_concepts.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">아직 분석된 데이터가 없습니다</div>
            )}
          </div>
        </div>
      </div>

      {/* Coverage matrix */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">커버리지 매트릭스</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-gray-500">도메인</th>
                {stats.level_stats.map(l => (
                  <th key={l.level} className="text-center py-2 px-3 text-gray-500">{l.level}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.domain_stats.map(d => (
                <tr key={d.domain_id} className="border-b border-gray-50">
                  <td className="py-2 px-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.domain_name}
                    </span>
                  </td>
                  {stats.level_stats.map(l => {
                    const cell = stats.coverage_matrix?.[d.domain_id]?.[l.level]
                    const rate = cell?.rate ?? 0
                    const total = cell?.total ?? 0
                    return (
                      <td key={l.level} className="text-center py-2 px-3">
                        <button
                          onClick={() => total > 0 && handleDrillDown(d.domain_id, d.domain_name, l.level)}
                          disabled={total === 0}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            total > 0 ? 'cursor-pointer hover:ring-2 hover:ring-purple-300' : 'cursor-default'
                          } ${
                            rate >= 50 ? 'bg-stone-100 text-stone-900' :
                            rate >= 20 ? 'bg-stone-100 text-stone-900' :
                            rate > 0 ? 'bg-stone-100 text-stone-900' :
                            'bg-gray-50 text-gray-400'
                          }`}
                        >
                          {rate}%
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expert Domain Heatmap */}
      {stats.top_concepts.length > 0 && (() => {
        const LEVELS = ['왕초보', '초보', '중급', '고급', '전문가']
        // Build domain list from domain_stats
        const domains = stats.domain_stats.map(d => ({ id: d.domain_id, name: d.domain_name }))
        // Build heatmap data: for each domain+level, count experts and avg relevance from top_concepts
        // We approximate using coverage_matrix for counts and domain_stats for structure
        // Build a lookup: domain_name -> level -> { expert_count, avg_relevance }
        type HeatCell = { expert_count: number; avg_relevance: number }
        const heatMap: Record<string, Record<string, HeatCell>> = {}
        stats.domain_stats.forEach(d => {
          heatMap[d.domain_name] = {}
          LEVELS.forEach(level => {
            const cell = stats.coverage_matrix?.[d.domain_id]?.[level]
            heatMap[d.domain_name][level] = {
              expert_count: cell?.covered ?? 0,
              avg_relevance: cell ? (cell.rate / 100) : 0,
            }
          })
        })
        // Compute max score for color normalization
        let maxScore = 0
        domains.forEach(d => {
          LEVELS.forEach(level => {
            const cell = heatMap[d.name]?.[level]
            if (cell) {
              const score = cell.expert_count * cell.avg_relevance
              if (score > maxScore) maxScore = score
            }
          })
        })
        if (maxScore === 0) maxScore = 1

        const getCellStyle = (cell: HeatCell): React.CSSProperties => {
          const score = cell.expert_count * cell.avg_relevance
          const intensity = Math.min(score / maxScore, 1)
          const r = Math.round(255 - intensity * (255 - 109))
          const g = Math.round(255 - intensity * (255 - 40))
          const b = Math.round(255 - intensity * (255 - 217))
          return {
            backgroundColor: `rgb(${r}, ${g}, ${b})`,
            color: intensity > 0.5 ? '#4C1D95' : '#6B7280',
          }
        }

        return (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">전문가 도메인 히트맵</h3>
            <p className="text-xs text-gray-400 mb-3">도메인 × 레벨별 커버된 개념 수 (색상 농도: 전문가 수 × 평균 관련도)</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-gray-500 w-28">도메인</th>
                    {LEVELS.map(level => (
                      <th key={level} className="text-center py-2 px-3 text-gray-500">{level}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {domains.map(d => (
                    <tr key={d.id} className="border-b border-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stats.domain_stats.find(ds => ds.domain_id === d.id)?.color || '#888' }} />
                          {d.name}
                        </span>
                      </td>
                      {LEVELS.map(level => {
                        const cell = heatMap[d.name]?.[level] || { expert_count: 0, avg_relevance: 0 }
                        return (
                          <td key={level} className="text-center py-1.5 px-2">
                            <div
                              className="inline-flex items-center justify-center w-10 h-8 rounded-md text-xs font-semibold transition-all"
                              style={getCellStyle(cell)}
                              title={`전문가 커버 ${cell.expert_count}개 · 관련도 ${Math.round(cell.avg_relevance * 100)}%`}
                            >
                              {cell.expert_count > 0 ? cell.expert_count : ''}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">강도:</span>
              <div className="flex items-center gap-1">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
                  const r = Math.round(255 - t * (255 - 109))
                  const g = Math.round(255 - t * (255 - 40))
                  const b = Math.round(255 - t * (255 - 217))
                  return (
                    <div
                      key={t}
                      className="w-5 h-3 rounded"
                      style={{ backgroundColor: `rgb(${r}, ${g}, ${b})`, border: '1px solid #e5e7eb' }}
                    />
                  )
                })}
                <span className="text-[10px] text-gray-400 ml-1">낮음 → 높음</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Drill-down panel */}
      {drillDown && (
        <div className="bg-white border border-stone-300 rounded-xl p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {drillDown.domainName} · {drillDown.level} ({drillDownConcepts.length}개 개념)
            </h3>
            <button onClick={() => setDrillDown(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {drillDownLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-stone-300 border-t-transparent rounded-full" />
            </div>
          ) : drillDownConcepts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">해당 조건의 개념이 없습니다</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {drillDownConcepts.map(c => (
                <a
                  key={c.concept_id}
                  href={`/curriculum/capsule/${c.concept_id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border hover:border-stone-300 hover:bg-stone-100 transition-colors text-xs"
                >
                  <div>
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="ml-2 text-gray-400">난이도 {'★'.repeat(c.difficulty || 1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <span>{c.estimated_minutes || 30}분</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Structure templates */}
      {stats.structure_templates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">강의 구성 템플릿</h3>
          <div className="space-y-3">
            {stats.structure_templates.map((tmpl, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">
                    {LECTURE_TYPE_LABELS[tmpl.lecture_type] || tmpl.lecture_type} 강의
                    <span className="text-gray-400 ml-1">({tmpl.sample_count}개 샘플)</span>
                  </span>
                </div>
                <div className="flex h-6 rounded-lg overflow-hidden">
                  <div style={{ width: `${tmpl.avg_hooking * 100}%`, backgroundColor: STRUCTURE_COLORS.hooking }} className="flex items-center justify-center text-[9px] text-white font-medium">
                    {tmpl.avg_hooking > 0.05 ? `후킹${Math.round(tmpl.avg_hooking * 100)}%` : ''}
                  </div>
                  <div style={{ width: `${tmpl.avg_information * 100}%`, backgroundColor: STRUCTURE_COLORS.information }} className="flex items-center justify-center text-[9px] text-white font-medium">
                    {tmpl.avg_information > 0.1 ? `정보${Math.round(tmpl.avg_information * 100)}%` : ''}
                  </div>
                  <div style={{ width: `${tmpl.avg_case * 100}%`, backgroundColor: STRUCTURE_COLORS.case }} className="flex items-center justify-center text-[9px] text-white font-medium">
                    {tmpl.avg_case > 0.05 ? `사례${Math.round(tmpl.avg_case * 100)}%` : ''}
                  </div>
                  <div style={{ width: `${tmpl.avg_cta * 100}%`, backgroundColor: STRUCTURE_COLORS.cta }} className="flex items-center justify-center text-[9px] text-white font-medium">
                    {tmpl.avg_cta > 0.05 ? `CTA${Math.round(tmpl.avg_cta * 100)}%` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NextGoal({ icon, name, current, target }: { icon: string; name: string; current: number; target: number }) {
  const pct = Math.min(Math.round((current / target) * 100), 100)
  return (
    <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2">
      <span className="text-sm">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
          <span className="truncate">{name}</span>
          <span className="font-medium text-stone-900">{current}/{target}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'bg-stone-100 text-stone-900',
    blue: 'bg-stone-100 text-stone-900',
    green: 'bg-stone-100 text-stone-900',
    orange: 'bg-stone-100 text-stone-900',
    red: 'bg-stone-100 text-stone-900',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
