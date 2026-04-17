'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import OntologyGraph, { OntologyGraphLegend } from '@/components/ontology-graph'
import type { LecturePlanResult, RelatedTranscript, ConceptOntologyContext } from '@/lib/ebook-types'
import type { LectureCapsuleRecord } from '@/lib/ontology-db'

export default function LecturePlanPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" /></div>}>
      <LecturePlanPage />
    </Suspense>
  )
}

function LecturePlanPage() {
  const searchParams = useSearchParams()

  // 캡슐 검색/선택
  const [conceptId, setConceptId] = useState<string>('')
  const [capsule, setCapsule] = useState<LectureCapsuleRecord | null>(null)
  const [ontologyContext, setOntologyContext] = useState<ConceptOntologyContext | null>(null)

  // 대본 리스트
  const [transcripts, setTranscripts] = useState<RelatedTranscript[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // 설정
  const [lectureLevel, setLectureLevel] = useState<string>('L2')
  const [targetDuration, setTargetDuration] = useState<number>(45)
  const [sectionCount, setSectionCount] = useState<string>('auto')
  const [emphasisTypes, setEmphasisTypes] = useState<Set<string>>(new Set(['theory', 'case']))
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('')

  // 생성 결과
  const [generatedPlan, setGeneratedPlan] = useState<LecturePlanResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이력
  const [history, setHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // 캡슐 로드
  const loadCapsuleData = useCallback(async () => {
    if (!conceptId) return
    setError(null)

    try {
      const res = await fetch(`/api/admin/lecture-plan?concept_id=${conceptId}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setCapsule(data.capsule)
      setOntologyContext(data.ontologyContext)
      setTranscripts(data.transcripts || [])

      // 관련도 0.7 이상 자동 선택
      const autoSelected = new Set<number>(
        (data.transcripts || [])
          .filter((t: RelatedTranscript) => t.relevance >= 0.7)
          .map((t: RelatedTranscript) => t.youtube_id)
      )
      setSelectedIds(autoSelected)
      setGeneratedPlan(null)
    } catch (err: any) {
      setError(err.message)
    }
  }, [conceptId])

  // URL 파라미터로 concept_id, plan_id 자동 처리
  useEffect(() => {
    const urlConceptId = searchParams?.get('concept_id')
    const urlPlanId = searchParams?.get('plan_id')
    if (urlConceptId && urlConceptId !== conceptId) {
      setConceptId(urlConceptId)
      // plan_id가 있으면 이력에서 해당 plan 자동 로드
      if (urlPlanId) {
        fetch(`/api/admin/lecture-plan?concept_id=${urlConceptId}&action=history`)
          .then(r => r.json())
          .then(data => {
            const plans = data.history || []
            const target = plans.find((p: any) => p.plan_id === parseInt(urlPlanId))
            if (target) {
              setLectureLevel(target.lecture_level || 'L2')
              setTargetDuration(target.target_duration_min || 45)
              setSectionCount(target.section_count ? String(target.section_count) : 'auto')
              setEmphasisTypes(new Set(target.emphasis_types || ['theory', 'case']))
              setAdditionalInstructions(target.additional_instructions || '')
              if (target.selected_youtube_ids) {
                setSelectedIds(new Set(target.selected_youtube_ids.map(Number)))
              }
              setGeneratedPlan(target.ai_result)
            }
          })
          .catch(() => {})
      }
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // 이력 로드
  const loadHistory = useCallback(async () => {
    if (!conceptId) return
    try {
      const res = await fetch(`/api/admin/lecture-plan?concept_id=${conceptId}&action=history`)
      const data = await res.json()
      setHistory(data.history || [])
    } catch { /* ignore */ }
  }, [conceptId])

  // AI 강의안 생성
  const generatePlan = async () => {
    if (!capsule || selectedIds.size === 0) return
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/lecture-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: parseInt(conceptId),
          capsule_id: capsule.capsule_id,
          selected_youtube_ids: Array.from(selectedIds),
          lecture_level: lectureLevel,
          target_duration_min: targetDuration,
          section_count: sectionCount === 'auto' ? null : parseInt(sectionCount),
          emphasis_types: Array.from(emphasisTypes),
          additional_instructions: additionalInstructions || null,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setGeneratedPlan(data.result)
        loadHistory()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // 이력에서 복원
  const restoreFromHistory = (item: any) => {
    setLectureLevel(item.lecture_level || 'L2')
    setTargetDuration(item.target_duration_min || 45)
    setSectionCount(item.section_count ? String(item.section_count) : 'auto')
    setEmphasisTypes(new Set(item.emphasis_types || ['theory', 'case']))
    setAdditionalInstructions(item.additional_instructions || '')
    if (item.selected_youtube_ids) {
      setSelectedIds(new Set(item.selected_youtube_ids.map(Number)))
    }
    setGeneratedPlan(item.ai_result)
    setShowHistory(false)
  }

  // 체크박스 토글
  const toggleTranscript = (youtubeId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(youtubeId)) next.delete(youtubeId)
      else next.add(youtubeId)
      return next
    })
  }

  const toggleAllTranscripts = () => {
    if (selectedIds.size === transcripts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transcripts.map(t => t.youtube_id)))
    }
  }

  const toggleEmphasis = (type: string) => {
    setEmphasisTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">강의안 생성 — 관리자 큐레이션</h1>

      {/* Step 1: 캡슐 선택 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Step 1. 캡슐 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Concept ID</Label>
              <Input
                type="number"
                value={conceptId}
                onChange={e => setConceptId(e.target.value)}
                placeholder="개념 ID 입력"
              />
            </div>
            <button onClick={loadCapsuleData} disabled={!conceptId} className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors">
              불러오기
            </button>
            {capsule && (
              <button onClick={() => { loadHistory(); setShowHistory(!showHistory) }} className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors">
                이전 강의안 ({history.length})
              </button>
            )}
          </div>

          {capsule && (
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
              <div className="font-medium">{capsule.capsule_title}</div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                레벨: {capsule.level} | 추천 시간: {capsule.recommended_duration}분
              </div>
              <div className="text-sm text-gray-500 mt-1">{capsule.overview?.slice(0, 150)}...</div>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이력 팝업 */}
      {showHistory && history.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">이전 강의안 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map((item: any) => (
                <div
                  key={item.plan_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-[var(--color-surface-overlay)] cursor-pointer"
                  onClick={() => restoreFromHistory(item)}
                >
                  <div>
                    <div className="text-sm font-medium">
                      v{item.version} — {item.lecture_level} / {item.target_duration_min}분
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('ko-KR')} |
                      대본 {item.selected_youtube_ids?.length || 0}개 선별 |
                      {item.status}
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-sm transition-colors flex items-center gap-1.5">복원</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 온톨로지 컨텍스트 */}
      {ontologyContext && capsule && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">온톨로지 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 bg-[var(--color-surface-overlay)] rounded">
                <div className="text-2xl font-bold">{ontologyContext.expert_count}</div>
                <div className="text-xs text-gray-500">참여 전문가</div>
              </div>
              <div className="text-center p-2 bg-[var(--color-surface-overlay)] rounded">
                <div className="text-2xl font-bold">{ontologyContext.video_count}</div>
                <div className="text-xs text-gray-500">관련 영상</div>
              </div>
              <div className="text-center p-2 bg-[var(--color-surface-overlay)] rounded">
                <div className="text-2xl font-bold">{ontologyContext.avg_relevance.toFixed(2)}</div>
                <div className="text-xs text-gray-500">평균 관련도</div>
              </div>
              <div className="text-center p-2 bg-[var(--color-surface-overlay)] rounded">
                <div className="text-2xl font-bold">{ontologyContext.roadmap_position.level}</div>
                <div className="text-xs text-gray-500">{ontologyContext.roadmap_position.lecture_level}</div>
              </div>
            </div>

            {/* 개념 위치 그래프 */}
            {(ontologyContext.prerequisites.length > 0 || ontologyContext.successors.length > 0) && (
              <div className="border rounded-lg p-3">
                <div className="text-sm font-medium mb-2">개념 위치 (지식 그래프)</div>
                <OntologyGraph
                  nodes={[
                    ...ontologyContext.prerequisites.map(p => ({ id: p.concept_id, name: p.name, level: capsule.level })),
                    { id: parseInt(conceptId), name: capsule.capsule_title, level: capsule.level, isCurrent: true },
                    ...ontologyContext.successors.map(s => ({ id: s.concept_id, name: s.name, level: capsule.level })),
                    ...ontologyContext.related.map(r => ({ id: r.concept_id, name: r.name, level: capsule.level })),
                  ]}
                  edges={[
                    ...ontologyContext.prerequisites.map(p => ({
                      source: p.concept_id,
                      target: parseInt(conceptId),
                      type: 'prerequisite' as const,
                    })),
                    ...ontologyContext.successors.map(s => ({
                      source: parseInt(conceptId),
                      target: s.concept_id,
                      type: 'prerequisite' as const,
                    })),
                    ...ontologyContext.related.map(r => ({
                      source: parseInt(conceptId),
                      target: r.concept_id,
                      type: 'related' as const,
                    })),
                  ]}
                  layout="simple"
                />
                <OntologyGraphLegend />
              </div>
            )}

            {/* 키워드 */}
            {ontologyContext.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {ontologyContext.keywords.slice(0, 10).map((kw, i) => (
                  <span key={i} className="text-xs inline-flex items-center px-2 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]">{kw}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: 대본 선별 */}
      {transcripts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Step 2. 대본 선별 — {selectedIds.size}/{transcripts.length}개 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-3">
              <button onClick={toggleAllTranscripts} className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors">
                {selectedIds.size === transcripts.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="text-xs text-gray-500">
                ※ 채널명은 관리자에게만 표시, 생성물에는 미노출
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-overlay)]">
                  <tr>
                    <th className="w-10 p-2"></th>
                    <th className="text-left p-2">대본 제목</th>
                    <th className="text-left p-2 hidden sm:table-cell">채널</th>
                    <th className="text-center p-2">관련도</th>
                    <th className="text-center p-2 hidden sm:table-cell">유형</th>
                  </tr>
                </thead>
                <tbody>
                  {transcripts.map(t => (
                    <tr
                      key={t.youtube_id}
                      className={`border-t cursor-pointer hover:bg-[var(--color-surface-overlay)] ${
                        selectedIds.has(t.youtube_id) ? 'bg-blue-500/10' : ''
                      }`}
                      onClick={() => toggleTranscript(t.youtube_id)}
                    >
                      <td className="p-2 text-center">
                        <Checkbox
                          checked={selectedIds.has(t.youtube_id)}
                          onCheckedChange={() => toggleTranscript(t.youtube_id)}
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-medium truncate max-w-xs">{t.title}</div>
                      </td>
                      <td className="p-2 text-gray-500 hidden sm:table-cell truncate max-w-[120px]">
                        {t.channel_name}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.relevance >= 0.8 ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]'}`}>
                          {t.relevance.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2 text-center hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">{t.lecture_type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 강의안 설정 */}
      {capsule && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Step 3. 강의안 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>강의 수준</Label>
                <Select value={lectureLevel} onValueChange={setLectureLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L1">L1 기초 — 용어/비유/기본사례</SelectItem>
                    <SelectItem value="L2">L2 심화 — 비교분석/전략/심화사례</SelectItem>
                    <SelectItem value="L3">L3 실전 — 사례집중/모의실습</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>목표 강의시간: {targetDuration}분</Label>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={targetDuration}
                  onChange={e => setTargetDuration(parseInt(e.target.value))}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>20분</span><span>45분</span><span>90분</span>
                </div>
              </div>

              <div>
                <Label>섹션 수</Label>
                <Select value={sectionCount} onValueChange={setSectionCount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">자동</SelectItem>
                    {[3, 4, 5, 6, 7, 8].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}개</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>강조 유형</Label>
                <div className="flex gap-3 mt-2">
                  {[
                    { key: 'theory', label: '이론' },
                    { key: 'case', label: '사례' },
                    { key: 'practice', label: '실습' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={emphasisTypes.has(key)}
                        onCheckedChange={() => toggleEmphasis(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Label>추가 지시사항</Label>
              <Textarea
                value={additionalInstructions}
                onChange={e => setAdditionalInstructions(e.target.value)}
                placeholder='예: "초보자 눈높이로", "사례 위주로 구성"'
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: 생성 & 결과 */}
      {capsule && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Step 4. 생성 & 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <button
                onClick={generatePlan}
                disabled={isGenerating || selectedIds.size === 0}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors gap-2 inline-flex items-center"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    AI 강의안 생성 중...
                  </>
                ) : (
                  '🤖 AI 강의안 생성'
                )}
              </button>
              {generatedPlan && (
                <button onClick={generatePlan} disabled={isGenerating} className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors">
                  🔄 재생성
                </button>
              )}
            </div>

            {/* 생성 결과 미리보기 */}
            {generatedPlan && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-lg">📋 {capsule.capsule_title} — 강의안</h3>

                {/* 온톨로지 개요 */}
                <div className="bg-[var(--color-surface-overlay)] rounded p-3">
                  <div className="text-sm font-medium mb-2">온톨로지 분석 개요</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>선별 대본: <strong>{generatedPlan.ontology_summary?.selected_transcript_count || selectedIds.size}개</strong></div>
                    <div>이론 비율: <strong>{generatedPlan.ontology_summary?.theory_ratio || 0}%</strong></div>
                    <div>사례 비율: <strong>{generatedPlan.ontology_summary?.case_ratio || 0}%</strong></div>
                    <div>핵심 키워드: <strong>{(generatedPlan.ontology_summary?.core_keywords || []).slice(0, 3).join(', ')}</strong></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    출처: NPLatform 부동산 전문가 {ontologyContext?.expert_count || 0}명의 강의를 AI가 종합 분석
                  </div>
                </div>

                {/* 강의 목표 */}
                <div>
                  <div className="text-sm font-medium">강의 목표</div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{generatedPlan.lecture_goal}</p>
                </div>

                {/* 대상 */}
                <div>
                  <div className="text-sm font-medium">대상</div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{generatedPlan.target_description}</p>
                </div>

                {/* 커리큘럼 테이블 */}
                <div>
                  <div className="text-sm font-medium mb-2">커리큘럼 ({generatedPlan.total_duration_min}분)</div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-surface-overlay)]">
                        <tr>
                          <th className="text-left p-2">시간</th>
                          <th className="text-left p-2">내용</th>
                          <th className="text-center p-2">방식</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedPlan.curriculum.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 whitespace-nowrap text-gray-500">{item.time_range}</td>
                            <td className="p-2">
                              <div className="font-medium">{item.title}</div>
                              {item.teaching_notes && (
                                <div className="text-xs text-gray-500 mt-1">{item.teaching_notes}</div>
                              )}
                              {item.key_points && item.key_points.length > 0 && (
                                <ul className="text-xs text-gray-600 mt-1 list-disc pl-4">
                                  {item.key_points.map((kp, i) => <li key={i}>{kp}</li>)}
                                </ul>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">
                                {item.content_type === 'opening' ? '설명' :
                                 item.content_type === 'theory' ? '강의' :
                                 item.content_type === 'case' ? '사례' :
                                 item.content_type === 'practice' ? '참여' : '요약'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {generatedPlan.supplementary_notes && (
                  <div>
                    <div className="text-sm font-medium">참고 자료</div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{generatedPlan.supplementary_notes}</p>
                  </div>
                )}

                {/* 다운로드 */}
                <div className="flex gap-3 pt-3 border-t">
                  <button
                    onClick={() => {
                      window.open(
                        `/api/ontology/capsules/export?concept_id=${conceptId}&level=${capsule.level}&ai=true&lecture_plan=true`,
                        '_blank'
                      )
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors"
                  >
                    📥 DOCX 다운로드
                  </button>
                  <button
                    onClick={() => {
                      window.open(
                        `/api/ontology/capsules/export-pdf?concept_id=${conceptId}&level=${capsule.level}&ai=true&lecture_plan=true`,
                        '_blank'
                      )
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors"
                  >
                    📥 PDF 다운로드
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
