'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, BookOpen, Clock, Star, Circle, CheckCircle2,
  Zap, Lock, Play, BarChart2, Award, AlertCircle, Loader2,
  Download, FileText
} from 'lucide-react'
import Link from 'next/link'

interface AtomicCapsuleSummary {
  atomic_id: number
  topic: string
  description: string
  order_in_concept: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_min: number
  generation_stage: string
  progress: {
    status: 'not_started' | 'in_progress' | 'completed' | 'mastered'
    quiz_score: number | null
  } | null
}

interface ConceptData {
  concept_id: number
  name: string
  level: string
  description: string
  domain: { domain_name: string }
}

const DIFFICULTY_STYLES = {
  beginner: { label: '초급', color: 'bg-emerald-100 text-emerald-700' },
  intermediate: { label: '중급', color: 'bg-blue-100 text-blue-700' },
  advanced: { label: '고급', color: 'bg-purple-100 text-purple-700' },
}

const STATUS_STYLES = {
  not_started: { icon: Circle, color: 'text-gray-300', bg: '' },
  in_progress: { icon: Play, color: 'text-blue-400', bg: 'bg-blue-50' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  mastered: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-50' },
}

export default function ConceptAtomicListPage() {
  const params = useParams()
  const router = useRouter()
  const conceptId = Number(params?.conceptId)

  const [concept, setConcept] = useState<ConceptData | null>(null)
  const [capsules, setCapsules] = useState<AtomicCapsuleSummary[]>([])
  const [totalMin, setTotalMin] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState<string | null>(null)

  const userId = 'anonymous'

  const loadData = () => {
    if (!conceptId || isNaN(conceptId)) return
    setLoading(true)
    fetch(`/api/ontology/atomic-capsules?concept_id=${conceptId}&progress=${userId}`)
      .then(r => r.json())
      .then(data => {
        setConcept(data.concept)
        setCapsules(data.capsules || [])
        setTotalMin(data.total_estimated_min || 0)
        setMasteredCount(data.mastered_count || 0)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => { loadData() }, [conceptId])

  const handleGenerate = async () => {
    setGenerating(true)
    setGenProgress('개념 분석 중...')
    setError(null)

    try {
      setGenProgress('주제 구조 분해 중... (Stage 1)')
      const res = await fetch('/api/ontology/atomic-capsules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: conceptId }),
      })

      setGenProgress('웹 조사 + AI 합성 중... (Stage 2, 약 1~3분 소요)')

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')

      if (data.already_exists) {
        setGenProgress(null)
        setGenerating(false)
        return
      }

      setGenProgress(`완료! ${data.total_generated}개 캡슐 생성됨`)
      setTimeout(() => {
        setGenProgress(null)
        loadData()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const progressPct = capsules.length > 0
    ? Math.round((masteredCount / capsules.length) * 100)
    : 0

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {concept?.domain && (
              <span className="text-xs text-gray-400">{concept.domain.domain_name}</span>
            )}
            <span className="text-xs text-gray-300">›</span>
            <span className="text-xs text-purple-500">{concept?.level}</span>
          </div>
          <h1 className="text-xl font-bold">{concept?.name}</h1>
        </div>
      </div>

      {/* 진도 대시보드 */}
      {capsules.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{capsules.length}</div>
              <div className="text-xs text-purple-500">총 캡슐</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{masteredCount}</div>
              <div className="text-xs text-amber-500">마스터 완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : `${totalMin}분`}
              </div>
              <div className="text-xs text-blue-500">총 학습시간</div>
            </div>
          </div>

          {/* 진도 바 */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>마스터 진도</span>
              <span className="font-semibold text-purple-700">{progressPct}%</span>
            </div>
            <div className="w-full bg-white rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {progressPct === 100 && (
            <div className="mt-3 flex items-center gap-2 text-green-700 text-sm font-medium">
              <Award className="w-4 h-4" />
              이 개념을 완전히 마스터했습니다! 🎉
            </div>
          )}
        </div>
      )}

      {/* 캡슐 없을 때 생성 버튼 */}
      {capsules.length === 0 && (
        <div className="bg-white border-2 border-dashed border-purple-200 rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-1">Atomic 캡슐 아직 없음</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              이 개념을 10~20개의 원자적 학습 단위로 분해하여<br />
              완전 자기완결형 교육 캡슐을 자동 생성합니다.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              2단계 AI 파이프라인: 대본 분석 → 웹 조사 + AI 합성<br />
              예상 소요 시간: 1~3분
            </p>
          </div>

          {genProgress && (
            <div className="flex items-center gap-2 justify-center text-sm text-purple-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              {genProgress}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 justify-center text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {generating ? '생성 중...' : 'Atomic 캡슐 생성하기'}
          </button>
        </div>
      )}

      {/* 캡슐 목록 */}
      {capsules.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-500" />
              학습 캡슐 목록 ({capsules.length}개)
            </h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              재생성
            </button>
          </div>

          {genProgress && (
            <div className="flex items-center gap-2 text-sm text-purple-600 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {genProgress}
            </div>
          )}

          {capsules.map((cap) => {
            const diff = DIFFICULTY_STYLES[cap.difficulty] || DIFFICULTY_STYLES.beginner
            const status = cap.progress?.status || 'not_started'
            const statusStyle = STATUS_STYLES[status]
            const StatusIcon = statusStyle.icon

            return (
              <Link
                key={cap.atomic_id}
                href={`/curriculum/study/${cap.atomic_id}`}
                className={`block p-4 rounded-xl border transition-all hover:shadow-sm ${
                  status === 'mastered' ? 'border-amber-200 bg-amber-50/40' :
                  status === 'completed' ? 'border-green-200 bg-green-50/30' :
                  status === 'in_progress' ? 'border-blue-200 bg-blue-50/20' :
                  'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 shrink-0">
                    <StatusIcon className={`w-5 h-5 ${statusStyle.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs text-gray-400 font-medium">{cap.order_in_concept}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${diff.color}`}>
                        {diff.label}
                      </span>
                      {cap.generation_stage === 'stage2' && (
                        <span className="text-[10px] text-blue-400">🌐</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-tight">{cap.topic}</p>
                    {cap.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cap.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
                      <Clock className="w-3 h-3" />
                      {cap.estimated_min}분
                    </div>
                    {cap.progress?.quiz_score !== null && cap.progress?.quiz_score !== undefined && (
                      <div className="text-xs mt-0.5">
                        <span className={`font-medium ${cap.progress.quiz_score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                          {cap.progress.quiz_score}점
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* 다운로드 섹션 */}
      {capsules.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-indigo-500" />
            Atomic 캡슐 학습교재 다운로드
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            전체 {capsules.length}개 캡슐의 개념정의·법령근거·사례·연습문제·마스터확인을 포함한 완전학습교재
          </p>
          <div className="flex gap-2">
            <a
              href={`/api/ontology/atomic-capsules/export?concept_id=${conceptId}&format=docx`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              DOCX 다운로드
            </a>
            <a
              href={`/api/ontology/atomic-capsules/export?concept_id=${conceptId}&format=pdf`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF 다운로드
            </a>
          </div>
        </div>
      )}

      {/* 하단: 기존 캡슐로 돌아가기 */}
      <div className="border-t border-gray-100 pt-4">
        <Link
          href={`/curriculum/capsule/${conceptId}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600"
        >
          <BarChart2 className="w-4 h-4" />
          기존 캡슐 보기 (강의안·전자책 다운로드)
        </Link>
      </div>
    </div>
  )
}
