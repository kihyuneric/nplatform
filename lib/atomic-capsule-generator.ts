// Phase 6: Atomic 캡슐 생성 엔진
// 개념 하나를 10~30개의 원자적 학습 단위로 분해하여
// 각각을 완전 자기완결형 교육 캡슐로 생성

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import { researchTopicFromWeb, generateAtomicCapsuleContent } from './web-enricher'
import type { AtomicCapsuleContent } from './web-enricher'

const MODEL_SONNET = 'claude-sonnet-4-20250514'

// ============================================================
// 타입
// ============================================================

export interface AtomicTopicList {
  concept: string
  total_count: number
  topics: Array<{
    order: number
    topic: string
    description: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    estimated_minutes: number
    is_prerequisite_for?: string[]
  }>
}

export interface GeneratedAtomicCapsule {
  order: number
  topic: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_minutes: number
  content: AtomicCapsuleContent
  web_research_available: boolean
}

export interface AtomicCapsuleGenerationResult {
  concept_id: number
  concept_name: string
  total_generated: number
  capsules: GeneratedAtomicCapsule[]
  failed_topics: string[]
}

// ============================================================
// Step 1: 개념을 Atomic 주제 목록으로 분해
// ============================================================

const TOPIC_DECOMPOSE_SYSTEM = `당신은 한국 부동산 투자 교육 커리큘럼 설계 전문가입니다.
하나의 부동산 개념을 학습자가 단계별로 마스터할 수 있는
작은 원자적 학습 단위들로 분해합니다.

각 Atomic 주제 기준:
- 독립적: 이 주제 하나만 학습해도 의미 있음
- 완전성: 이 주제를 공부하면 해당 내용을 마스터할 수 있음
- 적절한 크기: 10~20분 내 학습 가능
- 명확한 순서: 선수 지식 기반으로 논리적 순서

반드시 유효한 JSON으로만 응답하세요.`

export async function decomposeConceptToAtomicTopics(params: {
  conceptName: string
  conceptLevel: string
  domainName: string
  conceptDescription: string
  existingKeywords: string[]
  syllabusHints: string[]
}): Promise<AtomicTopicList | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { conceptName, conceptLevel, domainName, conceptDescription, existingKeywords, syllabusHints } = params

  try {
    const response = await client.messages.create({
      model: MODEL_SONNET,
      max_tokens: 4000,
      system: TOPIC_DECOMPOSE_SYSTEM,
      messages: [{
        role: 'user',
        content: `개념: ${conceptName}
도메인: ${domainName}
학습 수준: ${conceptLevel}
개요: ${conceptDescription}
관련 키워드: ${existingKeywords.slice(0, 10).join(', ')}
실라버스 힌트: ${syllabusHints.join(' / ')}

이 개념("${conceptName}")을 완전히 마스터하기 위한 Atomic 학습 단위 목록을 만들어주세요.
초보자부터 심화까지 순서대로 10~20개의 주제로 분해해주세요.

JSON 형식:
{
  "concept": "${conceptName}",
  "total_count": number,
  "topics": [
    {
      "order": 1,
      "topic": "구체적인 소주제명",
      "description": "이 소주제에서 배우는 내용 한 줄 설명",
      "difficulty": "beginner|intermediate|advanced",
      "estimated_minutes": 10~20,
      "is_prerequisite_for": ["다음에 배울 주제명"] (선택)
    },
    ...
  ]
}`
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    let parsed: AtomicTopicList | null = null
    try { parsed = JSON.parse(text) } catch {
      const m = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (m) { try { parsed = JSON.parse(m[1].trim()) } catch {} }
      if (!parsed) {
        const idx = text.indexOf('{')
        if (idx >= 0) { try { parsed = JSON.parse(text.slice(idx)) } catch {} }
      }
    }

    return parsed && 'topics' in parsed ? parsed : null
  } catch (error) {
    logger.error('[AtomicGenerator] decomposeConceptToAtomicTopics failed:', { error: error })
    return null
  }
}

// ============================================================
// Step 2: 각 Atomic 주제에 대해 완전 콘텐츠 생성
// (웹 조사 → AI 합성 → 완전 자기완결형 캡슐)
// ============================================================

export async function generateAllAtomicCapsules(params: {
  conceptId: number
  conceptName: string
  conceptLevel: string
  domainName: string
  atomicTopics: AtomicTopicList
  transcriptClues: {
    keywords: string[]
    segments: string[]
    caseRefs: string[]
    expertCount: number
  }
  onProgress?: (current: number, total: number, topic: string) => void
  maxConcurrent?: number
}): Promise<AtomicCapsuleGenerationResult> {
  const {
    conceptId,
    conceptName,
    conceptLevel,
    domainName,
    atomicTopics,
    transcriptClues,
    onProgress,
    maxConcurrent = 3,
  } = params

  const result: AtomicCapsuleGenerationResult = {
    concept_id: conceptId,
    concept_name: conceptName,
    total_generated: 0,
    capsules: [],
    failed_topics: [],
  }

  const topics = atomicTopics.topics
  const conceptContext = `${conceptName} (${domainName} 도메인, ${conceptLevel} 수준)`

  // 배치 처리 (maxConcurrent개씩 병렬)
  for (let i = 0; i < topics.length; i += maxConcurrent) {
    const batch = topics.slice(i, i + maxConcurrent)

    const batchResults = await Promise.allSettled(
      batch.map(async (topicItem) => {
        onProgress?.(i + batch.indexOf(topicItem) + 1, topics.length, topicItem.topic)

        // 1. 웹 조사 (병렬로 먼저 수행)
        const webResearch = await researchTopicFromWeb(
          topicItem.topic,
          conceptContext,
        )

        // 500ms 딜레이 (API 부하 방지)
        await new Promise(r => setTimeout(r, 500))

        // 2. 완전 콘텐츠 생성
        const content = await generateAtomicCapsuleContent({
          topic: topicItem.topic,
          conceptName,
          conceptLevel,
          transcriptClues,
          webResearch,
          order: topicItem.order,
          totalInConcept: topics.length,
        })

        if (!content) throw new Error(`Content generation failed for: ${topicItem.topic}`)

        return {
          order: topicItem.order,
          topic: topicItem.topic,
          description: topicItem.description,
          difficulty: topicItem.difficulty,
          estimated_minutes: content.estimated_minutes || topicItem.estimated_minutes,
          content,
          web_research_available: !!webResearch,
        } as GeneratedAtomicCapsule
      })
    )

    for (let j = 0; j < batchResults.length; j++) {
      const batchResult = batchResults[j]
      if (batchResult.status === 'fulfilled') {
        result.capsules.push(batchResult.value)
        result.total_generated++
      } else {
        result.failed_topics.push(batch[j].topic)
        console.error(`[AtomicGenerator] Failed: ${batch[j].topic}`, batchResult.reason)
      }
    }

    // 배치 간 1초 딜레이
    if (i + maxConcurrent < topics.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // 순서 정렬
  result.capsules.sort((a, b) => a.order - b.order)

  return result
}

// ============================================================
// 단일 Atomic 캡슐 생성 (개별 재생성용)
// ============================================================

export async function generateSingleAtomicCapsule(params: {
  topic: string
  conceptName: string
  conceptLevel: string
  domainName: string
  order: number
  totalInConcept: number
  transcriptClues: {
    keywords: string[]
    segments: string[]
    caseRefs: string[]
    expertCount: number
  }
}): Promise<AtomicCapsuleContent | null> {
  const { topic, conceptName, conceptLevel, domainName, order, totalInConcept, transcriptClues } = params

  const conceptContext = `${conceptName} (${domainName} 도메인, ${conceptLevel} 수준)`

  // 웹 조사
  const webResearch = await researchTopicFromWeb(topic, conceptContext)

  // 콘텐츠 생성
  return generateAtomicCapsuleContent({
    topic,
    conceptName,
    conceptLevel,
    transcriptClues,
    webResearch,
    order,
    totalInConcept,
  })
}

// ============================================================
// 연습문제 추가 생성 (기존 캡슐에 퀴즈 보강)
// ============================================================

export async function generateQuizForCapsule(params: {
  topic: string
  content: AtomicCapsuleContent
  count?: number
}): Promise<AtomicCapsuleContent['quiz']> {
  if (!process.env.ANTHROPIC_API_KEY) return []

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { topic, content, count = 5 } = params

  try {
    const response = await client.messages.create({
      model: MODEL_SONNET,
      max_tokens: 2000,
      system: `당신은 한국 부동산 투자 교육 문제 출제 전문가입니다.
공인중개사 시험, 투자 실무 등에서 중요하게 다루는 개념을 테스트하는 문제를 출제합니다.
반드시 유효한 JSON으로만 응답하세요.`,
      messages: [{
        role: 'user',
        content: `주제: ${topic}
핵심 내용: ${content.definition.formal}
체크리스트: ${content.checklist.slice(0, 5).join(', ')}

이 주제에 대한 연습문제 ${count}개를 생성해주세요.
각 문제는 4지선다형 또는 단답형으로 작성합니다.

JSON 형식: [
  {
    "question": "질문",
    "options": ["①...", "②...", "③...", "④..."],
    "answer": "정답 (①②③④ 중 하나 또는 단답)",
    "explanation": "해설 (100~200자, 왜 이것이 정답인지, 관련 법령 포함)"
  }
]`
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    let parsed: AtomicCapsuleContent['quiz'] = []
    try { parsed = JSON.parse(text) } catch {
      const m = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (m) { try { parsed = JSON.parse(m[1].trim()) } catch {} }
      if (!parsed || !Array.isArray(parsed)) {
        const idx = text.indexOf('[')
        if (idx >= 0) { try { parsed = JSON.parse(text.slice(idx)) } catch {} }
      }
    }

    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logger.error('[AtomicGenerator] generateQuizForCapsule failed:', { error: error })
    return []
  }
}
