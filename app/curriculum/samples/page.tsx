'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── 타입 ───────────────────────────────────────
interface CaseStudy {
  title: string
  case_type: string           // 경매, 임대, 매매, 기타
  case_number?: string        // 사건번호 (경매: 법원경매 사건번호)
  situation: string           // 상황 설명
  analysis: string            // 분석
  lesson: string              // 교훈
  key_numbers?: string[]      // 핵심 수치
}

interface PracticalGuide {
  before_action: string[]     // 행동 전 체크
  during_action: string[]     // 진행 중 체크
  after_action: string[]      // 완료 후 체크
  common_mistakes: string[]   // 흔한 실수
  pro_tips: string[]          // 전문가 팁
}

interface SubConceptContent {
  chapter_title?: string
  learning_objectives?: string[]
  explanation: {
    introduction: string
    core_content: string
    practical_meaning: string
  }
  theory_points: Array<{
    title: string
    content: string
    expert_count: number
  }>
  expert_comparison: {
    overview: string
    perspectives: Array<{ label: string; viewpoint: string; pros_cons: string }>
    synthesis: string
  }
  // 구형 호환 (case_studies 없으면 practical_cases 사용)
  practical_cases?: Array<{
    title: string
    scenario: string
    lesson: string
  }>
  case_studies?: CaseStudy[]
  practical_guide?: PracticalGuide
  checklist: string[]
  self_assessment: Array<{
    question: string
    hint: string
    model_answer?: string
  }>
  meta?: {
    source_expert_count: number
    source_video_count: number
    ai_generated: boolean
    model_used: string
    generated_at: string
  }
}

interface ChannelBreakdown {
  channel: string
  count: number
  avg_relevance: number
}

interface SubConcept {
  sub_concept_id: number
  concept_id: number
  name: string
  description: string
  keywords: string[]
  difficulty: number
  order_in_parent: number
  estimated_minutes: number
  content: SubConceptContent | null
  source_video_count: number
  video_count: number
  expert_count: number
  channel_breakdown: ChannelBreakdown[]
}

interface SampleData {
  concept: {
    concept_id: number
    name: string
    description: string
    difficulty: number
    keywords: string[]
    domain_name: string
    domain_color: string
  }
  importance: {
    expert_count: number
    video_count: number
    avg_relevance: number
    rank_overall: number
  }
  relations: {
    prerequisites: Array<{ id: number; name: string }>
    successors: Array<{ id: number; name: string }>
  }
  sub_concepts: SubConcept[]
}

interface SegmentData {
  channel: string
  segment_count: number
  avg_relevance: number
  segments: Array<{
    text: string
    title: string
    keyword_matched: string
    relevance: number
  }>
}

// ─── 계층 구조 라벨 ─────────────────────────────
const HIERARCHY_LABELS = {
  domain: '도메인(Domain)',
  concept: '개념(Concept)',
  topic: '주제(Topic)',
  keypoint: '핵심포인트(KeyPoint)',
}

// ─── 메인 페이지 ─────────────────────────────────
export default function SamplesPage() {
  const [samples, setSamples] = useState<SampleData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'lecture' | 'ebook' | 'newsletter' | 'atomic'>('lecture')
  const [synthesizing, setSynthesizing] = useState<number | null>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ontology/samples/v2')
      .then(res => {
        if (!res.ok) throw new Error('API 오류: ' + res.status)
        return res.json()
      })
      .then(data => {
        if (!cancelled) setSamples(data.samples || [])
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
    return () => { cancelled = true }
  }, [])

  // selected_youtube_ids를 받아 AI 합성 (undefined이면 전체 자동 선택)
  const handleSynthesize = async (subConceptId: number, selectedIds?: string[], forceRegenerate?: boolean) => {
    setSynthesizing(subConceptId)
    try {
      const res = await fetch('/api/ontology/sub-concepts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub_concept_id: subConceptId,
          selected_youtube_ids: selectedIds && selectedIds.length > 0 ? selectedIds : undefined,
          force_regenerate: forceRegenerate || false,
        }),
      })
      if (!res.ok) throw new Error('합성 실패')
      const data = await res.json()
      setSamples(prev => (prev || []).map(s => ({
        ...s,
        sub_concepts: s.sub_concepts.map(sc =>
          sc.sub_concept_id === subConceptId ? { ...sc, content: data.content } : sc
        ),
      })))
    } catch (err: any) {
      alert('콘텐츠 합성 오류: ' + err.message)
    } finally {
      setSynthesizing(null)
    }
  }

  if (samples === null && !error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-4 border-stone-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">샘플 데이터 로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-stone-900 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-stone-100 text-white rounded-lg">
          재시도
        </button>
      </div>
    )
  }

  const sampleList = samples || []

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          온톨로지 기반 AI 합성 교육 콘텐츠 샘플
        </h1>
        <p className="text-gray-600 mb-4">
          31,585개 전문가 강의 대본을 온톨로지 엔진으로 분석하고,
          AI가 합성한 교육 콘텐츠 샘플 3개입니다.
        </p>
        {/* 계층 구조 안내 */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-stone-300">
          <p className="text-xs font-bold text-stone-900 mb-2">📊 온톨로지 계층 구조</p>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="px-2.5 py-1 bg-stone-100 text-white rounded-lg font-medium text-xs">
              {HIERARCHY_LABELS.domain}
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-2.5 py-1 bg-stone-100 text-white rounded-lg font-medium text-xs">
              {HIERARCHY_LABELS.concept}
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-2.5 py-1 bg-stone-100 text-white rounded-lg font-medium text-xs">
              {HIERARCHY_LABELS.topic}
            </span>
            <span className="text-gray-400">→</span>
            <span className="px-2.5 py-1 bg-stone-100 text-white rounded-lg font-medium text-xs">
              {HIERARCHY_LABELS.keypoint}
            </span>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'lecture' as const, label: '🎓 강의안', desc: '커리큘럼+강의노트' },
          { key: 'ebook' as const, label: '📚 전자책', desc: '체계적 실용서' },
          { key: 'newsletter' as const, label: '📨 뉴스레터', desc: '매일 교육 콘텐츠' },
          { key: 'atomic' as const, label: '⚡ Atomic', desc: '원자적 학습 캡슐' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="block">{tab.label}</span>
            <span className="block text-[10px] opacity-60">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* 합성 오버레이 */}
      {synthesizing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center max-w-sm">
            <div className="w-10 h-10 border-4 border-stone-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-semibold text-gray-900 mb-1">AI 콘텐츠 합성 중...</p>
            <p className="text-sm text-gray-500">약 10~30초 소요됩니다.</p>
          </div>
        </div>
      )}

      {/* 카드 목록 */}
      <div className="space-y-8">
        {sampleList.map((sample, idx) => {
          const { concept, importance, relations, sub_concepts } = sample
          const isExpanded = expandedCard === idx
          const totalMinutes = sub_concepts.reduce((sum, sc) => sum + sc.estimated_minutes, 0)
          const synthesizedCount = sub_concepts.filter(sc => sc.content).length
          const totalVideos = sub_concepts.reduce((s, sc) => s + (sc.video_count || 0), 0)
          const totalExperts = sub_concepts.reduce((s, sc) => s + (sc.expert_count || 0), 0)

          return (
            <div key={concept.concept_id} className="bg-white rounded-2xl shadow-md border overflow-hidden">
              {/* 헤더 */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: concept.domain_color }}
                  >
                    {idx + 1}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">개념(Concept)</span>
                      <h2 className="text-lg font-bold text-gray-900">{concept.name}</h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-medium"
                        style={{ backgroundColor: concept.domain_color }}>
                        {concept.domain_name}
                      </span>
                      <span>난이도 {'★'.repeat(concept.difficulty)}{'☆'.repeat(5 - concept.difficulty)}</span>
                      <span>전문가 {importance.expert_count}명</span>
                      <span>영상 {importance.video_count.toLocaleString()}개</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-gray-500">
                    <p>주제 <b className="text-stone-900">{sub_concepts.length}</b>개</p>
                    <p>합성 <b className="text-stone-900">{synthesizedCount}</b>/{sub_concepts.length}</p>
                  </div>
                  <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* 확장 내용 */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t">
                  {/* 요약 통계 */}
                  <div className="mt-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-stone-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-stone-900 font-medium">주제(Topic)</p>
                      <p className="text-xl font-bold text-stone-900">{sub_concepts.length}개</p>
                    </div>
                    <div className="bg-stone-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-stone-900 font-medium">총 학습 시간</p>
                      <p className="text-xl font-bold text-stone-900">{totalMinutes}분</p>
                    </div>
                    <div className="bg-stone-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-stone-900 font-medium">매핑 영상</p>
                      <p className="text-xl font-bold text-stone-900">{totalVideos}개</p>
                    </div>
                    <div className="bg-stone-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-stone-900 font-medium">참여 전문가</p>
                      <p className="text-xl font-bold text-stone-900">{importance.expert_count}명</p>
                    </div>
                    <div className="bg-stone-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-stone-900 font-medium">평균 관련도</p>
                      <p className="text-xl font-bold text-stone-900">{importance.avg_relevance?.toFixed(2) || '-'}</p>
                    </div>
                  </div>

                  {/* 관계 */}
                  {(relations.prerequisites.length > 0 || relations.successors.length > 0) && (
                    <div className="mb-6 flex flex-wrap gap-2 items-center text-xs">
                      {relations.prerequisites.length > 0 && (
                        <>
                          <span className="text-gray-500 font-medium">선수 개념:</span>
                          {relations.prerequisites.map(p => (
                            <span key={p.id} className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">{p.name}</span>
                          ))}
                        </>
                      )}
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-1 bg-stone-100 rounded-full text-stone-900 font-medium">{concept.name}</span>
                      {relations.successors.length > 0 && (
                        <>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-500 font-medium">후속:</span>
                          {relations.successors.map(s => (
                            <span key={s.id} className="px-2 py-1 bg-gray-100 rounded-full text-gray-600">{s.name}</span>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* 탭별 뷰 */}
                  {activeTab === 'lecture' && (
                    <LecturePlanView concept={concept} subConcepts={sub_concepts} importance={importance} onSynthesize={handleSynthesize} />
                  )}
                  {activeTab === 'ebook' && (
                    <EbookView concept={concept} subConcepts={sub_concepts} importance={importance} onSynthesize={handleSynthesize} />
                  )}
                  {activeTab === 'newsletter' && (
                    <NewsletterView concept={concept} subConcepts={sub_concepts} importance={importance} />
                  )}
                  {activeTab === 'atomic' && (
                    <AtomicCapsulePreview conceptId={concept.concept_id} conceptName={concept.name} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 영상 목록 타입 ─────────────────────────────
interface VideoItem {
  youtube_id: string
  relevance: number
  title: string
  channel_name: string
  lecture_type: string
  duration_min: number | null
  is_theory: boolean
}

// ─── 3-View 주제 콘텐츠 뷰어 ──────────────────────
function TopicContentViewer({ sc, onSynthesize }: {
  sc: SubConcept
  onSynthesize: (id: number, selectedIds?: string[], forceRegenerate?: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'optimized' | 'synthesis' | 'original'>('optimized')
  const [showVideoPanel, setShowVideoPanel] = useState(false)
  const [videos, setVideos] = useState<VideoItem[] | null>(null)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const content = sc.content

  const loadVideos = useCallback(async () => {
    if (videos !== null) return
    setLoadingVideos(true)
    try {
      const res = await fetch(`/api/ontology/sub-concepts/videos?sub_concept_id=${sc.sub_concept_id}`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch {
      setVideos([])
    } finally {
      setLoadingVideos(false)
    }
  }, [sc.sub_concept_id, videos])

  const toggleVideo = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = (onlyTheory = false) => {
    if (!videos) return
    const pool = onlyTheory ? videos.filter(v => v.is_theory) : videos
    setSelectedIds(new Set(pool.map(v => v.youtube_id)))
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-900 flex items-center justify-center font-bold text-sm">
            {sc.order_in_parent}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1 py-0.5 rounded bg-stone-100 text-stone-900 font-medium">주제</span>
              <h4 className="font-semibold text-gray-900">{sc.name}</h4>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{sc.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-stone-100 rounded-full" />
              영상 {sc.video_count}개
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-stone-100 rounded-full" />
              전문가 {sc.expert_count}명
            </span>
            <span>{sc.estimated_minutes}분</span>
            {content?.meta?.ai_generated && (
              <span className="px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded text-[10px] font-medium">AI 합성</span>
            )}
          </div>
          <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-6 border-t">

          {/* ★ 참조 대본 관리 패널 */}
          <div className="mt-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-[9px]">📁</span>
                참조 대본 ({sc.video_count}개 전체)
              </p>
              <button
                onClick={() => {
                  setShowVideoPanel(!showVideoPanel)
                  if (!showVideoPanel) loadVideos()
                }}
                className="text-xs text-stone-900 hover:text-stone-900 underline"
              >
                {showVideoPanel ? '닫기' : '전체 목록 보기 / 수동 선택'}
              </button>
            </div>

            {/* 전문가(채널) 분포 요약 */}
            {sc.channel_breakdown && sc.channel_breakdown.length > 0 && !showVideoPanel && (
              <div className="flex flex-wrap gap-1.5">
                {sc.channel_breakdown.slice(0, 6).map((cb, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-100" />
                    전문가 {String.fromCharCode(65 + i)} ({cb.count}개, ★{cb.avg_relevance})
                  </span>
                ))}
                {sc.channel_breakdown.length > 6 && (
                  <span className="text-xs text-gray-400">+{sc.channel_breakdown.length - 6}명</span>
                )}
              </div>
            )}

            {/* 전체 영상 목록 패널 */}
            {showVideoPanel && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                {loadingVideos ? (
                  <div className="py-6 text-center text-xs text-gray-500">
                    <div className="w-5 h-5 border-2 border-stone-300 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    영상 목록 로딩 중...
                  </div>
                ) : (
                  <>
                    {/* 툴바 */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b flex-wrap">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectMode}
                          onChange={e => setSelectMode(e.target.checked)}
                          className="rounded"
                        />
                        수동 선택 모드
                      </label>
                      {selectMode && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => handleSelectAll(true)} className="text-xs text-stone-900 hover:text-stone-900">강의형만 선택</button>
                          <button onClick={() => handleSelectAll(false)} className="text-xs text-stone-900 hover:text-stone-900">전체 선택</button>
                          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-stone-900 hover:text-stone-900">초기화</button>
                          <span className="ml-auto text-xs text-gray-500">
                            {selectedIds.size}개 선택됨
                          </span>
                        </>
                      )}
                      {!selectMode && (
                        <span className="ml-auto text-xs text-gray-400">체크박스로 AI가 참조할 대본을 직접 선택할 수 있습니다</span>
                      )}
                    </div>

                    {/* 영상 목록 */}
                    <div className="max-h-64 overflow-y-auto">
                      {(videos || []).length === 0 ? (
                        <p className="py-4 text-center text-xs text-gray-400">영상 데이터 없음</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="bg-white border-b sticky top-0">
                            <tr>
                              {selectMode && <th className="px-3 py-2 text-left w-8"></th>}
                              <th className="px-3 py-2 text-left text-gray-500 font-medium">제목</th>
                              <th className="px-3 py-2 text-left text-gray-500 font-medium w-24">전문가</th>
                              <th className="px-3 py-2 text-left text-gray-500 font-medium w-16">유형</th>
                              <th className="px-3 py-2 text-right text-gray-500 font-medium w-16">관련도</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(videos || []).map((v, i) => (
                              <tr
                                key={v.youtube_id}
                                className={`border-b last:border-0 transition-colors ${
                                  selectMode && selectedIds.has(v.youtube_id)
                                    ? 'bg-stone-100'
                                    : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                } ${selectMode ? 'cursor-pointer hover:bg-stone-100/50' : ''}`}
                                onClick={selectMode ? () => toggleVideo(v.youtube_id) : undefined}
                              >
                                {selectMode && (
                                  <td className="px-3 py-1.5">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(v.youtube_id)}
                                      onChange={() => toggleVideo(v.youtube_id)}
                                      className="rounded"
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </td>
                                )}
                                <td className="px-3 py-1.5 text-gray-800 max-w-xs truncate">{v.title}</td>
                                <td className="px-3 py-1.5 text-gray-500 truncate max-w-[96px]">전문가 {String.fromCharCode(65 + (i % 26))}</td>
                                <td className="px-3 py-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    v.is_theory
                                      ? 'bg-stone-100 text-stone-900'
                                      : 'bg-stone-100 text-stone-900'
                                  }`}>
                                    {v.is_theory ? '강의형' : '사례형'}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono text-gray-500">{v.relevance.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {!content ? (
            <div className="py-6">
              <div className="flex items-center gap-3 justify-center flex-wrap">
                <button
                  onClick={() => onSynthesize(sc.sub_concept_id)}
                  className="px-4 py-2 bg-stone-100 text-white rounded-lg hover:bg-stone-100 transition-colors text-sm font-medium"
                >
                  🤖 AI 자동 합성 (강의형 우선 전체)
                </button>
                {selectMode && selectedIds.size > 0 && (
                  <button
                    onClick={() => onSynthesize(sc.sub_concept_id, Array.from(selectedIds))}
                    className="px-4 py-2 bg-stone-100 text-white rounded-lg hover:bg-stone-100 transition-colors text-sm font-medium"
                  >
                    ✅ 선택된 {selectedIds.size}개 대본으로 합성
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                전체 자동 합성은 AI가 관련도 기반으로 최적 대본을 선택합니다
              </p>
            </div>
          ) : (
            <>
              {/* 재합성 버튼 */}
              <div className="flex items-center gap-2 mb-3 pt-1 flex-wrap">
                <button
                  onClick={() => onSynthesize(sc.sub_concept_id, undefined, false)}
                  className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  🔄 캐시 사용 재합성
                </button>
                <button
                  onClick={() => onSynthesize(sc.sub_concept_id, undefined, true)}
                  className="text-xs px-3 py-1.5 bg-stone-100 border border-stone-300 text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  🆕 강제 재합성 (새로 생성)
                </button>
                {selectMode && selectedIds.size > 0 && (
                  <button
                    onClick={() => onSynthesize(sc.sub_concept_id, Array.from(selectedIds), true)}
                    className="text-xs px-3 py-1.5 bg-stone-100 border border-stone-300 text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    ✅ 선택 {selectedIds.size}개로 재합성
                  </button>
                )}
                {content?.meta && (
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {content.meta.ai_generated ? '🤖 AI 합성' : '📄 템플릿'}
                  </span>
                )}
              </div>
            </>
          )}

          {content && (
            <>
              {/* 3-View 탭 */}
              <div className="flex gap-1 mt-3 mb-4 bg-gray-100 p-0.5 rounded-lg">
                {[
                  { key: 'optimized' as const, label: '✨ 최적화', desc: '공통+특화 분리' },
                  { key: 'synthesis' as const, label: '🔬 합성 원본', desc: 'AI 합성 결과' },
                  { key: 'original' as const, label: '📄 원문 대본', desc: '전문가별 원문' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setViewMode(tab.key)}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                      viewMode === tab.key
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="block">{tab.label}</span>
                    <span className="block text-[9px] opacity-60">{tab.desc}</span>
                  </button>
                ))}
              </div>

              {viewMode === 'optimized' && <OptimizedView content={content} />}
              {viewMode === 'synthesis' && <SynthesisView content={content} />}
              {viewMode === 'original' && <OriginalView subConceptId={sc.sub_concept_id} keywords={sc.keywords} />}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 바이블 수준 학습 뷰 ──────────────────────────
function OptimizedView({ content }: { content: SubConceptContent }) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['intro', 'theory']))
  const [showAnswers, setShowAnswers] = useState<Set<number>>(new Set())

  const toggleSection = (key: string) =>
    setOpenSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const toggleAnswer = (i: number) =>
    setShowAnswers(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })

  const commonPoints = (content.theory_points || []).filter(tp => tp.expert_count >= 2)
  const specializedPoints = (content.theory_points || []).filter(tp => tp.expert_count < 2)
  const allCases = content.case_studies || content.practical_cases?.map(pc => ({
    title: pc.title, case_type: '일반', situation: pc.scenario, analysis: '', lesson: pc.lesson,
  } as CaseStudy)) || []

  const SectionHeader = ({ id, icon, title, badge, color }: {
    id: string; icon: string; title: string; badge?: string; color: string
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between py-3 px-4 rounded-xl font-bold text-sm transition-all ${color}`}
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        {title}
        {badge && <span className="text-[10px] font-normal px-2 py-0.5 bg-white/60 rounded-full">{badge}</span>}
      </span>
      <span className="text-xs opacity-70">{openSections.has(id) ? '▲' : '▼'}</span>
    </button>
  )

  return (
    <div className="space-y-4">
      {/* 학습 목표 */}
      {content.learning_objectives && content.learning_objectives.length > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white">
          <p className="text-xs font-bold mb-2 opacity-80 uppercase tracking-wider">📌 이 주제를 마치면</p>
          <ul className="space-y-1">
            {content.learning_objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-stone-900 mt-0.5">✓</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. 개념 이해 */}
      <div className="border border-stone-300 rounded-xl overflow-hidden">
        <SectionHeader id="intro" icon="📖" title="개념 이해" color="bg-stone-100 text-stone-900 hover:bg-stone-100" />
        {openSections.has('intro') && (
          <div className="p-5 space-y-5 bg-white">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-stone-100 rounded-full" />
                <p className="text-xs font-bold text-stone-900 uppercase tracking-normal">왜 이것이 중요한가</p>
              </div>
              <p className="text-sm text-gray-800 leading-7 whitespace-pre-line pl-3">{content.explanation.introduction}</p>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-stone-100 rounded-full" />
                <p className="text-xs font-bold text-stone-900 uppercase tracking-normal">핵심 개념 설명</p>
              </div>
              <p className="text-sm text-gray-800 leading-7 whitespace-pre-line pl-3">{content.explanation.core_content}</p>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-stone-100 rounded-full" />
                <p className="text-xs font-bold text-stone-900 uppercase tracking-normal">실무에서의 의미</p>
              </div>
              <p className="text-sm text-gray-800 leading-7 whitespace-pre-line pl-3">{content.explanation.practical_meaning}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. 핵심 이론 포인트 */}
      {(commonPoints.length > 0 || specializedPoints.length > 0) && (
        <div className="border border-stone-300 rounded-xl overflow-hidden">
          <SectionHeader
            id="theory"
            icon="🎯"
            title="핵심 이론 포인트"
            badge={`${(content.theory_points || []).length}개`}
            color="bg-stone-100 text-stone-900 hover:bg-stone-100"
          />
          {openSections.has('theory') && (
            <div className="p-4 space-y-3 bg-white">
              {commonPoints.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-stone-100 rounded-full" />
                    전문가 다수가 공통으로 강조 ({commonPoints.length}개)
                  </p>
                  <div className="space-y-3">
                    {commonPoints.map((tp, i) => (
                      <div key={i} className="bg-stone-100 rounded-xl p-4 border-l-[3px] border-stone-300">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h6 className="font-bold text-gray-900 text-sm leading-tight">{tp.title}</h6>
                          <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded-full font-medium">
                            전문가 {tp.expert_count}명
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-7 whitespace-pre-line">{tp.content}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {specializedPoints.length > 0 && (
                <>
                  {commonPoints.length > 0 && <div className="border-t my-2" />}
                  <p className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-stone-100 rounded-full" />
                    전문가 특화 관점 ({specializedPoints.length}개)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {specializedPoints.map((tp, i) => (
                      <div key={i} className="bg-stone-100 rounded-xl p-4 border-l-[3px] border-stone-300">
                        <h6 className="font-bold text-gray-900 text-sm mb-2">{tp.title}</h6>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{tp.content}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. 전문가 관점 비교 */}
      {content.expert_comparison && content.expert_comparison.perspectives?.length > 0 && (
        <div className="border border-stone-300 rounded-xl overflow-hidden">
          <SectionHeader id="compare" icon="⚖️" title="전문가 관점 비교" color="bg-stone-100 text-stone-900 hover:bg-stone-100" />
          {openSections.has('compare') && (
            <div className="p-4 space-y-3 bg-white">
              <p className="text-sm text-gray-600 leading-relaxed">{content.expert_comparison.overview}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {content.expert_comparison.perspectives.map((p, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-stone-300 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-stone-100 rounded-lg flex items-center justify-center text-[11px] font-bold text-stone-900">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <p className="font-bold text-sm text-stone-900">{p.label}</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">{p.viewpoint}</p>
                    {p.pros_cons && (
                      <p className="text-xs text-gray-500 italic border-t pt-2 mt-2">{p.pros_cons}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-stone-100 border border-stone-300 rounded-xl p-4">
                <p className="text-xs font-bold text-stone-900 mb-1.5">🔗 종합 판단</p>
                <p className="text-sm text-gray-800 leading-relaxed">{content.expert_comparison.synthesis}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 실전 사례 (경매 사건번호 포함) */}
      {allCases.length > 0 && (
        <div className="border border-stone-300 rounded-xl overflow-hidden">
          <SectionHeader
            id="cases"
            icon="📋"
            title="실전 사례 분석"
            badge={`${allCases.length}건`}
            color="bg-stone-100 text-stone-900 hover:bg-stone-100"
          />
          {openSections.has('cases') && (
            <div className="p-4 space-y-4 bg-white">
              {allCases.map((cs, i) => (
                <div key={i} className="rounded-xl border border-stone-300 overflow-hidden">
                  <div className="bg-stone-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-stone-100 rounded-lg flex items-center justify-center text-[11px] font-bold text-stone-900">
                        {i + 1}
                      </span>
                      <h6 className="font-bold text-sm text-stone-900">{cs.title}</h6>
                    </div>
                    <div className="flex items-center gap-2">
                      {cs.case_number && (
                        <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-900 rounded-full font-mono font-medium">
                          📄 {cs.case_number}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-900 rounded-full font-medium">
                        {cs.case_type}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">📌 상황</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{cs.situation}</p>
                    </div>
                    {cs.analysis && (
                      <div className="border-t pt-3">
                        <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">🔍 분석</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{cs.analysis}</p>
                      </div>
                    )}
                    {cs.key_numbers && cs.key_numbers.length > 0 && (
                      <div className="flex flex-wrap gap-2 border-t pt-3">
                        {cs.key_numbers.map((num, j) => (
                          <span key={j} className="text-xs px-2.5 py-1 bg-stone-100 border border-stone-300 text-stone-900 rounded-lg font-mono">
                            {num}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="bg-stone-100 border border-stone-300 rounded-lg p-3">
                      <p className="text-xs font-bold text-stone-900 mb-1">💡 핵심 교훈</p>
                      <p className="text-sm text-stone-900 leading-relaxed">{cs.lesson}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. 실전 가이드 */}
      {content.practical_guide && (
        <div className="border border-stone-300 rounded-xl overflow-hidden">
          <SectionHeader id="guide" icon="🗺️" title="실전 실행 가이드" color="bg-stone-100 text-stone-900 hover:bg-stone-100" />
          {openSections.has('guide') && (
            <div className="p-4 space-y-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {content.practical_guide.before_action?.length > 0 && (
                  <div className="bg-stone-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-stone-900 mb-3 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-stone-100 rounded-full flex items-center justify-center text-[10px]">1</span>
                      행동 전 확인
                    </p>
                    <ul className="space-y-2">
                      {content.practical_guide.before_action.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-stone-900 mt-0.5 flex-shrink-0">□</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {content.practical_guide.during_action?.length > 0 && (
                  <div className="bg-stone-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-stone-900 mb-3 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-stone-100 rounded-full flex items-center justify-center text-[10px]">2</span>
                      진행 중 확인
                    </p>
                    <ul className="space-y-2">
                      {content.practical_guide.during_action.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-stone-900 mt-0.5 flex-shrink-0">□</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {content.practical_guide.after_action?.length > 0 && (
                  <div className="bg-stone-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-stone-900 mb-3 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-stone-100 rounded-full flex items-center justify-center text-[10px]">3</span>
                      완료 후 확인
                    </p>
                    <ul className="space-y-2">
                      {content.practical_guide.after_action.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-stone-900 mt-0.5 flex-shrink-0">□</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {content.practical_guide.common_mistakes?.length > 0 && (
                <div className="bg-stone-100 border border-stone-300 rounded-xl p-4">
                  <p className="text-xs font-bold text-stone-900 mb-3">⚠️ 흔한 실수 & 주의사항</p>
                  <ul className="space-y-2">
                    {content.practical_guide.common_mistakes.map((m, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-stone-900 font-bold mt-0.5 flex-shrink-0">✗</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {content.practical_guide.pro_tips?.length > 0 && (
                <div className="bg-stone-100 border border-stone-300 rounded-xl p-4">
                  <p className="text-xs font-bold text-stone-900 mb-3">⭐ 전문가 팁</p>
                  <ul className="space-y-2">
                    {content.practical_guide.pro_tips.map((tip, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-stone-900 font-bold mt-0.5 flex-shrink-0">★</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. 마스터 체크리스트 */}
      {content.checklist && content.checklist.length > 0 && (
        <div className="border border-stone-300 rounded-xl overflow-hidden">
          <SectionHeader id="checklist" icon="✅" title="마스터 체크리스트" badge={`${content.checklist.length}항목`} color="bg-stone-100 text-stone-900 hover:bg-stone-100" />
          {openSections.has('checklist') && (
            <div className="p-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {content.checklist.map((item, i) => (
                  <label key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-stone-100 cursor-pointer group transition-colors">
                    <input type="checkbox" className="mt-0.5 flex-shrink-0 accent-indigo-600" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-relaxed">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. 자기 진단 (모범 답안 포함) */}
      {content.self_assessment && content.self_assessment.length > 0 && (
        <div className="border border-stone-300 rounded-xl overflow-hidden">
          <SectionHeader id="quiz" icon="❓" title="자기 진단 테스트" badge={`${content.self_assessment.length}문항`} color="bg-stone-100 text-stone-900 hover:bg-stone-100" />
          {openSections.has('quiz') && (
            <div className="p-4 space-y-3 bg-white">
              {content.self_assessment.map((sa, i) => (
                <div key={i} className="border border-stone-300 rounded-xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center text-xs font-bold text-stone-900">
                        Q{i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 leading-relaxed">{sa.question}</p>
                        <p className="text-xs text-gray-500 mt-1">💡 힌트: {sa.hint}</p>
                      </div>
                    </div>
                  </div>
                  {sa.model_answer && (
                    <div className="border-t">
                      <button
                        onClick={() => toggleAnswer(i)}
                        className="w-full px-4 py-2 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-100 transition-colors text-left flex items-center gap-1.5"
                      >
                        {showAnswers.has(i) ? '▲ 모범 답안 숨기기' : '▼ 모범 답안 보기'}
                      </button>
                      {showAnswers.has(i) && (
                        <div className="px-4 py-3 bg-white">
                          <p className="text-sm text-gray-700 leading-7">{sa.model_answer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 메타 */}
      {content.meta && (
        <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-2">
          <span className="px-2 py-0.5 bg-gray-100 rounded">{content.meta.ai_generated ? '🤖 AI 합성' : '📄 대본 기반'}</span>
          <span>전문가 {content.meta.source_expert_count}명</span>
          <span>영상 {content.meta.source_video_count}개</span>
          <span>{content.meta.generated_at?.substring(0, 10)}</span>
        </div>
      )}
    </div>
  )
}

// ─── 합성 원본 뷰: 필드별 원시 데이터 ─────────────
function SynthesisView({ content }: { content: SubConceptContent }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
        <p>💡 이 뷰는 AI 합성 엔진이 생성한 원본 데이터를 필드별로 보여줍니다.</p>
        <p>&quot;최적화&quot; 뷰에서는 이 데이터를 더 읽기 좋게 재구성합니다.</p>
      </div>

      {/* explanation */}
      <FieldBlock label="explanation" color="purple">
        <FieldItem label="introduction" value={content.explanation.introduction} />
        <FieldItem label="core_content" value={content.explanation.core_content} />
        <FieldItem label="practical_meaning" value={content.explanation.practical_meaning} />
      </FieldBlock>

      {/* theory_points */}
      <FieldBlock label={`theory_points [${content.theory_points?.length || 0}]`} color="blue">
        {(content.theory_points || []).map((tp, i) => (
          <div key={i} className="bg-white rounded p-3 border border-stone-300 mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-mono text-stone-900">[{i}].title</span>
              <span className="text-gray-400">expert_count: {tp.expert_count}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">{tp.title}</p>
            <p className="text-xs font-mono text-stone-900 mb-1">[{i}].content</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{tp.content}</p>
          </div>
        ))}
      </FieldBlock>

      {/* expert_comparison */}
      <FieldBlock label="expert_comparison" color="amber">
        <FieldItem label="overview" value={content.expert_comparison?.overview} />
        {(content.expert_comparison?.perspectives || []).map((p, i) => (
          <div key={i} className="bg-white rounded p-2 border border-stone-300 mb-1 text-sm">
            <span className="font-mono text-stone-900 text-xs">perspectives[{i}]</span>
            <p><b>{p.label}</b>: {p.viewpoint}</p>
            {p.pros_cons && <p className="text-xs text-gray-500">{p.pros_cons}</p>}
          </div>
        ))}
        <FieldItem label="synthesis" value={content.expert_comparison?.synthesis} />
      </FieldBlock>

      {/* case_studies (신규) */}
      {(content.case_studies && content.case_studies.length > 0) && (
        <FieldBlock label={`case_studies [${content.case_studies.length}]`} color="green">
          {content.case_studies.map((cs, i) => (
            <div key={i} className="bg-white rounded p-2 border border-stone-300 mb-1 text-sm">
              <span className="font-mono text-stone-900 text-xs">[{i}] {cs.case_type}</span>
              {cs.case_number && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded font-mono">{cs.case_number}</span>}
              <p><b>{cs.title}</b></p>
              <p className="text-gray-700 whitespace-pre-line text-xs mt-1">{cs.situation}</p>
              {cs.analysis && <p className="text-stone-900 text-xs mt-1">분석: {cs.analysis}</p>}
              <p className="text-stone-900 mt-1 text-xs">교훈: {cs.lesson}</p>
              {cs.key_numbers && cs.key_numbers.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {cs.key_numbers.map((n, j) => <span key={j} className="text-[10px] px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded font-mono">{n}</span>)}
                </div>
              )}
            </div>
          ))}
        </FieldBlock>
      )}

      {/* practical_guide (신규) */}
      {content.practical_guide && (
        <FieldBlock label="practical_guide" color="teal">
          <div className="text-xs space-y-2">
            {content.practical_guide.before_action?.length > 0 && (
              <div><p className="font-mono text-stone-900 font-bold">before_action:</p>
              {content.practical_guide.before_action.map((a, i) => <p key={i} className="ml-2">[{i}] {a}</p>)}</div>
            )}
            {content.practical_guide.during_action?.length > 0 && (
              <div><p className="font-mono text-stone-900 font-bold">during_action:</p>
              {content.practical_guide.during_action.map((a, i) => <p key={i} className="ml-2">[{i}] {a}</p>)}</div>
            )}
            {content.practical_guide.after_action?.length > 0 && (
              <div><p className="font-mono text-stone-900 font-bold">after_action:</p>
              {content.practical_guide.after_action.map((a, i) => <p key={i} className="ml-2">[{i}] {a}</p>)}</div>
            )}
            {content.practical_guide.common_mistakes?.length > 0 && (
              <div><p className="font-mono text-stone-900 font-bold">common_mistakes:</p>
              {content.practical_guide.common_mistakes.map((m, i) => <p key={i} className="ml-2 text-stone-900">[{i}] {m}</p>)}</div>
            )}
            {content.practical_guide.pro_tips?.length > 0 && (
              <div><p className="font-mono text-stone-900 font-bold">pro_tips:</p>
              {content.practical_guide.pro_tips.map((t, i) => <p key={i} className="ml-2 text-stone-900">[{i}] {t}</p>)}</div>
            )}
          </div>
        </FieldBlock>
      )}

      {/* practical_cases (구형 호환) */}
      {(!content.case_studies && content.practical_cases && content.practical_cases.length > 0) && (
        <FieldBlock label={`practical_cases [${content.practical_cases.length}] (구형)`} color="green">
          {content.practical_cases.map((pc, i) => (
            <div key={i} className="bg-white rounded p-2 border border-stone-300 mb-1 text-sm">
              <span className="font-mono text-stone-900 text-xs">[{i}]</span>
              <p><b>{pc.title}</b></p>
              <p className="text-gray-700 whitespace-pre-line">{pc.scenario}</p>
              <p className="text-stone-900 mt-1">교훈: {pc.lesson}</p>
            </div>
          ))}
        </FieldBlock>
      )}

      {/* checklist + self_assessment */}
      <div className="grid grid-cols-2 gap-3">
        <FieldBlock label={`checklist [${content.checklist?.length || 0}]`} color="indigo">
          {(content.checklist || []).map((item, i) => (
            <p key={i} className="text-sm text-gray-700 py-0.5">[{i}] {item}</p>
          ))}
        </FieldBlock>
        <FieldBlock label={`self_assessment [${content.self_assessment?.length || 0}]`} color="rose">
          {(content.self_assessment || []).map((sa, i) => (
            <div key={i} className="text-sm py-0.5">
              <p className="font-medium">[{i}] {sa.question}</p>
              <p className="text-xs text-gray-500">hint: {sa.hint}</p>
            </div>
          ))}
        </FieldBlock>
      </div>

      {/* meta */}
      {content.meta && (
        <FieldBlock label="meta" color="gray">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
{JSON.stringify(content.meta, null, 2)}
          </pre>
        </FieldBlock>
      )}
    </div>
  )
}

function FieldBlock({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  const bgMap: Record<string, string> = {
    purple: 'bg-stone-100 border-stone-300',
    blue: 'bg-stone-100 border-stone-300',
    amber: 'bg-stone-100 border-stone-300',
    green: 'bg-stone-100 border-stone-300',
    indigo: 'bg-stone-100 border-stone-300',
    rose: 'bg-stone-100 border-stone-300',
    gray: 'bg-gray-50 border-gray-200',
    teal: 'bg-stone-100 border-stone-300',
  }
  const textMap: Record<string, string> = {
    purple: 'text-stone-900',
    blue: 'text-stone-900',
    amber: 'text-stone-900',
    green: 'text-stone-900',
    indigo: 'text-stone-900',
    rose: 'text-stone-900',
    gray: 'text-gray-700',
    teal: 'text-stone-900',
  }
  return (
    <div className={`rounded-lg p-4 border ${bgMap[color] || bgMap.gray}`}>
      <p className={`text-xs font-mono font-bold mb-2 ${textMap[color] || textMap.gray}`}>{label}</p>
      {children}
    </div>
  )
}

function FieldItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="mb-2">
      <p className="text-xs font-mono text-gray-500 mb-0.5">.{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  )
}

// ─── 원문 대본 뷰: 전문가별 원본 세그먼트 ──────────
function OriginalView({ subConceptId, keywords }: { subConceptId: number; keywords: string[] }) {
  const [segments, setSegments] = useState<SegmentData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total_segments: number; expert_count: number; video_count: number } | null>(null)

  const loadSegments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ontology/sub-concepts/segments?sub_concept_id=${subConceptId}`)
      if (!res.ok) throw new Error('원문 로드 실패')
      const data = await res.json()
      setSegments(data.expert_groups || [])
      setStats(data.stats || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [subConceptId])

  useEffect(() => {
    loadSegments()
  }, [loadSegments])

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-6 h-6 border-3 border-stone-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">원문 대본 로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-stone-900 text-sm mb-3">{error}</p>
        <button onClick={loadSegments} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300">
          재시도
        </button>
      </div>
    )
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        <p>이 주제에 대한 원문 대본 세그먼트가 없습니다.</p>
        <p className="text-xs mt-1">대본 매핑이 완료되지 않았을 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 통계 */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-4 text-xs text-gray-600">
          <span>📄 세그먼트 {stats.total_segments}개</span>
          <span>👤 전문가 {stats.expert_count}명</span>
          <span>🎬 영상 {stats.video_count}개</span>
          <span className="text-gray-400 ml-auto">키워드 주변 ±400자 추출</span>
        </div>
      )}

      {/* 전문가별 그룹 */}
      {segments.map((group, gIdx) => (
        <div key={gIdx} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-stone-100 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {String.fromCharCode(65 + gIdx)}
              </span>
              <span className="text-sm font-medium text-gray-700">
                전문가 {String.fromCharCode(65 + gIdx)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>세그먼트 {group.segment_count}개</span>
              <span>평균 관련도 {group.avg_relevance}</span>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {group.segments.map((seg, sIdx) => (
              <div key={sIdx} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                  <span>📹 {seg.title}</span>
                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-900 rounded text-[10px]">
                    키워드: {seg.keyword_matched}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {highlightKeywords(seg.text, keywords)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// 키워드 하이라이트 (간단 구현)
function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords || keywords.length === 0) return text

  // 키워드 위치 찾기
  const parts: Array<{ text: string; highlight: boolean }> = []
  let remaining = text

  // 간단한 구현: 키워드가 있으면 앞뒤로 분리
  const regex = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const matches = text.split(regex)

  return (
    <>
      {matches.map((part, i) => {
        const isKeyword = keywords.some(kw => part.toLowerCase() === kw.toLowerCase())
        return isKeyword ? (
          <mark key={i} className="bg-stone-100 text-stone-900 px-0.5 rounded font-medium">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}

// ─── 다운로드 버튼 ───────────────────────────────
function DownloadButtons({ conceptId, type }: { conceptId: number; type: 'lecture_plan' | 'ebook' }) {
  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => window.open(`/api/ontology/sub-concepts/export?concept_id=${conceptId}&type=${type}`, '_blank')}
        className="px-4 py-2 bg-stone-100 text-white rounded-lg hover:bg-stone-100 transition-colors text-sm font-medium"
      >
        📄 DOCX 다운로드
      </button>
      <button
        onClick={() => window.open(`/api/ontology/sub-concepts/export-pdf?concept_id=${conceptId}&type=${type}`, '_blank')}
        className="px-4 py-2 bg-stone-100 text-white rounded-lg hover:bg-stone-100 transition-colors text-sm font-medium"
      >
        📕 PDF 다운로드
      </button>
    </div>
  )
}

// ─── 강의안 뷰 ──────────────────────────────────
function LecturePlanView({ concept, subConcepts, importance, onSynthesize }: {
  concept: SampleData['concept']; subConcepts: SubConcept[]; importance: SampleData['importance']; onSynthesize: (id: number, selectedIds?: string[], forceRegenerate?: boolean) => void
}) {
  const totalMinutes = subConcepts.reduce((sum, sc) => sum + sc.estimated_minutes, 0)

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 mb-3">🎓 강의안: {concept.name}</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><b>출처:</b> NPLatform 부동산 전문가 {importance.expert_count}명의 강의를 AI가 종합 분석</p>
          <p><b>총 강의 시간:</b> {totalMinutes}분 ({Math.round(totalMinutes / 60 * 10) / 10}시간)</p>
          <p><b>대상 수준:</b> {concept.difficulty <= 2 ? '초보~중급' : '중급~고급'}</p>
          <p><b>주제(Topic) 수:</b> {subConcepts.length}개</p>
        </div>
      </div>

      {/* 커리큘럼 시간표 */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">커리큘럼 시간표</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-stone-100">
                <th className="text-left px-3 py-2 border text-stone-900">시간</th>
                <th className="text-left px-3 py-2 border text-stone-900">주제(Topic)</th>
                <th className="text-left px-3 py-2 border text-stone-900">방식</th>
                <th className="text-left px-3 py-2 border text-stone-900">근거 영상</th>
                <th className="text-left px-3 py-2 border text-stone-900">전문가</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50">
                <td className="px-3 py-2 border text-xs">0:00~0:05</td>
                <td className="px-3 py-2 border font-medium">오프닝 &amp; 개념 지도</td>
                <td className="px-3 py-2 border text-xs">설명</td>
                <td className="px-3 py-2 border text-xs">-</td>
                <td className="px-3 py-2 border text-xs">-</td>
              </tr>
              {(() => {
                let time = 5
                return subConcepts.map(sc => {
                  const start = time
                  const end = time + sc.estimated_minutes
                  time = end
                  const fmt = (m: number) => `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, '0')}`
                  return (
                    <tr key={sc.sub_concept_id} className="hover:bg-stone-100/30">
                      <td className="px-3 py-2 border text-xs">{fmt(start)}~{fmt(end)}</td>
                      <td className="px-3 py-2 border font-medium">{sc.name}</td>
                      <td className="px-3 py-2 border text-xs">
                        {sc.order_in_parent <= 2 ? '이론' : sc.order_in_parent <= 5 ? '이론+사례' : '실습'}
                      </td>
                      <td className="px-3 py-2 border text-xs font-medium text-stone-900">{sc.video_count}개</td>
                      <td className="px-3 py-2 border text-xs font-medium text-stone-900">{sc.expert_count}명</td>
                    </tr>
                  )
                })
              })()}
              <tr className="bg-gray-50">
                <td className="px-3 py-2 border text-xs">
                  {Math.floor((totalMinutes + 5) / 60)}:{((totalMinutes + 5) % 60).toString().padStart(2, '0')}~
                  {Math.floor((totalMinutes + 15) / 60)}:{((totalMinutes + 15) % 60).toString().padStart(2, '0')}
                </td>
                <td className="px-3 py-2 border font-medium">종합 정리 &amp; Q&amp;A</td>
                <td className="px-3 py-2 border text-xs">참여</td>
                <td className="px-3 py-2 border text-xs">-</td>
                <td className="px-3 py-2 border text-xs">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 주제별 강의 노트 (3-View 적용) */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">주제별 강의 노트</h3>
        <div className="space-y-3">
          {subConcepts.map(sc => (
            <TopicContentViewer key={sc.sub_concept_id} sc={sc} onSynthesize={onSynthesize} />
          ))}
        </div>
      </div>

      <DownloadButtons conceptId={concept.concept_id} type="lecture_plan" />
    </div>
  )
}

// ─── 전자책 뷰 ──────────────────────────────────
function EbookView({ concept, subConcepts, importance, onSynthesize }: {
  concept: SampleData['concept']; subConcepts: SubConcept[]; importance: SampleData['importance']; onSynthesize: (id: number, selectedIds?: string[], forceRegenerate?: boolean) => void
}) {
  const synthesizedCount = subConcepts.filter(sc => sc.content).length

  return (
    <div className="space-y-6">
      {/* 전자책 표지 */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
        <p className="text-xs opacity-70 mb-2">📚 전자책 — 체계적 전문 실용서</p>
        <h3 className="text-xl font-bold mb-2">{concept.name}</h3>
        <p className="text-sm opacity-80">
          NPLatform 부동산 전문가 {importance.expert_count}명의 강의를 AI가 종합 분석
        </p>
        <div className="flex gap-6 mt-4 text-xs">
          <span>챕터 {subConcepts.length}개</span>
          <span>합성 완료 {synthesizedCount}/{subConcepts.length}</span>
          <span>총 영상 {subConcepts.reduce((s, sc) => s + sc.video_count, 0)}개</span>
        </div>
      </div>

      {/* 목차 */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">목차</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-500">Part 1. 온톨로지 분석 개요</p>
          <p className="text-sm text-gray-500">Part 2. 종합 요약</p>
          {subConcepts.map(sc => (
            <div key={sc.sub_concept_id} className="flex items-center justify-between text-sm">
              <span className={sc.content ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                Chapter {sc.order_in_parent}. {sc.name}
              </span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>영상 {sc.video_count}개</span>
                <span>전문가 {sc.expert_count}명</span>
                <span>{sc.content ? '✓ 합성됨' : '... 미합성'}</span>
              </div>
            </div>
          ))}
          <p className="text-sm text-gray-500">Part 3. 종합 사례 연구</p>
          <p className="text-sm text-gray-500">Part 4. 학습 체크리스트 &amp; 자기 진단</p>
        </div>
      </div>

      {/* 챕터별 콘텐츠 (3-View 적용) */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">챕터별 콘텐츠</h3>
        <div className="space-y-3">
          {subConcepts.map(sc => (
            <TopicContentViewer key={sc.sub_concept_id} sc={sc} onSynthesize={onSynthesize} />
          ))}
        </div>
      </div>

      <DownloadButtons conceptId={concept.concept_id} type="ebook" />
    </div>
  )
}

// ─── 뉴스레터 타입 레이블 ────────────────────────
const NEWSLETTER_TYPE_LABELS: Record<string, string> = {
  daily_lesson: '📚 오늘의 학습',
  case_study: '🔍 사례 분석',
  expert_compare: '⚖️ 전문가 비교',
  learning_tip: '💡 학습 팁',
  weekly_summary: '📊 주간 요약',
}

// ─── 뉴스레터 뷰 ────────────────────────────────
function NewsletterView({ concept, subConcepts, importance }: {
  concept: SampleData['concept']; subConcepts: SubConcept[]; importance: SampleData['importance']
}) {
  const [nlType, setNlType] = useState<string>('daily_lesson')
  const [nlLoading, setNlLoading] = useState(false)
  const [nlData, setNlData] = useState<{ newsletter: any; html: string } | null>(null)
  const [nlError, setNlError] = useState<string | null>(null)
  const [showHtml, setShowHtml] = useState(false)

  const generateNewsletter = useCallback(async () => {
    setNlLoading(true)
    setNlError(null)
    setNlData(null)
    try {
      const res = await fetch('/api/ontology/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ai',
          type: nlType,
          concept_id: concept.concept_id,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `API 오류 ${res.status}`)
      }
      const data = await res.json()
      setNlData(data)
    } catch (err: any) {
      setNlError(err.message)
    } finally {
      setNlLoading(false)
    }
  }, [nlType, concept.concept_id])

  const newsletter = nlData?.newsletter
  const ai = newsletter?.ai_content

  return (
    <div className="space-y-6">
      {/* 컨트롤 바 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3">🤖 AI 뉴스레터 실시간 생성</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(NEWSLETTER_TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setNlType(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                nlType === key
                  ? 'bg-stone-100 text-white border-stone-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateNewsletter}
            disabled={nlLoading}
            className="px-4 py-2 bg-stone-100 text-white text-sm font-medium rounded-lg hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {nlLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                생성 중...
              </>
            ) : (
              <>📨 뉴스레터 생성</>
            )}
          </button>
          <span className="text-xs text-gray-400">개념: <b className="text-gray-700">{concept.name}</b></span>
          {nlData && !nlLoading && (
            <button
              onClick={() => setShowHtml(v => !v)}
              className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
            >
              {showHtml ? '📋 구조화 뷰' : '🌐 HTML 미리보기'}
            </button>
          )}
        </div>
        {nlError && (
          <div className="mt-3 p-3 bg-stone-100 border border-stone-300 rounded-lg text-xs text-stone-900">
            ⚠️ {nlError}
          </div>
        )}
      </div>

      {/* AI 생성 결과 */}
      {nlLoading && (
        <div className="border border-stone-300 rounded-xl p-8 text-center bg-stone-100">
          <div className="w-8 h-8 border-4 border-stone-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-900 font-medium">AI가 뉴스레터를 생성하고 있습니다...</p>
          <p className="text-xs text-stone-900 mt-1">개념 &quot;{concept.name}&quot; 기반으로 합성 중</p>
        </div>
      )}

      {nlData && !nlLoading && (
        showHtml ? (
          /* HTML 미리보기 */
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 flex items-center justify-between border-b">
              <span className="text-xs text-gray-500 font-medium">📧 이메일 HTML 미리보기</span>
              <button
                onClick={() => {
                  const blob = new Blob([nlData.html], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `newsletter-${concept.concept_id}.html`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-xs px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
              >
                💾 HTML 저장
              </button>
            </div>
            <iframe
              srcDoc={nlData.html}
              className="w-full"
              style={{ height: '600px', border: 'none' }}
              title="Newsletter Preview"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          /* 구조화 뷰 */
          <div className="border-2 border-stone-300 rounded-xl overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs opacity-80">📨 부동산 투자 교육 뉴스레터</span>
                <span className="text-xs opacity-70 bg-white/20 px-2 py-0.5 rounded-full">
                  {NEWSLETTER_TYPE_LABELS[newsletter.newsletter_type] || newsletter.newsletter_type}
                </span>
              </div>
              <h3 className="text-lg font-bold leading-tight">{ai?.headline || newsletter.title}</h3>
              <p className="text-xs opacity-70 mt-1">
                {new Date(newsletter.generated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="px-6 py-5 space-y-5 bg-white">
              {/* 본문 */}
              {ai?.body && (
                <section>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{ai.body}</p>
                </section>
              )}

              {/* 핵심 포인트 */}
              {ai?.key_takeaways && ai.key_takeaways.length > 0 && (
                <section>
                  <h4 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-1">
                    ✅ 핵심 포인트
                  </h4>
                  <div className="bg-stone-100 rounded-lg p-3 space-y-2">
                    {ai.key_takeaways.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-900 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 온톨로지 위치 */}
              {newsletter.ontology_context && (
                <section className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">📍 학습 로드맵 위치</h4>
                  <div className="text-xs text-gray-600 space-y-1.5">
                    {newsletter.ontology_context.roadmap_position && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-900">
                          {newsletter.ontology_context.roadmap_position.level} 과정
                        </span>
                        <span className="text-gray-400">·</span>
                        <span>{newsletter.ontology_context.roadmap_position.lecture_level}</span>
                        <span className="text-gray-400">·</span>
                        <span>
                          {newsletter.ontology_context.roadmap_position.order_in_level}/{newsletter.ontology_context.roadmap_position.total_in_level} 강의
                        </span>
                      </div>
                    )}
                    {newsletter.ontology_context.prerequisites?.length > 0 && (
                      <p>선수 개념: <span className="text-stone-900">{newsletter.ontology_context.prerequisites.join(', ')}</span></p>
                    )}
                    {newsletter.ontology_context.successors?.length > 0 && (
                      <p>후속 개념: <span className="text-stone-900">{newsletter.ontology_context.successors.join(', ')}</span></p>
                    )}
                    {newsletter.ontology_context.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {newsletter.ontology_context.keywords.map((kw: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-stone-100 text-stone-900 rounded text-[10px]">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 관련 개념 */}
              {newsletter.related_concepts && newsletter.related_concepts.length > 0 && (
                <section>
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">🔗 관련 개념</h4>
                  <div className="flex flex-wrap gap-2">
                    {newsletter.related_concepts.map((rc: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {rc.concept_name}
                        <span className="text-gray-400 ml-1">({rc.domain_name})</span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* CTA */}
              {ai?.call_to_action && (
                <section className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-stone-900">{ai.call_to_action}</p>
                </section>
              )}

              {/* 캡슐 정보 */}
              {newsletter.target_capsule && (
                <section className="border-t pt-4">
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">📦 오늘의 학습 캡슐</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>제목: <b>{newsletter.target_capsule.capsule_title}</b></p>
                    <p>수준: {newsletter.target_capsule.level}</p>
                    <p>개요: {newsletter.target_capsule.overview}</p>
                    <p>전문가: NPLatform 전문가 {newsletter.target_capsule.expert_count}명</p>
                  </div>
                </section>
              )}

              <div className="text-center text-xs text-gray-400 pt-4 border-t">
                <p>NPLatform 부동산 전문가 {importance.expert_count}명의 강의를</p>
                <p>AI가 종합 분석하여 생성한 콘텐츠입니다.</p>
              </div>
            </div>
          </div>
        )
      )}

      {/* 미생성 상태: 발송 계획 미리보기 */}
      {!nlData && !nlLoading && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h4 className="font-bold text-sm text-gray-900 mb-3">📅 이 개념의 뉴스레터 발송 계획</h4>
          <p className="text-xs text-gray-500 mb-3">
            &quot;{concept.name}&quot; 개념의 하위 주제 {subConcepts.length}개를 순차적으로 발송합니다.
            위 버튼으로 샘플 뉴스레터를 생성해보세요.
          </p>
          <div className="space-y-2">
            {subConcepts.map((sc, i) => (
              <div key={sc.sub_concept_id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-100 last:border-0">
                <span className="w-8 text-center text-gray-400 font-mono">D+{i + 1}</span>
                <span className="font-medium text-gray-800 flex-1">{sc.name}</span>
                <span className="text-gray-400">{sc.video_count}개 영상</span>
                <span className="text-gray-400">전문가 {sc.expert_count}명</span>
                {sc.content && <span className="text-stone-900 text-[10px]">✓ 합성완료</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Atomic 캡슐 미리보기 ─────────────────────
function AtomicCapsulePreview({ conceptId, conceptName }: { conceptId: number; conceptName: string }) {
  const [capsules, setCapsules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const loadCapsules = () => {
    setLoading(true)
    fetch(`/api/ontology/atomic-capsules?concept_id=${conceptId}`)
      .then(r => r.json())
      .then(data => setCapsules(data.capsules || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCapsules() }, [conceptId])

  const handleGenerate = async () => {
    setGenerating(true)
    setGenMsg('구조 분해 중...')
    try {
      const res = await fetch('/api/ontology/atomic-capsules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: conceptId }),
      })
      setGenMsg('AI 합성 중... (1~3분)')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')
      setGenMsg(`완료! ${data.total_generated || 0}개 캡슐 생성`)
      setTimeout(() => { setGenMsg(''); loadCapsules() }, 1500)
    } catch (e: any) {
      setGenMsg(`오류: ${e.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const DIFF_COLORS: Record<string, string> = {
    beginner: 'bg-stone-100 text-stone-900',
    intermediate: 'bg-stone-100 text-stone-900',
    advanced: 'bg-stone-100 text-stone-900',
  }
  const DIFF_LABELS: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Atomic 캡슐 로딩 중...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">⚡ Atomic 캡슐 ({capsules.length}개)</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            &quot;{conceptName}&quot;을 원자적 학습 단위로 분해한 완전 자기완결형 캡슐
          </p>
        </div>
        <div className="flex gap-2">
          {capsules.length > 0 && (
            <a
              href={`/curriculum/concept/${conceptId}`}
              className="text-xs text-stone-900 hover:underline"
            >
              학습 페이지 →
            </a>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-3 py-1.5 text-xs bg-stone-100 text-white rounded-lg hover:bg-stone-100 disabled:opacity-50"
          >
            {generating ? '생성 중...' : capsules.length === 0 ? '캡슐 생성' : '재생성'}
          </button>
        </div>
      </div>

      {genMsg && (
        <div className="text-xs text-stone-900 flex items-center gap-1.5">
          {generating && <div className="w-3 h-3 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />}
          {genMsg}
        </div>
      )}

      {capsules.length === 0 && !generating && (
        <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-1">Atomic 캡슐이 아직 없습니다</p>
          <p className="text-xs text-gray-400">위 버튼으로 AI가 이 개념을 원자적 학습 단위로 분해합니다</p>
        </div>
      )}

      {capsules.length > 0 && (
        <div className="space-y-2">
          {capsules.map((cap: any, idx: number) => {
            const content = cap.content_json || cap.progress?.content_json
            const isExpanded = expandedIdx === idx
            const diffColor = DIFF_COLORS[cap.difficulty] || DIFF_COLORS.beginner
            const diffLabel = DIFF_LABELS[cap.difficulty] || cap.difficulty

            return (
              <div key={cap.atomic_id || idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs text-gray-400 font-mono w-5">{cap.order_in_concept}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${diffColor}`}>
                    {diffLabel}
                  </span>
                  <span className="text-sm font-medium text-gray-800 flex-1 truncate">{cap.topic}</span>
                  <span className="text-[10px] text-gray-400">{cap.estimated_min}분</span>
                  <span className="text-gray-300">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && content && (
                  <div className="px-4 pb-4 border-t border-gray-100 space-y-3 text-xs">
                    {/* 개념 정의 */}
                    <div>
                      <p className="font-bold text-stone-900 mb-1">📖 개념 정의</p>
                      <div className="bg-stone-100 rounded-lg p-3">
                        <p className="text-gray-700 text-[11px] leading-relaxed">{content.definition?.formal}</p>
                      </div>
                      <p className="text-gray-600 mt-1.5 leading-relaxed">{content.definition?.plain}</p>
                    </div>

                    {/* 법령 근거 */}
                    {content.legal_foundation?.laws?.length > 0 && (
                      <div>
                        <p className="font-bold text-stone-900 mb-1">⚖️ 법령 근거</p>
                        <div className="space-y-1">
                          {content.legal_foundation.laws.slice(0, 3).map((law: any, i: number) => (
                            <div key={i} className="bg-stone-100 rounded px-2.5 py-1.5">
                              <span className="font-medium text-stone-900">{law.law_name}</span>
                              <span className="text-stone-900 ml-1">{law.article}</span>
                              <span className="text-gray-500 ml-1.5">— {law.summary}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 실전 사례 */}
                    {content.cases && (
                      <div>
                        <p className="font-bold text-stone-900 mb-1">📋 실전 사례</p>
                        <div className="bg-stone-100 rounded-lg p-2.5 mb-1.5">
                          <p className="text-[10px] text-stone-900 font-medium mb-0.5">성공 사례</p>
                          <p className="text-gray-700 leading-relaxed">{content.cases.success_case?.slice(0, 200)}...</p>
                        </div>
                        <div className="bg-stone-100 rounded-lg p-2.5">
                          <p className="text-[10px] text-stone-900 font-medium mb-0.5">실패 사례</p>
                          <p className="text-gray-700 leading-relaxed">{content.cases.failure_case?.slice(0, 200)}...</p>
                        </div>
                      </div>
                    )}

                    {/* 연습문제 미리보기 */}
                    {content.quiz?.length > 0 && (
                      <div>
                        <p className="font-bold text-stone-900 mb-1">📝 연습문제 ({content.quiz.length}개)</p>
                        <div className="bg-stone-100 rounded-lg p-2.5">
                          <p className="text-gray-700">Q. {content.quiz[0].question}</p>
                          {content.quiz[0].options && (
                            <div className="mt-1 space-y-0.5">
                              {content.quiz[0].options.map((opt: string, oi: number) => (
                                <p key={oi} className="text-gray-500 pl-2">{String.fromCharCode(9312 + oi)} {opt}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 학습 페이지 링크 */}
                    <div className="pt-2 flex gap-2">
                      <a
                        href={`/curriculum/study/${cap.atomic_id}`}
                        className="text-xs text-stone-900 hover:underline font-medium"
                      >
                        → 전체 학습하기
                      </a>
                      <a
                        href={`/api/ontology/atomic-capsules/export?concept_id=${conceptId}&format=pdf`}
                        className="text-xs text-stone-900 hover:underline"
                      >
                        PDF 교재 다운로드
                      </a>
                    </div>
                  </div>
                )}

                {isExpanded && !content && (
                  <div className="px-4 pb-4 border-t border-gray-100 text-xs text-gray-400">
                    콘텐츠가 아직 생성되지 않았습니다. 위 &quot;캡슐 생성&quot; 버튼을 눌러주세요.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 다운로드 */}
      {capsules.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <a
            href={`/api/ontology/atomic-capsules/export?concept_id=${conceptId}&format=docx`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-stone-300 text-stone-900 rounded-lg hover:bg-stone-100"
          >
            📄 DOCX 교재
          </a>
          <a
            href={`/api/ontology/atomic-capsules/export?concept_id=${conceptId}&format=pdf`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-stone-300 text-stone-900 rounded-lg hover:bg-stone-100"
          >
            📄 PDF 교재
          </a>
        </div>
      )}
    </div>
  )
}
