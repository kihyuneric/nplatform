'use client'

import { useState, useEffect } from 'react'
import { X, BookOpen, Users, Video, ChevronRight, Zap, CheckCircle, Star } from 'lucide-react'
import Link from 'next/link'

interface Props {
  conceptId: number
  onClose: () => void
}

interface ConceptDetail {
  concept_id: number
  name: string
  level: string
  difficulty: number
  description: string
  domain_id: number
  keywords: string[]
  estimated_minutes: number
  relationsOut: Array<{ target: any; relation_type: string }>
  relationsIn: Array<{ source: any; relation_type: string }>
  youtube: Array<{ youtube_id: number; title: string; channel_name: string; relevance: number }>
  children: Array<{ concept_id: number; name: string }>
}

interface ImportanceData {
  expert_count: number
  avg_relevance: number
  experts: Array<{ channel_name: string; relevance: number; video_title: string }>
}

interface AtomicCapsuleInfo {
  atomic_id: number
  topic: string
  order_in_concept: number
  difficulty: string
  estimated_min: number
}

interface ProgressInfo {
  total_capsules: number
  mastered: number
  completed: number
  in_progress: number
  mastery_pct: number
}

export default function ConceptDetailPanel({ conceptId, onClose }: Props) {
  const [detail, setDetail] = useState<ConceptDetail | null>(null)
  const [importance, setImportance] = useState<ImportanceData | null>(null)
  const [atomicCapsules, setAtomicCapsules] = useState<AtomicCapsuleInfo[]>([])
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/ontology/concept/${conceptId}`).then(r => r.json()),
      fetch(`/api/ontology/importance?limit=200`).then(r => r.json()),
      fetch(`/api/ontology/atomic-capsules?concept_id=${conceptId}`).then(r => r.json()).catch(() => ({ capsules: [] })),
      fetch(`/api/ontology/progress?user_id=anonymous&concept_id=${conceptId}`).then(r => r.json()).catch(() => null),
    ]).then(([conceptRes, impRes, capsuleRes, progressRes]) => {
      setDetail(conceptRes)
      const imp = (impRes.importance || []).find((i: any) => i.concept_id === conceptId)
      setImportance(imp || null)
      setAtomicCapsules(capsuleRes.capsules || [])
      if (progressRes && !progressRes.error) setProgressInfo(progressRes)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [conceptId])

  if (loading) {
    return (
      <div className="w-80 bg-[var(--color-surface-elevated)] border-l border-[var(--color-border-subtle)] p-4 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!detail) return null

  const prerequisites = detail.relationsIn
    .filter(r => r.relation_type === 'prerequisite')
    .map(r => r.source)
    .filter(Boolean)

  const relatedConcepts = [
    ...detail.relationsOut.filter(r => r.relation_type === 'relatedTo').map(r => r.target),
    ...detail.relationsIn.filter(r => r.relation_type === 'relatedTo').map(r => r.source),
  ].filter(Boolean)

  return (
    <div className="w-80 bg-[var(--color-surface-elevated)] border-l border-[var(--color-border-subtle)] overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-4 py-3 flex items-center justify-between">
        <h3 className="font-bold text-lg truncate">{detail.name}</h3>
        <button onClick={onClose} className="p-1 hover:bg-[var(--color-surface-overlay)] rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-0.5 bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] text-xs rounded-full">{detail.level}</span>
          <span className="px-2 py-0.5 bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] text-xs rounded-full">
            난이도 {'★'.repeat(detail.difficulty || 1)}
          </span>
          <span className="px-2 py-0.5 bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] text-xs rounded-full">
            {detail.estimated_minutes || 30}분
          </span>
        </div>

        {/* Description */}
        {detail.description && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">설명</h4>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{detail.description}</p>
          </div>
        )}

        {/* Expert importance */}
        {importance && importance.expert_count > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> 전문가 강조도
            </h4>
            <div className="space-y-2">
              {importance.experts.map((exp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-secondary)] w-20 truncate">{exp.channel_name}</span>
                  <div className="flex-1 bg-[var(--color-surface-overlay)] rounded-full h-2">
                    <div
                      className="bg-stone-100 rounded-full h-2 transition-all"
                      style={{ width: `${Math.round(exp.relevance * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] w-10 text-right">
                    {Math.round(exp.relevance * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">선수 개념</h4>
            <div className="space-y-1">
              {prerequisites.map((p: any) => (
                <div key={p.concept_id} className="flex items-center gap-1 text-sm text-stone-900 hover:text-stone-900 cursor-pointer">
                  <ChevronRight className="w-3 h-3" />
                  {p.name}
                  <span className="text-xs text-[var(--color-text-muted)] ml-1">{p.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related concepts */}
        {relatedConcepts.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">관련 개념</h4>
            <div className="flex flex-wrap gap-1">
              {relatedConcepts.slice(0, 8).map((c: any) => (
                <span key={c.concept_id} className="px-2 py-0.5 bg-stone-100/10 text-stone-900 text-xs rounded">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related videos */}
        {detail.youtube && detail.youtube.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
              <Video className="w-3 h-3" /> 관련 영상
            </h4>
            <div className="space-y-2">
              {detail.youtube.slice(0, 5).map((yt: any) => (
                <div key={yt.youtube_id} className="bg-[var(--color-surface-base)] rounded p-2">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] line-clamp-2">{yt.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--color-text-muted)]">
                    <span>{yt.channel_name}</span>
                    <span>관련도 {Math.round(yt.relevance * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atomic Capsules */}
        {atomicCapsules.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3 text-stone-900" /> Atomic 캡슐 ({atomicCapsules.length}개)
            </h4>
            {/* Progress bar */}
            {progressInfo && progressInfo.total_capsules > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
                  <span>마스터 진도</span>
                  <span className="font-semibold text-stone-900">{progressInfo.mastery_pct}%</span>
                </div>
                <div className="w-full bg-[var(--color-surface-overlay)] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-stone-100 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${progressInfo.mastery_pct}%` }}
                  />
                </div>
                <div className="flex gap-2 mt-1 text-[9px] text-[var(--color-text-muted)]">
                  {progressInfo.mastered > 0 && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-stone-900" />{progressInfo.mastered} 마스터</span>}
                  {progressInfo.completed > 0 && <span className="flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5 text-stone-900" />{progressInfo.completed} 완료</span>}
                  {progressInfo.in_progress > 0 && <span>{progressInfo.in_progress} 학습중</span>}
                </div>
              </div>
            )}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {atomicCapsules.slice(0, 10).map((cap) => (
                <Link
                  key={cap.atomic_id}
                  href={`/curriculum/study/${cap.atomic_id}`}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-100/10 text-xs transition-colors group"
                >
                  <span className="w-5 h-5 rounded-full bg-stone-100/15 text-stone-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {cap.order_in_concept}
                  </span>
                  <span className="text-[var(--color-text-primary)] truncate flex-1 group-hover:text-stone-900">{cap.topic}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] shrink-0">{cap.estimated_min}분</span>
                </Link>
              ))}
              {atomicCapsules.length > 10 && (
                <p className="text-[10px] text-[var(--color-text-muted)] text-center py-1">+{atomicCapsules.length - 10}개 더...</p>
              )}
            </div>
          </div>
        )}

        {/* Action links */}
        <div className="space-y-2">
          {atomicCapsules.length > 0 && (
            <Link
              href={`/curriculum/concept/${conceptId}`}
              className="block w-full text-center py-2 bg-gradient-to-r from-stone-100 to-indigo-500 text-white text-sm font-medium rounded-lg hover:from-stone-100 hover:to-indigo-600 transition-colors"
            >
              <Zap className="w-4 h-4 inline-block mr-1" />
              Atomic 캡슐 학습하기
            </Link>
          )}
          <Link
            href={`/curriculum/capsule/${conceptId}`}
            className="block w-full text-center py-2 bg-stone-100/10 text-stone-900 text-sm font-medium rounded-lg hover:bg-stone-100/15 transition-colors"
          >
            <BookOpen className="w-4 h-4 inline-block mr-1" />
            강의 캡슐 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
