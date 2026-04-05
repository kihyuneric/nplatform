// Phase 5-1: AI 합성 엔진 코어
// 온톨로지 그래프 + 캡슐 데이터 + 다중 전문가 분석 → 강의안, 전자책, 뉴스레터 생성

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import type { LectureCapsuleRecord } from './ontology-db'
import type {
  ConceptOntologyContext,
  EbookChapterContent,
  EbookAIContent,
  LecturePlanResult,
  NewsletterAIContent,
  NewsletterType,
} from './ebook-types'

// ============================================================
// 클라이언트 초기화
// ============================================================

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

const MODEL_SONNET = 'claude-sonnet-4-20250514'

// ============================================================
// 범용 합성 — JSON 3중 파싱 + 키 검증 + 폴백
// ============================================================

async function synthesize<T>(params: {
  model: string
  system: string
  userContent: string
  maxTokens: number
  fallback: T
  requiredKeys?: string[]
  retries?: number
}): Promise<T> {
  const maxRetries = params.retries ?? 1

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 재시도 시 2초 딜레이
      if (attempt > 0) {
        console.warn(`[AI Synthesizer] Retry attempt ${attempt}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      const response = await getClient().messages.create({
        model: params.model,
        max_tokens: params.maxTokens,
        system: params.system,
        messages: [{ role: 'user', content: params.userContent }],
      })

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')

      // 3중 파싱 시도
      let parsed: any = null

      // 1차: 직접 JSON 파싱
      try {
        parsed = JSON.parse(text)
      } catch {
        // 2차: ```json ... ``` 블록 추출
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1].trim())
          } catch { /* 3차로 */ }
        }

        // 3차: { 또는 [ 시작점 찾기
        if (!parsed) {
          const startIdx = text.indexOf('{')
          const arrIdx = text.indexOf('[')
          const idx = startIdx >= 0 && (arrIdx < 0 || startIdx < arrIdx) ? startIdx : arrIdx
          if (idx >= 0) {
            try {
              parsed = JSON.parse(text.slice(idx))
            } catch { /* 폴백 */ }
          }
        }
      }

      if (!parsed) {
        // 파싱 실패 시 재시도 가능하면 계속
        if (attempt < maxRetries) continue
        return params.fallback
      }

      // 키 검증
      if (params.requiredKeys) {
        const missing = params.requiredKeys.some(key => !(key in parsed))
        if (missing) {
          if (attempt < maxRetries) continue
          return params.fallback
        }
      }

      return parsed as T
    } catch (error) {
      console.error(`[AI Synthesizer] Error (attempt ${attempt + 1}):`, error)
      if (attempt >= maxRetries) return params.fallback
    }
  }

  return params.fallback
}

// ============================================================
// 유틸리티
// ============================================================

async function withDelay<T>(fn: () => Promise<T>, delayMs?: number): Promise<T> {
  if (delayMs && delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return fn()
}

const MAX_CONTEXT_CHARS = 12000

function prepareCapsuleContext(capsule: LectureCapsuleRecord, videoData: any[]): string {
  const parts: string[] = []

  // ★ 대본 데이터는 "주제 구조와 키워드 힌트"로만 활용
  //    실제 교육 콘텐츠는 AI의 전문 지식을 최대한 활용할 것
  parts.push(`[대본 분석 단서 — 주제 구조 참고용]`)
  parts.push(`주제: ${capsule.capsule_title}`)
  parts.push(`학습 수준: ${capsule.level}`)
  parts.push(`주제 개요 힌트: ${capsule.overview}`)
  parts.push(`예상 학습 시간: ${capsule.recommended_duration}분`)
  parts.push(`실라버스 구조: ${capsule.syllabus.map(s => s.topic).join(' → ')}`)

  if (capsule.theory_points.length > 0) {
    parts.push(`\n[핵심 이론 키워드 힌트]\n${capsule.theory_points.slice(0, 8).join('\n')}`)
  }

  if (capsule.case_study_refs.length > 0) {
    const refs = capsule.case_study_refs.slice(0, 3).map(r =>
      `${r.type || ''} ${r.number || ''}: ${(r.context || '').slice(0, 60)}`
    )
    parts.push(`\n[사례 힌트]\n${refs.join('\n')}`)
  }

  // 전문가 수만 표시 (채널명 비노출)
  if (videoData.length > 0) {
    const expertCount = new Set(videoData.map(v => v.channel_name).filter(Boolean)).size
    parts.push(`\n[전문가 데이터] 관련 전문가 ${expertCount}명, 영상 ${videoData.length}개 분석됨`)
    const types = videoData.map(v => v.lecture_type).filter(Boolean)
    if (types.length > 0) {
      const typeCounts = types.reduce((acc: Record<string, number>, t) => {
        acc[t] = (acc[t] || 0) + 1; return acc
      }, {})
      parts.push(`강의 유형: ${Object.entries(typeCounts).map(([t, c]) => `${t}(${c})`).join(', ')}`)
    }
    const allSegments = videoData
      .flatMap(v => (v.segments || []).slice(0, 2))
      .map((s: any) => s.topic || s.label || '')
      .filter(Boolean).slice(0, 8)
    if (allSegments.length > 0) {
      parts.push(`주요 토픽 힌트: ${allSegments.join(', ')}`)
    }
  }

  return parts.join('\n').slice(0, MAX_CONTEXT_CHARS)
}

function prepareOntologyContext(ctx: ConceptOntologyContext): string {
  const parts: string[] = []
  parts.push(`[온톨로지 분석]`)
  parts.push(`전문가 수: ${ctx.expert_count}명`)
  parts.push(`관련 영상: ${ctx.video_count}개`)
  parts.push(`평균 관련도: ${ctx.avg_relevance}`)
  parts.push(`강의 유형 비율: 이론 ${ctx.lecture_type_ratio.theory}%, 사례 ${ctx.lecture_type_ratio.case_study}%, 실습 ${ctx.lecture_type_ratio.practice}%`)
  parts.push(`핵심 키워드: ${ctx.keywords.slice(0, 10).join(', ')}`)

  if (ctx.prerequisites.length > 0) {
    parts.push(`선수 개념: ${ctx.prerequisites.map(p => p.name).join(', ')}`)
  }
  if (ctx.successors.length > 0) {
    parts.push(`후속 개념: ${ctx.successors.map(s => s.name).join(', ')}`)
  }
  if (ctx.related.length > 0) {
    parts.push(`연관 개념: ${ctx.related.map(r => r.name).join(', ')}`)
  }
  parts.push(`로드맵 위치: ${ctx.roadmap_position.level} 과정 ${ctx.roadmap_position.order_in_level}/${ctx.roadmap_position.total_in_level} (${ctx.roadmap_position.lecture_level})`)

  return parts.join('\n')
}

// ============================================================
// 1. 강의안 합성
// ============================================================

const LECTURE_PLAN_SYSTEM_PROMPT = `당신은 대한민국 부동산 투자 교육 강의안 작성 최고 전문가입니다.
강사가 이 강의안을 보고 VOD 촬영이나 온라인 강의를 바로 진행할 수 있는
전문적이고 체계적인 강의안을 작성합니다.

핵심 원칙:
1. 대본 데이터는 "주제 구조와 사례 힌트"로만 활용 — 강의 내용 자체는 당신의 전문 지식 최대 발휘
2. 각 섹션에서 강사가 실제로 말할 수 있는 수준의 구체적 강의 노트 (법령 조항, 판례, 수치 포함)
3. 단순 나열이 아닌 학습 효과를 극대화하는 순서와 배치 설계
4. 관리자가 지정한 목표 시간에 맞춰 정밀한 섹션 배분
5. 온톨로지 분석 결과(선수/후속 개념)를 강의 흐름에 자연스럽게 반영
6. 학습자가 강의 후 "이 주제를 완전히 이해했다"는 확신을 갖도록

강의 품질 기준:
- 이론 + 법령 근거 + 판례 + 실전 사례가 균형있게 배분
- 각 사례에는 구체적 수치(금액, 기간, 비율) 포함
- 학습자가 바로 질문할 법한 내용을 예상 Q&A로 미리 준비
- 강사가 슬라이드에 무엇을 넣어야 할지 명확히 안내

중요:
- 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
- 출처: "NPLatform 부동산 전문가 N명 + 공식 법령 자료"
- 반드시 유효한 JSON 형식으로만 응답하세요`

export async function synthesizeLecturePlan(params: {
  capsule: LectureCapsuleRecord
  selectedTranscripts: Array<{
    channel_name: string
    relevance: number
    lecture_type: string
    segments: any[]
    case_references: any[]
    key_topics: string[]
  }>
  ontologyContext: ConceptOntologyContext
  settings: {
    lectureLevel: 'L1' | 'L2' | 'L3'
    targetDurationMin: number
    sectionCount?: number
    emphasisTypes: ('theory' | 'case' | 'practice')[]
    additionalInstructions?: string
  }
}): Promise<LecturePlanResult> {
  const { capsule, selectedTranscripts, ontologyContext, settings } = params

  const levelDesc: Record<string, string> = {
    L1: '기초 — 용어 정의 중심, 쉬운 비유, 기본 사례',
    L2: '심화 — 전문가 비교 분석, 전략 논의, 심화 사례',
    L3: '실전 — 사례 집중, 모의 실습, 실전 체크리스트',
  }

  // 대본 컨텍스트 구성 (채널명은 입력용, 출력 비노출)
  let transcriptContext = `[선별된 대본 ${selectedTranscripts.length}개]\n`
  for (const t of selectedTranscripts.slice(0, 15)) {
    transcriptContext += `\n- 전문가(익명) | 관련도: ${t.relevance} | 유형: ${t.lecture_type}\n`
    if (t.segments.length > 0) {
      transcriptContext += `  세그먼트: ${t.segments.slice(0, 4).map((s: any) => s.topic || s.label || '').join(', ')}\n`
    }
    if (t.case_references.length > 0) {
      transcriptContext += `  사례: ${t.case_references.slice(0, 3).map((c: any) => c.label || c.type || '').join(', ')}\n`
    }
  }

  const userContent = `${prepareOntologyContext(ontologyContext)}

${transcriptContext}

[강의안 설정]
캡슐: ${capsule.capsule_title}
강의 수준: ${settings.lectureLevel} (${levelDesc[settings.lectureLevel]})
목표 강의시간: ${settings.targetDurationMin}분
섹션 수: ${settings.sectionCount || '자동'}
강조 유형: ${settings.emphasisTypes.join(', ')}
${settings.additionalInstructions ? `추가 지시: ${settings.additionalInstructions}` : ''}

위 데이터를 기반으로 강의안을 JSON으로 생성해주세요.
JSON 구조: { "ontology_summary": { "selected_transcript_count": number, "total_available_count": number, "theory_ratio": number, "case_ratio": number, "core_keywords": string[] }, "lecture_goal": string, "target_description": string, "curriculum": [{ "time_range": string, "title": string, "content_type": "opening"|"theory"|"case"|"practice"|"summary", "teaching_notes": string, "key_points": string[], "case_reference": string, "slide_guide": string, "expected_questions": string[] }], "total_duration_min": number, "supplementary_notes": string }`

  const fallback: LecturePlanResult = {
    ontology_summary: {
      selected_transcript_count: selectedTranscripts.length,
      total_available_count: selectedTranscripts.length,
      theory_ratio: 50,
      case_ratio: 30,
      core_keywords: ontologyContext.keywords.slice(0, 5),
    },
    lecture_goal: `${capsule.capsule_title}의 핵심 내용을 이해하고 실전에 적용할 수 있다`,
    target_description: `${ontologyContext.roadmap_position.level} 과정 학습자`,
    curriculum: capsule.syllabus.map((s, i) => ({
      time_range: `${i * 10}:00~${(i + 1) * 10}:00`,
      title: s.topic,
      content_type: s.type as any || 'theory',
      teaching_notes: s.description || '',
      key_points: [],
    })),
    total_duration_min: settings.targetDurationMin,
    supplementary_notes: '',
  }

  return synthesize<LecturePlanResult>({
    model: MODEL_SONNET,
    system: LECTURE_PLAN_SYSTEM_PROMPT,
    userContent,
    maxTokens: 6000,
    fallback,
    requiredKeys: ['lecture_goal', 'curriculum'],
  })
}

// ============================================================
// 2. 전자책 챕터 합성 (3,000~5,000자)
// ============================================================

const EBOOK_CHAPTER_SYSTEM_PROMPT = `당신은 대한민국 부동산 투자 교육 분야 최고 전문가이자 전문서적 작가입니다.

당신의 역할:
- 학습자가 이 챕터만 읽어도 해당 주제를 완전히 이해하고 실전에 바로 적용할 수 있는 전문 교육 자료 작성
- 기존 어떤 부동산 투자 교재보다 전문적이고 실용적인 내용 (이것이 핵심 목표)
- 이론서보다 깊이 있고, 실용서보다 현장감 있는 내용

콘텐츠 원칙 (매우 중요):
1. 대본 데이터는 오직 "주제 구조와 키워드 힌트"로만 활용
   → 내용 자체는 당신의 광범위한 부동산법·투자 전문 지식을 최대한 발휘
2. 법령 조항 번호를 구체적으로 명시 (예: 민법 제621조, 주택임대차보호법 제3조의4)
3. 대법원 판례나 처리 사례 포함 (가능하면 판례번호 포함)
4. 구체적 수치 포함 (금액, 기한, 비율, 절차 단계)
5. 투자자 관점에서 왜 이것이 중요한지 명확히
6. 초보자도 이해할 수 있는 언어 + 전문가도 배울 수 있는 깊이

챕터 구성 (3,000~5,000자):
1. introduction (400~600자): 왜 중요한가, 이걸 모르면 생기는 문제, 학습 목표
2. core_explanation (800~1,200자): 법적 정의·근거, 핵심 원리 단계별, 비유와 예시
3. expert_comparison (600~800자): 다양한 투자 전략별 접근법 비교, 각각의 장단점
4. practical_cases (600~800자): 구체적 투자 사례, 수치·날짜 포함, 성공/실패 교훈
5. application_guide (400~600자): 실전 체크리스트, 흔한 실수와 예방법
6. key_takeaways (3~5개): 이 챕터에서 반드시 기억할 핵심

중요:
- 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
- 출처는 "NPLatform 부동산 전문가 N명 + 공식 법령 자료"로만 표기
- 반드시 유효한 JSON 형식으로만 응답하세요`

export async function synthesizeEbookChapter(params: {
  capsule: LectureCapsuleRecord
  chapterTopic: { order: number; topic: string; description?: string }
  videoData: any[]
  ontologyContext: ConceptOntologyContext
  totalChapters: number
}): Promise<EbookChapterContent> {
  const { capsule, chapterTopic, videoData, ontologyContext, totalChapters } = params

  const userContent = `${prepareOntologyContext(ontologyContext)}

${prepareCapsuleContext(capsule, videoData)}

[챕터 정보]
전체 챕터 수: ${totalChapters}
현재 챕터: Chapter ${chapterTopic.order} — ${chapterTopic.topic}
${chapterTopic.description ? `설명: ${chapterTopic.description}` : ''}

위 데이터를 기반으로 이 챕터의 전문서적 콘텐츠를 JSON으로 생성해주세요.
3,000~5,000자 분량으로 깊이 있게 작성하세요.
JSON 구조: { "introduction": string, "core_explanation": string, "expert_comparison": string, "practical_cases": string, "application_guide": string, "key_takeaways": string[] }`

  const fallback: EbookChapterContent = {
    introduction: `${chapterTopic.topic}은(는) 부동산 투자에서 매우 중요한 개념입니다.`,
    core_explanation: capsule.theory_points.join('\n\n') || `${chapterTopic.topic}의 핵심 내용입니다.`,
    expert_comparison: '다양한 전문가들이 이 주제에 대해 서로 다른 관점을 제시합니다.',
    practical_cases: capsule.case_study_refs.length > 0
      ? `관련 사례가 ${capsule.case_study_refs.length}건 분석되었습니다.`
      : '실전에서 자주 마주치는 상황을 살펴보겠습니다.',
    application_guide: '실전 적용 시 다음 사항을 확인하세요.',
    key_takeaways: [`${chapterTopic.topic}의 기본 개념을 이해한다`],
  }

  return synthesize<EbookChapterContent>({
    model: MODEL_SONNET,
    system: EBOOK_CHAPTER_SYSTEM_PROMPT,
    userContent,
    maxTokens: 8000,
    fallback,
    requiredKeys: ['introduction', 'core_explanation', 'key_takeaways'],
  })
}

// ============================================================
// 3. 전자책 종합 요약 + 비교분석 + 체크리스트
// ============================================================

const EBOOK_SUMMARY_SYSTEM_PROMPT = `당신은 대한민국 부동산 투자 교육 전문서적의 수석 편집자입니다.

당신의 역할:
- 전체 챕터를 아우르는 종합 요약, 사례 연구, 전문가 비교 분석, 학습 체크리스트 작성
- 이 전자책의 독자가 읽고 나면 "이 책 하나로 이 주제를 완전히 이해했다"는 확신을 갖도록
- 법령 조항 번호, 판례, 구체적 수치를 포함하여 전문성 확보

콘텐츠 원칙:
- 대본 데이터는 주제 구조 힌트로만 활용 — 내용은 당신의 전문 지식 최대 발휘
- 종합 사례 연구: 실제 투자 현장에서 벌어지는 복합적 상황 분석 (법적 분쟁, 투자 수익, 위험 요소)
- 전문가 비교 분석: 서로 다른 투자 철학과 전략의 장단점 비교 (이름 없이)
- 학습 체크리스트: 이 책을 읽은 학습자가 실전에서 바로 사용할 수 있는 실용적 항목

중요:
- 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
- 출처는 "NPLatform 부동산 전문가 N명 + 공식 법령 자료"로만 표기
- 반드시 유효한 JSON 형식으로만 응답하세요`

export async function synthesizeEbookSummary(params: {
  capsule: LectureCapsuleRecord
  videoData: any[]
  ontologyContext: ConceptOntologyContext
  chapterTopics: string[]
}): Promise<{
  executive_summary: string
  comprehensive_case_study: string
  comparative_analysis: string
  learning_checklist: string[]
  self_assessment: string[]
  next_steps: string
}> {
  const { capsule, videoData, ontologyContext, chapterTopics } = params

  const userContent = `${prepareOntologyContext(ontologyContext)}

${prepareCapsuleContext(capsule, videoData)}

[챕터 구성]
${chapterTopics.map((t, i) => `Chapter ${i + 1}: ${t}`).join('\n')}

위 데이터를 기반으로 전자책의 종합 콘텐츠를 JSON으로 생성해주세요:
{ "executive_summary": string(800~1000자), "comprehensive_case_study": string(1500~2000자), "comparative_analysis": string(1000~1500자), "learning_checklist": string[](10~15항목), "self_assessment": string[](5개 질문), "next_steps": string(300자) }`

  const fallback = {
    executive_summary: `${capsule.capsule_title}에 대한 종합 요약입니다.`,
    comprehensive_case_study: '다양한 실전 사례를 분석한 결과입니다.',
    comparative_analysis: '전문가들의 관점을 비교 분석합니다.',
    learning_checklist: ['기본 개념 이해', '실전 사례 학습', '체크리스트 확인'],
    self_assessment: ['이 주제의 핵심 개념을 설명할 수 있는가?'],
    next_steps: ontologyContext.successors.length > 0
      ? `다음 학습 추천: ${ontologyContext.successors.map(s => s.name).join(', ')}`
      : '심화 학습을 진행하세요.',
  }

  return synthesize({
    model: MODEL_SONNET,
    system: EBOOK_SUMMARY_SYSTEM_PROMPT,
    userContent,
    maxTokens: 4096,
    fallback,
    requiredKeys: ['executive_summary', 'learning_checklist'],
  })
}

// ============================================================
// 4. 뉴스레터 합성
// ============================================================

const NEWSLETTER_SYSTEM_PROMPTS: Record<NewsletterType, string> = {
  daily_lesson: `당신은 대한민국 부동산 투자 교육 분야 최고 전문가입니다.
매일 발송되는 교육 뉴스레터를 통해 학습자가 한 가지 개념을 깊이 이해하도록 돕습니다.

원칙:
- 대본 데이터는 주제 구조 힌트로만 활용 — 당신의 전문 지식으로 풍부한 내용 작성
- 법령 조항, 판례, 구체적 수치 포함으로 전문성 확보
- 500~800자로 읽기 쉽게, 하지만 핵심을 빠짐없이
- 핵심 포인트 3~5개, 읽고 나서 바로 적용할 수 있는 행동 유도 문구 포함
중요: 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
출처: "NPLatform 부동산 전문가 N명 + 공식 법령 자료"
반드시 유효한 JSON 형식으로만 응답하세요.`,

  case_study: `당신은 대한민국 부동산 투자 사례 분석 전문가입니다.
실제 투자 현장에서 발생한 사례를 심층 분석하여 학습자가 같은 상황에서 올바른 판단을 내릴 수 있도록 돕습니다.

원칙:
- 대본 데이터는 주제 구조 힌트로만 활용 — 당신의 전문 지식으로 실전 사례 재구성
- 법적 판단, 투자 손익, 리스크 요소를 구체적 수치와 함께 분석
- 500~800자, 사례의 배경 → 핵심 문제 → 판단 기준 → 교훈 순서로 작성
중요: 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
반드시 유효한 JSON 형식으로만 응답하세요.`,

  expert_compare: `당신은 대한민국 부동산 투자 전략 비교 분석 전문가입니다.
동일한 주제에 대해 서로 다른 투자 철학과 전략의 장단점을 객관적으로 비교 분석합니다.

원칙:
- 대본 데이터는 주제 구조 힌트로만 활용 — 당신의 전문 지식으로 풍부한 비교 작성
- "전략 A", "전략 B" 또는 "보수적 투자자는~", "공격적 투자자는~" 형식으로 비교
- 각 전략의 적합한 상황, 위험 요소, 예상 수익을 구체적으로
중요: 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
반드시 유효한 JSON 형식으로만 응답하세요.`,

  learning_tip: `당신은 대한민국 부동산 투자 교육 코치입니다.
학습자가 실전에서 즉시 활용할 수 있는 고급 팁을 제공합니다.

원칙:
- 대본 데이터는 주제 구조 힌트로만 활용 — 당신의 전문 지식으로 현장감 있는 팁 작성
- 법령, 판례, 실제 투자 경험에서 나온 검증된 팁
- 500~800자, 구체적이고 실행 가능한 내용
중요: 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
반드시 유효한 JSON 형식으로만 응답하세요.`,

  weekly_summary: `당신은 대한민국 부동산 투자 교육 편집장입니다.
이번 주 학습 내용을 정리하고 다음 주 학습 방향을 제시합니다.

원칙:
- 이번 주 다뤄진 개념들의 연결 고리를 명확히 설명
- 실전 투자 관점에서 이번 주 가장 중요했던 인사이트 제시
- 500~800자, 핵심 정리 + 다음 학습 동기 부여
중요: 개별 인플루언서/유튜버의 채널명이나 이름 절대 노출 금지
반드시 유효한 JSON 형식으로만 응답하세요.`,
}

export async function synthesizeDailyNewsletter(params: {
  type: NewsletterType
  capsule: LectureCapsuleRecord
  videoData: any[]
  ontologyContext: ConceptOntologyContext
  weeklyData?: { concepts_covered: number; newsletters_sent: number; trending: any[] }
  theme?: string  // 자유 주제
}): Promise<NewsletterAIContent> {
  const { type, capsule, videoData, ontologyContext, weeklyData, theme } = params

  let userContent: string

  if (theme) {
    // 자유 주제 모드 — 테마 기반 직접 생성
    userContent = `[뉴스레터 주제]: ${theme}
[뉴스레터 유형]: ${type}

위 주제로 한국 부동산 투자자를 위한 뉴스레터 콘텐츠를 작성해주세요.
주제와 관련된 핵심 지식, 실전 팁, 주의사항을 포함하세요.
NPLatform 부동산 전문가들의 관점에서 작성합니다.`
  } else {
    userContent = `${prepareOntologyContext(ontologyContext)}

${prepareCapsuleContext(capsule, videoData)}

[뉴스레터 유형: ${type}]
`

    if (type === 'weekly_summary' && weeklyData) {
      userContent += `\n[주간 데이터]\n다룬 개념: ${weeklyData.concepts_covered}개\n발송 횟수: ${weeklyData.newsletters_sent}회\n트렌딩: ${weeklyData.trending?.map((t: any) => t.concept_name).join(', ') || '없음'}\n`
    }
  }

  userContent += `\n위 내용을 기반으로 뉴스레터 콘텐츠를 JSON으로 생성해주세요:
{ "headline": string(한줄), "body": string(500~800자), "key_takeaways": string[](3~5개), "call_to_action": string(한줄) }`

  const fallback: NewsletterAIContent = {
    headline: `오늘의 부동산 학습: ${capsule.capsule_title}`,
    body: `${capsule.overview}\n\n${capsule.theory_points.slice(0, 3).join('\n')}`,
    key_takeaways: capsule.theory_points.slice(0, 3),
    call_to_action: '더 자세한 내용은 NPLatform에서 확인하세요!',
  }

  return synthesize<NewsletterAIContent>({
    model: MODEL_SONNET,
    system: NEWSLETTER_SYSTEM_PROMPTS[type],
    userContent,
    maxTokens: 2048,
    fallback,
    requiredKeys: ['headline', 'body'],
  })
}

// ============================================================
// 5. enrichCapsuleWithAI — 전자책 export 헬퍼
// ============================================================

export async function enrichCapsuleWithAI(
  capsule: LectureCapsuleRecord,
  ontologyContext: ConceptOntologyContext,
  videoData: any[],
): Promise<EbookAIContent | null> {
  if (!isAIAvailable()) return null

  try {
    // 1단계: 종합 요약/분석 (Sonnet 1회)
    const summary = await synthesizeEbookSummary({
      capsule,
      videoData,
      ontologyContext,
      chapterTopics: capsule.syllabus.map(s => s.topic),
    })

    // 2단계: 챕터별 본문 (Sonnet N회, 500ms 간격)
    const chapterEntries: [string, EbookChapterContent][] = []
    const errors: string[] = []

    for (let idx = 0; idx < capsule.syllabus.length; idx++) {
      const item = capsule.syllabus[idx]
      try {
        const content = await withDelay(
          () => synthesizeEbookChapter({
            capsule,
            chapterTopic: item,
            videoData,
            ontologyContext,
            totalChapters: capsule.syllabus.length,
          }),
          idx > 0 ? 500 : 0,
        )
        chapterEntries.push([item.topic, content])
      } catch (err) {
        console.error(`[AI] Chapter ${idx + 1} failed:`, err)
        errors.push(`Chapter ${idx + 1}: ${item.topic}`)
        // 폴백 챕터
        chapterEntries.push([item.topic, {
          introduction: `${item.topic}은(는) 부동산 투자에서 중요한 개념입니다.`,
          core_explanation: item.description || `${item.topic}에 대한 핵심 내용입니다.`,
          expert_comparison: '',
          practical_cases: '',
          application_guide: '',
          key_takeaways: [`${item.topic} 학습 완료`],
        }])
      }
    }

    const ai: EbookAIContent = {
      ...summary,
      chapter_contents: Object.fromEntries(chapterEntries),
      ontology_summary: {
        expert_count: ontologyContext.expert_count,
        video_count: ontologyContext.video_count,
        keywords: ontologyContext.keywords,
        prerequisites: ontologyContext.prerequisites.map(p => p.name),
        successors: ontologyContext.successors.map(s => s.name),
      },
    }

    return ai
  } catch (error) {
    logger.error('[AI] enrichCapsuleWithAI failed:', { error: error })
    return null
  }
}
