'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, AlertCircle,
  Award, Clock, FileText, Lightbulb, Scale, Target, ChevronDown, ChevronUp,
  BarChart2, ExternalLink, Star, Download
} from 'lucide-react'
import Link from 'next/link'
import type { AtomicCapsuleContent } from '@/lib/web-enricher'

// ============================================================
// 타입
// ============================================================
interface AtomicCapsule {
  atomic_id: number
  concept_id: number
  topic: string
  description: string
  order_in_concept: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_min: number
  content_json: AtomicCapsuleContent | null
  quiz_json: Array<{
    question: string
    options?: string[]
    answer: string
    explanation: string
  }> | null
  mastery_criteria: string[] | null
  web_sources: string[] | null
  generation_stage: string
}

interface Progress {
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered'
  quiz_score: number | null
}

const DIFFICULTY_LABELS = {
  beginner: { label: '초급', color: 'bg-emerald-100 text-emerald-700' },
  intermediate: { label: '중급', color: 'bg-blue-100 text-blue-700' },
  advanced: { label: '고급', color: 'bg-purple-100 text-purple-700' },
}

export default function AtomicStudyPage() {
  const params = useParams()
  const router = useRouter()
  const atomicId = Number(params?.atomicId)

  const [capsule, setCapsule] = useState<AtomicCapsule | null>(null)
  const [prev, setPrev] = useState<any>(null)
  const [next, setNext] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<Progress | null>(null)

  // 섹션 접기/펼치기
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    definition: true,
    importance: true,
    principles: true,
    legal: false,
    cases: false,
    mistakes: false,
    checklist: false,
    quiz: false,
    mastery: false,
  })

  // 퀴즈 상태
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState<number | null>(null)

  const userId = 'anonymous'  // TODO: 실제 인증 연동

  useEffect(() => {
    if (!atomicId || isNaN(atomicId)) return
    setLoading(true)
    fetch(`/api/ontology/atomic-capsules?atomic_id=${atomicId}&progress=${userId}`)
      .then(r => r.json())
      .then(data => {
        setCapsule(data.capsule)
        setProgress(data.progress)
        setPrev(data.prev)
        setNext(data.next)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [atomicId])

  // 학습 시작 시 진도 업데이트 + 스트릭 기록
  useEffect(() => {
    if (!capsule || progress?.status === 'mastered' || progress?.status === 'completed') return
    fetch('/api/ontology/atomic-capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        atomic_id: atomicId,
        concept_id: capsule.concept_id,
        status: 'in_progress',
      }),
    }).catch(() => {})
    // 스트릭 기록
    fetch(`/api/ontology/streak?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capsules_delta: 1,
        minutes_delta: capsule.estimated_min || 10,
        quizzes_delta: 0,
      }),
    }).catch(() => {})
  }, [capsule])

  const toggleSection = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const handleQuizSubmit = async () => {
    if (!capsule?.quiz_json) return
    const quiz = capsule.quiz_json

    let correct = 0
    quiz.forEach((q, i) => {
      if (quizAnswers[i]?.trim() === q.answer?.trim()) correct++
    })

    const score = Math.round((correct / quiz.length) * 100)
    setQuizScore(score)
    setQuizSubmitted(true)

    // 진도 저장
    const status = score >= 70 ? 'completed' : 'in_progress'
    await fetch('/api/ontology/atomic-capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        atomic_id: atomicId,
        concept_id: capsule.concept_id,
        status,
        quiz_score: score,
      }),
    })
    // 퀴즈 통과 시 스트릭 기록
    if (score >= 70) {
      fetch(`/api/ontology/streak?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capsules_delta: 0, minutes_delta: 0, quizzes_delta: 1 }),
      }).catch(() => {})
    }
    setProgress(p => ({ ...p!, status, quiz_score: score }))
  }

  const handleMastery = async () => {
    if (!capsule) return
    await fetch('/api/ontology/atomic-capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        atomic_id: atomicId,
        concept_id: capsule.concept_id,
        status: 'mastered',
      }),
    })
    setProgress(p => ({ ...p!, status: 'mastered' }))
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">캡슐 로딩 중...</p>
      </div>
    )
  }

  if (!capsule || !capsule.content_json) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-3">
        <AlertCircle className="w-10 h-10 mx-auto text-gray-300" />
        <p className="text-gray-500">캡슐을 찾을 수 없거나 콘텐츠가 아직 생성되지 않았습니다.</p>
        <button onClick={() => router.back()} className="text-purple-600 text-sm hover:underline">
          뒤로 가기
        </button>
      </div>
    )
  }

  const c = capsule.content_json
  const diffStyle = DIFFICULTY_LABELS[capsule.difficulty] || DIFFICULTY_LABELS.beginner

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg mt-0.5">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diffStyle.color}`}>
              {diffStyle.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              예상 {capsule.estimated_min}분
            </span>
            {capsule.generation_stage === 'stage2' && (
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                🌐 웹 조사 반영
              </span>
            )}
            {progress?.status === 'mastered' && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" /> 마스터 완료
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{capsule.topic}</h1>
          {c.subtitle && <p className="text-sm text-gray-500 mt-0.5">{c.subtitle}</p>}
        </div>
      </div>

      {/* 개념 정의 */}
      <Section
        id="definition"
        title="개념 정의"
        icon={<BookOpen className="w-4 h-4 text-purple-500" />}
        expanded={expanded.definition}
        onToggle={() => toggleSection('definition')}
        accent="purple"
      >
        <div className="space-y-3">
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-purple-600 mb-1">공식·법적 정의</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{c.definition.formal}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">쉽게 이해하기</p>
            <p className="text-sm text-gray-700 leading-relaxed">{c.definition.plain}</p>
          </div>
          {c.definition.key_characteristics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">핵심 특성</p>
              <ul className="space-y-1.5">
                {c.definition.key_characteristics.map((ch, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-purple-400 font-bold mt-0.5">{i + 1}.</span>
                    {ch}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* 왜 중요한가 */}
      <Section
        id="importance"
        title="왜 중요한가"
        icon={<Target className="w-4 h-4 text-amber-500" />}
        expanded={expanded.importance}
        onToggle={() => toggleSection('importance')}
        accent="amber"
      >
        <div className="space-y-3">
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ 이것을 모르면</p>
            <p className="text-sm text-gray-700 leading-relaxed">{c.importance.why_essential}</p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-4">
            <p className="text-xs font-semibold text-green-700 mb-1">💰 투자 수익에 미치는 영향</p>
            <p className="text-sm text-gray-700 leading-relaxed">{c.importance.investment_impact}</p>
          </div>
        </div>
      </Section>

      {/* 핵심 원리 단계별 */}
      <Section
        id="principles"
        title="핵심 원리 단계별"
        icon={<BarChart2 className="w-4 h-4 text-blue-500" />}
        expanded={expanded.principles}
        onToggle={() => toggleSection('principles')}
        accent="blue"
      >
        <div className="space-y-3">
          {c.principles?.map((p, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {p.step}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 mb-0.5">{p.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{p.explanation}</p>
                {p.example && (
                  <div className="mt-1.5 bg-blue-50 rounded px-3 py-2 text-xs text-blue-700">
                    💡 예시: {p.example}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 법령 근거 */}
      <Section
        id="legal"
        title="법령 근거"
        icon={<Scale className="w-4 h-4 text-indigo-500" />}
        expanded={expanded.legal}
        onToggle={() => toggleSection('legal')}
        accent="indigo"
      >
        <div className="space-y-3">
          {c.legal_foundation?.laws?.map((law, i) => (
            <div key={i} className="bg-indigo-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-700">{law.law_name}</span>
                <span className="text-xs text-indigo-500">{law.article}</span>
              </div>
              <p className="text-xs text-gray-600">{law.summary}</p>
            </div>
          ))}
          {c.legal_foundation?.latest_changes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-yellow-700 mb-1">📋 2024~2025 최신 변경사항</p>
              <p className="text-xs text-gray-600 leading-relaxed">{c.legal_foundation.latest_changes}</p>
            </div>
          )}
        </div>
      </Section>

      {/* 실전 사례 */}
      <Section
        id="cases"
        title="실전 사례"
        icon={<FileText className="w-4 h-4 text-green-500" />}
        expanded={expanded.cases}
        onToggle={() => toggleSection('cases')}
        accent="green"
      >
        <div className="space-y-3">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-700 mb-1.5">✅ 성공 사례</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{c.cases.success_case}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-600 mb-1.5">❌ 실패 사례 & 교훈</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{c.cases.failure_case}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1.5">🎯 투자 시뮬레이션</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{c.cases.scenario}</p>
          </div>
        </div>
      </Section>

      {/* 흔한 실수 */}
      <Section
        id="mistakes"
        title="흔한 실수 TOP 3"
        icon={<AlertCircle className="w-4 h-4 text-red-500" />}
        expanded={expanded.mistakes}
        onToggle={() => toggleSection('mistakes')}
        accent="red"
      >
        <div className="space-y-3">
          {c.common_mistakes?.map((m, i) => (
            <div key={i} className="border border-red-100 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-3 py-2">
                <span className="text-xs font-bold text-red-600">실수 {i + 1}</span>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{m.mistake}</p>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                <p className="text-xs text-gray-500"><span className="font-medium text-amber-600">실제: </span>{m.reality}</p>
                <p className="text-xs text-gray-500"><span className="font-medium text-green-600">올바른 접근: </span>{m.correct_approach}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 실전 체크리스트 */}
      <Section
        id="checklist"
        title="실전 체크리스트"
        icon={<CheckCircle2 className="w-4 h-4 text-teal-500" />}
        expanded={expanded.checklist}
        onToggle={() => toggleSection('checklist')}
        accent="teal"
      >
        <ul className="space-y-2">
          {c.checklist?.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <div className="w-5 h-5 rounded border-2 border-teal-300 shrink-0 mt-0.5 flex items-center justify-center">
                <span className="text-[10px] font-bold text-teal-500">{i + 1}</span>
              </div>
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* 연습문제 */}
      <Section
        id="quiz"
        title="연습문제"
        icon={<Lightbulb className="w-4 h-4 text-yellow-500" />}
        expanded={expanded.quiz}
        onToggle={() => toggleSection('quiz')}
        accent="yellow"
      >
        {capsule.quiz_json && capsule.quiz_json.length > 0 ? (
          <div className="space-y-5">
            {capsule.quiz_json.map((q, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">
                  Q{i + 1}. {q.question}
                </p>
                {q.options ? (
                  <div className="space-y-1.5">
                    {q.options.map((opt, j) => {
                      const isSelected = quizAnswers[i] === opt
                      const isCorrect = quizSubmitted && opt === q.answer
                      const isWrong = quizSubmitted && isSelected && opt !== q.answer
                      return (
                        <button
                          key={j}
                          disabled={quizSubmitted}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [i]: opt }))}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                            isCorrect ? 'bg-green-100 border-green-400 text-green-800' :
                            isWrong ? 'bg-red-100 border-red-400 text-red-800' :
                            isSelected ? 'bg-blue-50 border-blue-400 text-blue-800' :
                            'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    disabled={quizSubmitted}
                    value={quizAnswers[i] || ''}
                    onChange={e => setQuizAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-yellow-400 outline-none"
                    placeholder="답을 입력하세요"
                  />
                )}
                {quizSubmitted && (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
                    <span className="font-semibold text-gray-700">정답: </span>{q.answer}<br />
                    <span className="font-semibold text-gray-700">해설: </span>{q.explanation}
                  </div>
                )}
              </div>
            ))}

            {!quizSubmitted ? (
              <button
                onClick={handleQuizSubmit}
                disabled={Object.keys(quizAnswers).length === 0}
                className="w-full py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors"
              >
                정답 확인
              </button>
            ) : (
              <div className={`rounded-lg p-4 text-center ${quizScore! >= 70 ? 'bg-green-50' : 'bg-amber-50'}`}>
                <p className="text-2xl font-bold mb-1 ${quizScore! >= 70 ? 'text-green-700' : 'text-amber-700'}">
                  {quizScore}점
                </p>
                <p className="text-sm text-gray-600">
                  {quizScore! >= 70 ? '✅ 통과! 체크리스트로 마스터를 확인해보세요.' : '⚠️ 한 번 더 복습하고 도전해보세요.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">연습문제가 아직 없습니다.</p>
        )}
      </Section>

      {/* 마스터 확인 */}
      <Section
        id="mastery"
        title="마스터 확인"
        icon={<Award className="w-4 h-4 text-amber-500" />}
        expanded={expanded.mastery}
        onToggle={() => toggleSection('mastery')}
        accent="amber"
      >
        <div className="space-y-4">
          {c.mastery?.criteria?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">이것을 이해했으면 마스터</p>
              <ul className="space-y-2">
                {c.mastery.criteria.map((cr, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    {cr}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.mastery?.self_check?.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">자기 확인 질문</p>
              {c.mastery.self_check.map((q, i) => (
                <p key={i} className="text-sm text-gray-700 mb-1.5">
                  <span className="text-amber-600 font-medium">Q{i + 1}. </span>{q}
                </p>
              ))}
            </div>
          )}

          {c.mastery?.next_topics?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">다음 학습 추천</p>
              <div className="flex flex-wrap gap-2">
                {c.mastery.next_topics.map((t, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    → {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 마스터 완료 버튼 */}
          {progress?.status !== 'mastered' ? (
            <button
              onClick={handleMastery}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              마스터 완료 선언
            </button>
          ) : (
            <div className="w-full py-3 bg-green-100 text-green-700 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2">
              <Award className="w-4 h-4" />
              마스터 완료! 🎉
            </div>
          )}
        </div>
      </Section>

      {/* 출처 */}
      {c.sources?.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> 참조 출처
          </p>
          <ul className="space-y-1">
            {c.sources.map((s, i) => (
              <li key={i} className="text-xs text-gray-400">{s}</li>
            ))}
          </ul>
          <p className="text-[10px] text-gray-300 mt-2">
            NPLatform 부동산 전문가 강의 + 공식 법령 자료를 AI가 종합 분석
          </p>
        </div>
      )}

      {/* 이전/다음 네비게이션 */}
      {/* 교재 다운로드 */}
      <div className="flex items-center gap-2 pt-2">
        <a
          href={`/api/ontology/atomic-capsules/export?concept_id=${capsule.concept_id}&format=docx`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <Download className="w-3 h-3" />
          전체교재 DOCX
        </a>
        <a
          href={`/api/ontology/atomic-capsules/export?concept_id=${capsule.concept_id}&format=pdf`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <Download className="w-3 h-3" />
          전체교재 PDF
        </a>
      </div>

      {/* 이전/다음 탐색 */}
      <div className="flex items-center gap-3 pt-2">
        {prev ? (
          <Link
            href={`/curriculum/study/${prev.atomic_id}`}
            className="flex-1 flex items-center gap-2 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] text-gray-400">이전</p>
              <p className="text-xs font-medium text-gray-700 truncate">{prev.topic}</p>
            </div>
          </Link>
        ) : <div className="flex-1" />}

        <Link
          href={`/curriculum/concept/${capsule.concept_id}`}
          className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center"
          title="목록으로"
        >
          <Circle className="w-4 h-4 text-gray-400 mx-auto" />
        </Link>

        {next ? (
          <Link
            href={`/curriculum/study/${next.atomic_id}`}
            className="flex-1 flex items-center justify-end gap-2 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="overflow-hidden text-right">
              <p className="text-[10px] text-gray-400">다음</p>
              <p className="text-xs font-medium text-gray-700 truncate">{next.topic}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
          </Link>
        ) : <div className="flex-1" />}
      </div>
    </div>
  )
}

// ============================================================
// 섹션 컴포넌트
// ============================================================
function Section({
  id, title, icon, expanded, onToggle, children, accent = 'gray',
}: {
  id: string
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  )
}
