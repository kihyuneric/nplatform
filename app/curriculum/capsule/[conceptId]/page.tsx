'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock, Users, FileText, ChevronRight, Lightbulb, Download, Loader2, Pencil, Save, X, RefreshCw, Plus, Trash2, Brain, MapPin, Tag, History, ExternalLink, Calendar } from 'lucide-react'
import Link from 'next/link'
import OntologyGraph from '@/components/ontology-graph'

interface Capsule {
  capsule_id: number
  concept_id: number
  level: string
  capsule_title: string
  overview: string
  teaching_guidelines: string
  syllabus: Array<{
    order: number
    topic: string
    description?: string
    duration_min: number
    type: string
  }>
  theory_points: string[]
  case_study_refs: Array<{
    type: string
    number: string
    court?: string
    context: string
  }>
  recommended_duration: number
  expert_sources: Array<{ channel_name: string; relevance: number }>
  prerequisite_concepts: Array<{ concept_id: number; name: string }>
}

const SYLLABUS_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  theory: { bg: 'bg-blue-50', text: 'text-blue-700', label: '이론' },
  case: { bg: 'bg-green-50', text: 'text-green-700', label: '사례' },
  practice: { bg: 'bg-purple-50', text: 'text-purple-700', label: '실습' },
  summary: { bg: 'bg-gray-50', text: 'text-gray-700', label: '요약' },
}

const LEVEL_COLORS: Record<string, string> = {
  '왕초보': 'bg-emerald-100 text-emerald-700',
  '초보': 'bg-blue-100 text-blue-700',
  '중급': 'bg-purple-100 text-purple-700',
  '고급': 'bg-amber-100 text-amber-700',
  '전문가': 'bg-red-100 text-red-700',
}

export default function CapsulePage() {
  const params = useParams()
  const router = useRouter()
  const conceptId = Number(params?.conceptId)

  const [capsule, setCapsule] = useState<Capsule | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<{ overview: string; teaching_guidelines: string; syllabus: Capsule['syllabus'] }>({ overview: '', teaching_guidelines: '', syllabus: [] })
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [ontologyCtx, setOntologyCtx] = useState<any>(null)
  const [planHistory, setPlanHistory] = useState<any[]>([])
  const [useAI, setUseAI] = useState(false)
  const [ebookCacheStatus, setEbookCacheStatus] = useState<'unknown' | 'cached' | 'none'>('unknown')

  // 강의안 이력 로드
  useEffect(() => {
    if (!conceptId || isNaN(conceptId)) return
    fetch(`/api/admin/lecture-plan?concept_id=${conceptId}&action=history`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(data => setPlanHistory(data.history || []))
      .catch(() => {})
  }, [conceptId])

  // 전자책 캐시 상태 확인
  useEffect(() => {
    if (!conceptId || isNaN(conceptId)) return
    fetch(`/api/ontology/capsules/export?concept_id=${conceptId}&type=ebook&check_cache=true`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && 'cached' in data) {
          setEbookCacheStatus(data.cached ? 'cached' : 'none')
        }
      })
      .catch(() => setEbookCacheStatus('none'))
  }, [conceptId])

  // 온톨로지 컨텍스트 로드
  useEffect(() => {
    if (!conceptId || isNaN(conceptId)) return
    fetch(`/api/ontology/concept/${conceptId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setOntologyCtx(data))
      .catch(() => {})
  }, [conceptId])

  const loadCapsule = () => {
    if (!conceptId || isNaN(conceptId)) return
    setLoading(true)
    setError(null)

    fetch(`/api/ontology/capsules?concept_id=${conceptId}`)
      .then(r => r.json())
      .then(res => {
        if (res.capsules && res.capsules.length > 0) {
          setCapsule(res.capsules[0])
          setLoading(false)
        } else {
          setGenerating(true)
          fetch('/api/ontology/capsules/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept_id: conceptId }),
          })
            .then(r => r.json())
            .then(res => {
              if (res.error) {
                setError(res.error)
              } else {
                setCapsule(res.capsule || null)
              }
              setGenerating(false)
              setLoading(false)
            })
            .catch((err) => {
              setError(err.message || '캡슐 생성 중 오류가 발생했습니다.')
              setGenerating(false)
              setLoading(false)
            })
        }
      })
      .catch((err) => {
        setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCapsule()
  }, [conceptId])

  if (loading || generating) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">
          {generating ? '강의 캡슐을 자동 생성하고 있습니다...' : '로딩 중...'}
        </p>
      </div>
    )
  }

  if (error || !capsule) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-center space-y-3">
        <p className="text-gray-500">{error || '캡슐을 생성할 수 없습니다.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={loadCapsule} className="text-purple-600 text-sm hover:underline">
            다시 시도
          </button>
          <button onClick={() => router.back()} className="text-gray-500 text-sm hover:underline">
            뒤로 가기
          </button>
        </div>
      </div>
    )
  }

  const totalDuration = capsule.syllabus.reduce((s, item) => s + (item.duration_min || 0), 0)

  const handleDownload = async (type: 'lecture_plan' | 'ebook', format: 'docx' | 'pdf' = 'docx') => {
    const key = `${type}_${format}`
    setDownloading(key)
    const aiParam = useAI && type === 'ebook' ? '&ai=true' : ''
    try {
      const endpoint = format === 'pdf'
        ? `/api/ontology/capsules/export-pdf?concept_id=${conceptId}&type=${type}${aiParam}`
        : `/api/ontology/capsules/export?concept_id=${conceptId}&type=${type}${aiParam}`
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('다운로드 실패')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const typeLabel = type === 'lecture_plan' ? '강의안' : '전자책'
      a.download = `${capsule.capsule_title}_${typeLabel}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDownloading(null)
    }
  }

  const startEditing = () => {
    if (!capsule) return
    setEditing(true)
    setEditData({
      overview: capsule.overview,
      teaching_guidelines: capsule.teaching_guidelines,
      syllabus: capsule.syllabus.map(s => ({ ...s })),
    })
  }

  const handleSave = async () => {
    if (!capsule) return
    setSaving(true)
    try {
      const res = await fetch('/api/ontology/capsules/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: conceptId,
          overview: editData.overview,
          teaching_guidelines: editData.teaching_guidelines,
          syllabus: editData.syllabus,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setCapsule(data.capsule)
      setEditing(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('기존 캡슐 데이터가 덮어쓰여집니다. 계속하시겠습니까?')) return
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ontology/capsules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: conceptId }),
      })
      const data = await res.json()
      if (data.capsule) setCapsule(data.capsule)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRegenerating(false)
    }
  }

  const updateSyllabusItem = (idx: number, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      syllabus: prev.syllabus.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
  }

  const addSyllabusItem = () => {
    setEditData(prev => ({
      ...prev,
      syllabus: [...prev.syllabus, { order: prev.syllabus.length + 1, topic: '', description: '', duration_min: 5, type: 'theory' }],
    }))
  }

  const removeSyllabusItem = (idx: number) => {
    setEditData(prev => ({
      ...prev,
      syllabus: prev.syllabus.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    }))
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{capsule.capsule_title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[capsule.level] || 'bg-gray-100 text-gray-700'}`}>
              {capsule.level}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {capsule.recommended_duration || totalDuration}분
            </span>
          </div>
        </div>
      </div>

      {/* Atomic 캡슐 학습 배너 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80 mb-0.5">2단계 AI 파이프라인 (웹 조사 + 법령·판례 포함)</p>
            <p className="text-sm font-bold">원자적 학습 캡슐로 마스터하기</p>
            <p className="text-xs opacity-70 mt-0.5">이 개념을 10~20개의 완전 자기완결형 단위로 분해하여 단계별 마스터</p>
          </div>
          <Link
            href={`/curriculum/concept/${conceptId}`}
            className="shrink-0 ml-3 px-3 py-2 bg-white text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 transition-colors"
          >
            학습 시작 →
          </Link>
        </div>
      </div>

      {/* AI Toggle + Ebook Cache Status */}
      <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setUseAI(!useAI)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useAI ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${useAI ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-medium text-gray-700">AI 합성</span>
        </label>
        {useAI && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            ebookCacheStatus === 'cached'
              ? 'bg-green-100 text-green-700'
              : ebookCacheStatus === 'none'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
          }`}>
            {ebookCacheStatus === 'cached' ? '⚡ 캐시됨' : ebookCacheStatus === 'none' ? '🔄 새로 생성' : '확인 중...'}
          </span>
        )}
        {!useAI && <span className="text-[10px] text-gray-400">활성화하면 AI가 챕터당 3,000~5,000자 생성</span>}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleDownload('lecture_plan', 'docx')}
          disabled={!!downloading || editing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {downloading === 'lecture_plan_docx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          강의안 DOCX
        </button>
        <button
          onClick={() => handleDownload('lecture_plan', 'pdf')}
          disabled={!!downloading || editing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {downloading === 'lecture_plan_pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          강의안 PDF
        </button>
        <button
          onClick={() => handleDownload('ebook', 'docx')}
          disabled={!!downloading || editing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            useAI ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {downloading === 'ebook_docx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          전자책 DOCX{useAI ? ' (AI)' : ''}
        </button>
        <button
          onClick={() => handleDownload('ebook', 'pdf')}
          disabled={!!downloading || editing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            useAI ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
          }`}
        >
          {downloading === 'ebook_pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          전자책 PDF{useAI ? ' (AI)' : ''}
        </button>

        <span className="text-gray-300">|</span>

        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              저장
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              취소
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              편집
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-300 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              재생성
            </button>
          </>
        )}
      </div>

      {/* Ontology Analysis Section */}
      {ontologyCtx && (
        <section className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
            <Brain className="w-4 h-4" />
            온톨로지 분석
          </h2>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-700">{ontologyCtx.expert_count || capsule.expert_sources.length}</div>
              <div className="text-[10px] text-purple-500">전문가 수</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-700">{ontologyCtx.video_count || 0}</div>
              <div className="text-[10px] text-blue-500">관련 영상</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-700">{ontologyCtx.avg_relevance ? `${Math.round(ontologyCtx.avg_relevance * 100)}%` : '-'}</div>
              <div className="text-[10px] text-green-500">평균 관련도</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-amber-700">
                {ontologyCtx.lecture_type_ratio
                  ? `${Math.round((ontologyCtx.lecture_type_ratio.theory || 0) * 100)}%`
                  : '-'}
              </div>
              <div className="text-[10px] text-amber-500">이론 비율</div>
            </div>
          </div>

          {/* Keywords */}
          {ontologyCtx.keywords && ontologyCtx.keywords.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-purple-600 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                핵심 키워드
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ontologyCtx.keywords.map((kw: string) => (
                  <span key={kw} className="px-2 py-0.5 bg-white/80 text-purple-700 rounded-full text-xs border border-purple-200">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Concept Position Graph */}
          {(ontologyCtx.prerequisites?.length > 0 || ontologyCtx.successors?.length > 0) && (
            <div>
              <h3 className="text-xs font-medium text-purple-600 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                개념 위치 (지식 그래프)
              </h3>
              <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
                <OntologyGraph
                  nodes={[
                    ...(ontologyCtx.prerequisites || []).map((p: any) => ({ id: p.concept_id, name: p.name, level: capsule.level })),
                    { id: conceptId, name: capsule.capsule_title, level: capsule.level, isCurrent: true },
                    ...(ontologyCtx.successors || []).map((s: any) => ({ id: s.concept_id, name: s.name, level: capsule.level })),
                    ...(ontologyCtx.related || []).map((r: any) => ({ id: r.concept_id, name: r.name, level: capsule.level })),
                  ]}
                  edges={[
                    ...(ontologyCtx.prerequisites || []).map((p: any) => ({ source: p.concept_id, target: conceptId, type: 'prerequisite' as const })),
                    ...(ontologyCtx.successors || []).map((s: any) => ({ source: conceptId, target: s.concept_id, type: 'prerequisite' as const })),
                    ...(ontologyCtx.related || []).map((r: any) => ({ source: conceptId, target: r.concept_id, type: 'related' as const })),
                  ]}
                  layout="tree"
                />
              </div>
            </div>
          )}

          {/* Roadmap Position */}
          {ontologyCtx.roadmap_position && (
            <div className="bg-white/80 rounded-lg p-3 border border-purple-100">
              <h3 className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                로드맵 위치
              </h3>
              <div className="flex items-center gap-2 text-xs">
                {['왕초보', '초보', '중급', '고급', '전문가'].map(lvl => (
                  <span
                    key={lvl}
                    className={`px-2 py-1 rounded-full font-medium ${
                      lvl === ontologyCtx.roadmap_position.level
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {lvl}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>{ontologyCtx.roadmap_position.level} 과정</span>
                <span>·</span>
                <span>{ontologyCtx.roadmap_position.order_in_level}/{ontologyCtx.roadmap_position.total_in_level} 강의</span>
                <span>·</span>
                <span>{ontologyCtx.roadmap_position.lecture_level} 레벨</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Overview */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-purple-500" />
          개요
        </h2>
        {editing ? (
          <textarea
            value={editData.overview}
            onChange={e => setEditData(prev => ({ ...prev, overview: e.target.value }))}
            className="w-full text-sm text-gray-600 leading-relaxed border border-gray-200 rounded-lg p-3 min-h-[120px] focus:ring-1 focus:ring-purple-400 outline-none resize-y"
          />
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{capsule.overview}</p>
        )}
      </section>

      {/* Teaching guidelines */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          교수법 가이드라인
        </h2>
        {editing ? (
          <textarea
            value={editData.teaching_guidelines}
            onChange={e => setEditData(prev => ({ ...prev, teaching_guidelines: e.target.value }))}
            className="w-full text-sm text-gray-600 leading-relaxed border border-gray-200 rounded-lg p-3 min-h-[120px] focus:ring-1 focus:ring-purple-400 outline-none resize-y"
          />
        ) : (
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{capsule.teaching_guidelines}</div>
        )}
      </section>

      {/* Syllabus */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-500" />
          강의 실라버스
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs text-gray-500 w-12">순서</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500">주제</th>
                <th className="text-center py-2 px-3 text-xs text-gray-500 w-20">유형</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 w-16">시간</th>
                {editing && <th className="text-center py-2 px-3 text-xs text-gray-500 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {(editing ? editData.syllabus : capsule.syllabus).map((item, idx) => {
                const style = SYLLABUS_TYPE_STYLES[item.type || 'theory'] || SYLLABUS_TYPE_STYLES.theory
                return (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-gray-400 font-medium">{item.order}</td>
                    <td className="py-2.5 px-3">
                      {editing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.topic}
                            onChange={e => updateSyllabusItem(idx, 'topic', e.target.value)}
                            className="w-full text-sm font-medium text-gray-700 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-purple-400 outline-none"
                            placeholder="주제"
                          />
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={e => updateSyllabusItem(idx, 'description', e.target.value)}
                            className="w-full text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-purple-400 outline-none"
                            placeholder="설명 (선택)"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-gray-700">{item.topic}</div>
                          {item.description && (
                            <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {editing ? (
                        <select
                          value={item.type}
                          onChange={e => updateSyllabusItem(idx, 'type', e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
                        >
                          <option value="theory">이론</option>
                          <option value="case">사례</option>
                          <option value="practice">실습</option>
                          <option value="summary">요약</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500">
                      {editing ? (
                        <input
                          type="number"
                          value={item.duration_min || 0}
                          onChange={e => updateSyllabusItem(idx, 'duration_min', parseInt(e.target.value) || 0)}
                          className="w-14 text-xs text-right border border-gray-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-purple-400 outline-none"
                          min={1}
                        />
                      ) : (
                        <>{item.duration_min ? `${item.duration_min}분` : '-'}</>
                      )}
                    </td>
                    {editing && (
                      <td className="py-2.5 px-1 text-center">
                        <button
                          onClick={() => removeSyllabusItem(idx)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={editing ? 3 : 3} className="py-2 px-3 text-xs font-medium text-gray-500">
                  {editing ? (
                    <button
                      onClick={addSyllabusItem}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      항목 추가
                    </button>
                  ) : '합계'}
                </td>
                <td className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                  {editing
                    ? `${editData.syllabus.reduce((s, item) => s + (item.duration_min || 0), 0)}분`
                    : totalDuration > 0 ? `${totalDuration}분` : (capsule.recommended_duration ? `${capsule.recommended_duration}분` : '-')
                  }
                </td>
                {editing && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Theory points */}
      {capsule.theory_points.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">핵심 이론</h2>
          <ul className="space-y-1.5">
            {capsule.theory_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-purple-400 mt-0.5">•</span>
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Case references */}
      {capsule.case_study_refs.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">참고 사례</h2>
          <div className="space-y-3">
            {capsule.case_study_refs.map((ref, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {ref.type === 'auction' ? '경매' : ref.type === 'public_sale' ? '공매' : ref.type === 'court' ? '법원' : '주소'}
                  </span>
                  <span className="font-mono text-sm font-medium text-gray-700">{ref.number}</span>
                  {ref.court && <span className="text-xs text-gray-400">({ref.court})</span>}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{ref.context}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prerequisites */}
      {capsule.prerequisite_concepts && capsule.prerequisite_concepts.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">선수 개념</h2>
          <div className="flex flex-wrap gap-2">
            {capsule.prerequisite_concepts.map(p => (
              <Link
                key={p.concept_id}
                href={`/curriculum/capsule/${p.concept_id}`}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-lg hover:bg-purple-100 transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Expert sources - 개별 채널명 비노출, 집계 표시 */}
      {capsule.expert_sources.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-500" />
            전문가 출처
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  NPLatform 부동산 전문가 {capsule.expert_sources.length}명
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  평균 관련도 {Math.round(capsule.expert_sources.reduce((s, e) => s + e.relevance, 0) / capsule.expert_sources.length * 100)}%
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
              <span>최고 관련도: {Math.round(Math.max(...capsule.expert_sources.map(e => e.relevance)) * 100)}%</span>
              <span>최저 관련도: {Math.round(Math.min(...capsule.expert_sources.map(e => e.relevance)) * 100)}%</span>
            </div>
          </div>
        </section>
      )}

      {/* 강의안 이력 */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <History className="w-4 h-4 text-purple-500" />
            AI 강의안 생성 이력
            {planHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
                {planHistory.length}건
              </span>
            )}
          </h2>
          <Link
            href={`/admin/lecture-plan?concept_id=${conceptId}`}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
          >
            <ExternalLink className="w-3 h-3" />
            강의안 생성 (관리자)
          </Link>
        </div>

        {planHistory.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-400">아직 생성된 AI 강의안이 없습니다.</p>
            <Link
              href={`/admin/lecture-plan?concept_id=${conceptId}`}
              className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 hover:text-purple-800"
            >
              관리자 페이지에서 생성하기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {planHistory.slice(0, 5).map((plan: any) => (
              <div key={plan.plan_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">
                      v{plan.version || 1} — {plan.lecture_level} · {plan.target_duration_min}분
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      plan.status === 'final'
                        ? 'bg-green-100 text-green-700'
                        : plan.status === 'archived'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {plan.status === 'final' ? '확정' : plan.status === 'archived' ? '보관' : '초안'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(plan.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    {plan.selected_youtube_ids && (
                      <span>대본 {Array.isArray(plan.selected_youtube_ids) ? plan.selected_youtube_ids.length : 0}개 선별</span>
                    )}
                    {plan.emphasis_types && (
                      <span>{Array.isArray(plan.emphasis_types) ? plan.emphasis_types.join(', ') : ''}</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/lecture-plan?concept_id=${conceptId}&plan_id=${plan.plan_id}`}
                  className="flex items-center gap-0.5 text-purple-600 hover:text-purple-800 flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  보기
                </Link>
              </div>
            ))}
            {planHistory.length > 5 && (
              <Link
                href={`/admin/lecture-plan?concept_id=${conceptId}`}
                className="block text-center text-xs text-gray-400 hover:text-purple-600 py-1"
              >
                +{planHistory.length - 5}건 더 보기
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
