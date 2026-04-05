// Phase 6: 웹 검색 기반 교육 콘텐츠 보강 엔진
// Anthropic web_search_20250305 도구로 법령·판례·공시 정보 실시간 수집
// 대본 단서만 사용하던 1단계에서 웹 지식을 더한 2단계 파이프라인으로 업그레이드

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'

const MODEL_SONNET = 'claude-sonnet-4-20250514'

// ============================================================
// 웹 조사 결과 타입
// ============================================================

export interface WebResearchResult {
  topic: string
  legal_definition: string    // 법적 정의 (법령 조항 번호 포함)
  legal_basis: string         // 관련 법령 근거 (법 이름, 조항)
  court_precedents: string    // 판례·처리 사례 (판례번호 포함)
  practical_guide: string     // 실전 투자 활용법 (단계별)
  common_mistakes: string     // 흔한 실수 TOP 3
  key_points: string[]        // 핵심 포인트 5개
  latest_updates: string      // 2024~2026 최신 법령 변경사항
  sources_used: string[]      // 참조 출처
}

// Atomic 캡슐 전체 콘텐츠 구조
export interface AtomicCapsuleContent {
  topic: string
  subtitle: string
  estimated_minutes: number

  // 1. 개념 정의 섹션
  definition: {
    formal: string            // 공식·법적 정의 (법령 조항)
    plain: string             // 쉬운 언어 재설명
    key_characteristics: string[]  // 핵심 특성 3가지
  }

  // 2. 왜 중요한가
  importance: {
    why_essential: string     // 이것 없으면 생기는 문제
    investment_impact: string // 투자 수익/손실 관련 핵심
  }

  // 3. 핵심 원리 단계별
  principles: Array<{
    step: number
    title: string
    explanation: string
    example: string
  }>

  // 4. 법령 근거
  legal_foundation: {
    laws: Array<{ law_name: string; article: string; summary: string }>
    latest_changes: string    // 2024~2026 최신 변경사항
  }

  // 5. 실전 사례
  cases: {
    success_case: string      // 성공 사례 (구체적 수치 포함)
    failure_case: string      // 실패 사례 (교훈 포함)
    scenario: string          // 시뮬레이션 시나리오
  }

  // 6. 흔한 실수 TOP 3
  common_mistakes: Array<{
    mistake: string
    reality: string
    correct_approach: string
  }>

  // 7. 실전 체크리스트
  checklist: string[]         // 투자 전 확인 사항 7~10개

  // 8. 연습문제
  quiz: Array<{
    question: string
    options?: string[]        // 객관식 선택지
    answer: string
    explanation: string
  }>

  // 9. 마스터 확인
  mastery: {
    criteria: string[]        // 마스터 확인 기준 3가지
    self_check: string[]      // 자기 확인 질문 3개
    next_topics: string[]     // 다음 학습 추천 주제
  }

  // 메타
  sources: string[]           // 참조 출처
  keywords: string[]          // 핵심 키워드
}

// ============================================================
// 웹 검색 기반 주제 조사
// ============================================================

export async function researchTopicFromWeb(
  topic: string,
  conceptContext: string,
  retries = 1
): Promise<WebResearchResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const systemPrompt = `당신은 대한민국 부동산 투자 교육 연구 전문가입니다.
주어진 주제에 대해 공신력 있는 출처에서 정확한 정보를 검색·수집합니다.

검색 우선 출처:
1. 법제처 (law.go.kr) — 법령 조문, 시행령, 시행규칙
2. 대법원 (scourt.go.kr) — 판례
3. 국토교통부 (molit.go.kr) — 부동산 정책, 공시
4. 한국공인중개사협회 — 실무 가이드
5. 부동산 전문 학술지

반드시 유효한 JSON으로만 응답하세요.`

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000))

      // web_search_20250305 베타 도구 사용
      const response = await (client.messages.create as any)({
        model: MODEL_SONNET,
        max_tokens: 6000,
        system: systemPrompt,
        betas: ['web-search-2025-03-05'],
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
        messages: [{
          role: 'user',
          content: `주제: ${topic}
부동산 교육 맥락: ${conceptContext}

위 주제에 대해 웹 검색으로 다음 정보를 수집하고 JSON으로 반환해주세요:

1. legal_definition (300~500자): 법적 정의 — 관련 법령 조항 번호 포함
2. legal_basis (200~400자): 관련 법령 목록 (법 이름, 조항, 한 줄 요약)
3. court_precedents (300~500자): 관련 대법원 판례 또는 처리 사례 (판례번호 포함)
4. practical_guide (300~500자): 실전 투자에서 이 개념을 활용하는 단계별 방법
5. common_mistakes (200~400자): 투자자들이 이 주제에서 흔히 하는 실수 3가지
6. key_points (배열, 5개): 이 주제의 핵심 포인트 (각 50~80자)
7. latest_updates (200~300자): 2024년~2026년 관련 법령 변경사항
8. sources_used (배열): 참조한 URL 또는 출처명

JSON 형식: { "topic": string, "legal_definition": string, "legal_basis": string, "court_precedents": string, "practical_guide": string, "common_mistakes": string, "key_points": string[], "latest_updates": string, "sources_used": string[] }`
        }],
      })

      const text = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')

      if (!text.trim()) continue

      // 3중 파싱
      let parsed: WebResearchResult | null = null
      try { parsed = JSON.parse(text) } catch {
        const m = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (m) { try { parsed = JSON.parse(m[1].trim()) } catch {} }
        if (!parsed) {
          const idx = text.indexOf('{')
          if (idx >= 0) { try { parsed = JSON.parse(text.slice(idx)) } catch {} }
        }
      }

      if (parsed && 'legal_definition' in parsed) {
        return { ...parsed, topic }
      }
    } catch (error) {
      console.warn(`[WebEnricher] Web search attempt ${attempt + 1} failed:`, (error as any)?.message || error)
      // 웹 검색 실패 시 AI 지식 기반 폴백으로 계속
    }
  }

  // 웹 검색 실패 → AI 지식 기반 조사로 폴백
  return researchTopicFromAIKnowledge(topic, conceptContext)
}

// ============================================================
// AI 지식 기반 조사 (웹 검색 불가 시 폴백)
// Claude의 광범위한 한국 부동산법 지식 활용
// ============================================================

async function researchTopicFromAIKnowledge(
  topic: string,
  conceptContext: string
): Promise<WebResearchResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const systemPrompt = `당신은 대한민국 부동산법·투자 전문가입니다.
민법, 주택임대차보호법, 상가건물임대차보호법, 부동산거래신고법, 공인중개사법,
경매법(민사집행법), 등기법, 도시개발법, 재개발·재건축 관련 법령 등을
깊이 있게 이해하고 있습니다.

주어진 주제에 대해 당신의 전문 지식을 바탕으로 정확한 교육 자료를 작성합니다.
법령 조항 번호, 판례 번호, 구체적 수치를 최대한 포함하세요.
반드시 유효한 JSON으로만 응답하세요.`

  try {
    const response = await client.messages.create({
      model: MODEL_SONNET,
      max_tokens: 5000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `주제: ${topic}
부동산 교육 맥락: ${conceptContext}

이 주제에 대해 당신의 전문 지식을 바탕으로 다음 정보를 제공해주세요:

JSON: {
  "topic": "${topic}",
  "legal_definition": "법적 정의와 개념 설명 (관련 법령 조항 포함, 300~500자)",
  "legal_basis": "관련 법령 근거 (법 이름, 조항, 요약, 200~400자)",
  "court_precedents": "관련 대법원 판례 또는 처리 사례 (가능하면 판례번호 포함, 300~500자)",
  "practical_guide": "실전 투자 활용법 단계별 설명 (300~500자)",
  "common_mistakes": "투자자들이 흔히 하는 실수 3가지 (200~400자)",
  "key_points": ["핵심포인트1", "핵심포인트2", "핵심포인트3", "핵심포인트4", "핵심포인트5"],
  "latest_updates": "2024~2025년 관련 법령 변경사항 (200~300자)",
  "sources_used": ["관련법령명1", "관련법령명2"]
}`
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    let parsed: WebResearchResult | null = null
    try { parsed = JSON.parse(text) } catch {
      const m = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (m) { try { parsed = JSON.parse(m[1].trim()) } catch {} }
      if (!parsed) {
        const idx = text.indexOf('{')
        if (idx >= 0) { try { parsed = JSON.parse(text.slice(idx)) } catch {} }
      }
    }

    return parsed || null
  } catch (error) {
    logger.error('[WebEnricher] AI knowledge fallback failed:', { error: error })
    return null
  }
}

// ============================================================
// Atomic 캡슐 완전 콘텐츠 생성
// Stage 1 (대본 단서) + Stage 2 (웹/AI 지식) → 완전 자기완결형 교육 단위
// ============================================================

const ATOMIC_CAPSULE_SYSTEM_PROMPT = `당신은 대한민국 부동산 투자 교육 분야 최고 전문가이자 교육 콘텐츠 작성 전문가입니다.

당신의 역할:
- 학습자가 이 캡슐 하나만 완전히 공부하면 해당 개념을 마스터할 수 있는 교육 자료 작성
- 기존 어떤 부동산 투자 교재보다 전문적이고 실용적인 내용
- 이론서보다 깊이 있고, 실용서보다 바로 적용 가능한 내용

콘텐츠 원칙:
1. 대본 데이터는 "주제 구조 힌트"로만 활용 — 내용은 당신의 전문 지식 + 웹 조사 자료를 최대한 활용
2. 법령 조항 번호 구체적 명시 (예: 민법 제621조, 주택임대차보호법 제3조의4)
3. 판례 번호 포함 (가능한 경우)
4. 구체적 수치 포함 (금액, 기한, 비율 등)
5. 투자자 관점에서 왜 중요한지 명확히
6. 초보자도 이해, 전문가도 배울 수 있는 깊이
7. 실전에서 바로 사용할 수 있는 체크리스트와 연습문제

중요:
- 개별 유튜버·채널명 절대 노출 금지
- 출처는 "NPLatform 부동산 전문가 N명 + 공식 법령 자료" 형식
- 반드시 유효한 JSON으로만 응답하세요`

export async function generateAtomicCapsuleContent(params: {
  topic: string
  conceptName: string
  conceptLevel: string
  transcriptClues: {
    keywords: string[]
    segments: string[]
    caseRefs: string[]
    expertCount: number
  }
  webResearch: WebResearchResult | null
  order: number
  totalInConcept: number
}): Promise<AtomicCapsuleContent | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { topic, conceptName, conceptLevel, transcriptClues, webResearch, order, totalInConcept } = params

  // 입력 컨텍스트 구성 (대본은 힌트, 웹 연구가 메인)
  const clueContext = `[대본 분석 단서 — 주제 구조 참고용]
개념: ${conceptName} (${conceptLevel} 과정)
분석된 전문가 수: ${transcriptClues.expertCount}명
핵심 키워드: ${transcriptClues.keywords.slice(0, 8).join(', ')}
언급된 세그먼트: ${transcriptClues.segments.slice(0, 5).join(' / ')}
참조 사례: ${transcriptClues.caseRefs.slice(0, 3).join(' / ')}`

  const webContext = webResearch
    ? `[웹 조사 자료 — 주요 콘텐츠 근거]
법적 정의: ${webResearch.legal_definition}
법령 근거: ${webResearch.legal_basis}
판례/사례: ${webResearch.court_precedents}
실전 가이드: ${webResearch.practical_guide}
흔한 실수: ${webResearch.common_mistakes}
최신 업데이트: ${webResearch.latest_updates}`
    : '[웹 조사: 당신의 전문 지식 최대 활용]'

  const userContent = `${clueContext}

${webContext}

[생성할 Atomic 캡슐]
주제: ${topic}
이 개념 내 ${order}번째 / 전체 ${totalInConcept}개 캡슐

위 데이터를 바탕으로 완전 자기완결형 학습 캡슐을 생성해주세요.
학습자가 이 캡슐 하나만 완전히 공부하면 "${topic}"을 마스터할 수 있어야 합니다.

JSON 구조:
{
  "topic": string,
  "subtitle": string (한 줄 부제목),
  "estimated_minutes": number (예상 학습 시간),
  "definition": {
    "formal": string (법적 정의, 법령 조항 포함, 200~350자),
    "plain": string (쉬운 재설명, 150~250자),
    "key_characteristics": string[] (3가지)
  },
  "importance": {
    "why_essential": string (이것 없으면 생기는 문제, 150~250자),
    "investment_impact": string (투자 수익/손실 관련, 150~250자)
  },
  "principles": [
    { "step": 1, "title": string, "explanation": string(100~200자), "example": string(80~150자) },
    ...
  ],
  "legal_foundation": {
    "laws": [{ "law_name": string, "article": string, "summary": string }],
    "latest_changes": string (2024~2025 변경사항, 150~250자)
  },
  "cases": {
    "success_case": string (성공 사례, 구체적 수치 포함, 200~350자),
    "failure_case": string (실패 사례, 교훈 포함, 200~350자),
    "scenario": string (투자 시뮬레이션, 200~350자)
  },
  "common_mistakes": [
    { "mistake": string, "reality": string, "correct_approach": string },
    ...
  ],
  "checklist": string[] (7~10개 투자 전 확인 사항),
  "quiz": [
    { "question": string, "options": string[] (4개), "answer": string, "explanation": string(100~200자) },
    ...
  ],
  "mastery": {
    "criteria": string[] (3가지 — 이것을 이해했으면 마스터),
    "self_check": string[] (3개 자기 확인 질문),
    "next_topics": string[] (다음 학습 추천 주제 3개)
  },
  "sources": string[],
  "keywords": string[] (5~10개)
}`

  try {
    const response = await client.messages.create({
      model: MODEL_SONNET,
      max_tokens: 8000,
      system: ATOMIC_CAPSULE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    let parsed: AtomicCapsuleContent | null = null
    try { parsed = JSON.parse(text) } catch {
      const m = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (m) { try { parsed = JSON.parse(m[1].trim()) } catch {} }
      if (!parsed) {
        const idx = text.indexOf('{')
        if (idx >= 0) { try { parsed = JSON.parse(text.slice(idx)) } catch {} }
      }
    }

    if (parsed && 'definition' in parsed) {
      return { ...parsed, topic }
    }
    return null
  } catch (error) {
    console.error(`[WebEnricher] generateAtomicCapsuleContent failed for "${topic}":`, error)
    return null
  }
}
