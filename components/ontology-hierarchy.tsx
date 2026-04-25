'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Circle, BookOpen, Layers, Zap, Star, CheckCircle2, Play, Lock } from 'lucide-react'
import Link from 'next/link'

// ============================================================
// 4단계 온톨로지 계층 시각화
// Domain → Concept → SubConcept → AtomicCapsule
// ============================================================

interface DomainNode {
  domain_id: number
  domain_name: string
  color: string
  concept_count: number
}

interface ConceptNode {
  concept_id: number
  name: string
  level: string
  domain_id: number
  atomic_count?: number
  mastered_count?: number
}

interface SubConceptNode {
  sub_concept_id: number
  concept_id: number
  topic: string
  order_num: number
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

interface OntologyHierarchyProps {
  domains: DomainNode[]
  concepts: ConceptNode[]
  subConcepts?: SubConceptNode[]
  atomicCapsules?: AtomicNode[]
  selectedDomainId?: number
  selectedConceptId?: number
  showProgress?: boolean
  compact?: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  '왕초보': 'text-stone-900 bg-stone-100/10',
  '초보': 'text-stone-900 bg-stone-100/10',
  '중급': 'text-stone-900 bg-stone-100/10',
  '고급': 'text-stone-900 bg-stone-100/10',
  '전문가': 'text-stone-900 bg-stone-100/10',
}

const DIFFICULTY_COLORS = {
  beginner: { label: '초급', dot: 'bg-stone-100' },
  intermediate: { label: '중급', dot: 'bg-stone-100' },
  advanced: { label: '고급', dot: 'bg-stone-100' },
}

const STATUS_ICONS = {
  not_started: { Icon: Circle, color: 'text-gray-300' },
  in_progress: { Icon: Play, color: 'text-stone-900' },
  completed: { Icon: CheckCircle2, color: 'text-stone-900' },
  mastered: { Icon: Star, color: 'text-stone-900' },
}

export default function OntologyHierarchy({
  domains,
  concepts,
  subConcepts = [],
  atomicCapsules = [],
  selectedDomainId,
  selectedConceptId,
  showProgress = false,
  compact = false,
}: OntologyHierarchyProps) {
  const [expandedDomains, setExpandedDomains] = useState<Set<number>>(
    new Set(selectedDomainId ? [selectedDomainId] : [])
  )
  const [expandedConcepts, setExpandedConcepts] = useState<Set<number>>(
    new Set(selectedConceptId ? [selectedConceptId] : [])
  )

  const toggleDomain = (id: number) => {
    setExpandedDomains(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleConcept = (id: number) => {
    setExpandedConcepts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // 도메인별 개념 그룹핑
  const conceptsByDomain = useMemo(() => {
    const map = new Map<number, ConceptNode[]>()
    for (const c of concepts) {
      const list = map.get(c.domain_id) || []
      list.push(c)
      map.set(c.domain_id, list)
    }
    return map
  }, [concepts])

  // 개념별 Atomic 캡슐 그룹핑
  const atomicByConcept = useMemo(() => {
    const map = new Map<number, AtomicNode[]>()
    for (const a of atomicCapsules) {
      const list = map.get(a.concept_id) || []
      list.push(a)
      map.set(a.concept_id, list)
    }
    return map
  }, [atomicCapsules])

  return (
    <div className="space-y-1">
      {/* 범례 */}
      {!compact && (
        <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-muted)] mb-3 px-1">
          <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> 도메인</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> 개념</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Atomic 캡슐</span>
          {showProgress && (
            <>
              <span className="w-px h-3 bg-[var(--color-border-subtle)]" />
              <span className="flex items-center gap-1"><Circle className="w-3 h-3 text-gray-300" /> 미시작</span>
              <span className="flex items-center gap-1"><Play className="w-3 h-3 text-stone-900" /> 학습중</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-stone-900" /> 마스터</span>
            </>
          )}
        </div>
      )}

      {domains.map(domain => {
        const domainConcepts = conceptsByDomain.get(domain.domain_id) || []
        const isDomainExpanded = expandedDomains.has(domain.domain_id)

        return (
          <div key={domain.domain_id} className="rounded-lg overflow-hidden">
            {/* Domain Level */}
            <button
              onClick={() => toggleDomain(domain.domain_id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--color-surface-base)] transition-colors text-left"
            >
              {isDomainExpanded
                ? <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                : <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: domain.color || '#8b5cf6' }}
              />
              <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{domain.domain_name}</span>
              <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                개념 {domainConcepts.length}개
              </span>
            </button>

            {/* Concepts under Domain */}
            {isDomainExpanded && domainConcepts.length > 0 && (
              <div className="ml-5 border-l-2 border-[var(--color-border-subtle)] pl-2 mb-2">
                {domainConcepts.map(concept => {
                  const isConceptExpanded = expandedConcepts.has(concept.concept_id)
                  const atomics = atomicByConcept.get(concept.concept_id) || []
                  const masteredCount = concept.mastered_count || 0
                  const atomicCount = concept.atomic_count || atomics.length
                  const lvlStyle = LEVEL_COLORS[concept.level] || 'text-[var(--color-text-secondary)] bg-[var(--color-surface-base)]'
                  const progressPct = atomicCount > 0 ? Math.round((masteredCount / atomicCount) * 100) : 0

                  return (
                    <div key={concept.concept_id}>
                      {/* Concept Level */}
                      <div className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-[var(--color-surface-base)] rounded-lg transition-colors group">
                        {atomicCount > 0 ? (
                          <button onClick={() => toggleConcept(concept.concept_id)} className="shrink-0">
                            {isConceptExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                              : <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
                          </button>
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0" />
                        )}

                        <BookOpen className="w-3.5 h-3.5 text-stone-900 shrink-0" />

                        <Link
                          href={`/curriculum/concept/${concept.concept_id}`}
                          className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-stone-900 truncate flex-1"
                        >
                          {concept.name}
                        </Link>

                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${lvlStyle} shrink-0`}>
                          {concept.level}
                        </span>

                        {showProgress && atomicCount > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-12 h-1.5 bg-[var(--color-border-subtle)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-stone-100 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[var(--color-text-muted)]">{progressPct}%</span>
                          </div>
                        )}

                        {atomicCount > 0 && (
                          <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                            {atomicCount}캡슐
                          </span>
                        )}

                        {atomicCount === 0 && (
                          <Link
                            href={`/curriculum/concept/${concept.concept_id}`}
                            className="text-[10px] text-stone-900 hover:text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            생성
                          </Link>
                        )}
                      </div>

                      {/* Atomic Capsules under Concept */}
                      {isConceptExpanded && atomics.length > 0 && (
                        <div className="ml-7 border-l border-[var(--color-border-subtle)] pl-2 mb-1">
                          {atomics
                            .sort((a, b) => a.order_in_concept - b.order_in_concept)
                            .map(atomic => {
                              const diffStyle = DIFFICULTY_COLORS[atomic.difficulty] || DIFFICULTY_COLORS.beginner
                              const status = atomic.status || 'not_started'
                              const StatusInfo = STATUS_ICONS[status]

                              return (
                                <Link
                                  key={atomic.atomic_id}
                                  href={`/curriculum/study/${atomic.atomic_id}`}
                                  className="flex items-center gap-1.5 py-1 px-2 hover:bg-[var(--color-surface-base)] rounded transition-colors"
                                >
                                  {showProgress ? (
                                    <StatusInfo.Icon className={`w-3 h-3 ${StatusInfo.color} shrink-0`} />
                                  ) : (
                                    <Zap className="w-3 h-3 text-stone-900 shrink-0" />
                                  )}

                                  <span className="text-[11px] text-[var(--color-text-secondary)] truncate flex-1">
                                    {atomic.topic}
                                  </span>

                                  <div className={`w-1.5 h-1.5 rounded-full ${diffStyle.dot} shrink-0`} title={diffStyle.label} />

                                  <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                                    {atomic.estimated_min}분
                                  </span>
                                </Link>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {domains.length === 0 && (
        <div className="text-center py-6 text-sm text-[var(--color-text-muted)]">
          데이터를 불러오는 중...
        </div>
      )}
    </div>
  )
}
