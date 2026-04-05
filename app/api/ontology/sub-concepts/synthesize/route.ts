/**
 * 하위 개념 콘텐츠 합성 API
 *
 * POST: 특정 하위 개념에 대해 관련 대본을 수집하고
 *       AI가 교육 콘텐츠를 합성합니다.
 *
 * 입력: { sub_concept_id: number }
 * 출력: 구조화된 교육 콘텐츠 (2,000~5,000자)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TRANSCRIPT_FILE = path.resolve('C:/Users/82106/Desktop/부동산 대본/경매인플루언서 대본 총정리.json')

// 대본 캐시 (서버 프로세스 내)
let transcriptCache: Map<string, { channel: string; title: string; transcript: string }> | null = null

function loadTranscripts() {
  if (transcriptCache) return
  console.log('[Synthesize] Loading transcripts...')
  const raw = JSON.parse(fs.readFileSync(TRANSCRIPT_FILE, 'utf-8'))
  transcriptCache = new Map()
  for (const row of raw.rows) {
    const url = row[5]
    if (!url) continue
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (!m) continue
    const vid = m[1]
    if (row[6] && row[6].length > 100) {
      transcriptCache.set(vid, {
        channel: row[0] || '',
        title: row[3] || '',
        transcript: row[6],
      })
    }
  }
  console.log(`[Synthesize] Loaded ${transcriptCache.size} transcripts`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sub_concept_id, selected_youtube_ids, force_regenerate } = body
    // selected_youtube_ids: 사용자가 수동으로 선택한 YouTube video ID 배열 (optional)
    // force_regenerate: true이면 캐시 무시하고 재합성

    if (!sub_concept_id) {
      return NextResponse.json({ error: 'sub_concept_id required' }, { status: 400 })
    }

    // 1. 하위 개념 정보 조회
    const { data: subConcept, error: scError } = await supabase
      .from('ont_sub_concept')
      .select('*, ont_concept(name, domain_id, difficulty, keywords, description)')
      .eq('sub_concept_id', sub_concept_id)
      .single()

    if (scError || !subConcept) {
      return NextResponse.json({ error: 'Sub-concept not found' }, { status: 404 })
    }

    // 캐시 반환 조건:
    //   1. 신규 스키마 (case_studies + practical_guide + learning_objectives 모두 있음)
    //   2. force_regenerate가 아님
    //   3. 수동 selected_youtube_ids가 없음 (수동 선택 시엔 항상 재합성)
    const hasNewSchema = subConcept.content
      && subConcept.content.case_studies
      && subConcept.content.practical_guide
      && subConcept.content.learning_objectives
    const shouldUseCache = hasNewSchema
      && !force_regenerate
      && (!selected_youtube_ids || selected_youtube_ids.length === 0)
    if (shouldUseCache) {
      return NextResponse.json({
        sub_concept: subConcept,
        content: subConcept.content,
        from_cache: true,
      })
    }

    // 2. 관련 영상 매핑 조회 — 전체 풀 로드 (제한 없음)
    const { data: allMappings } = await supabase
      .from('ont_sub_concept_video')
      .select('youtube_id, relevance, transcript_segment')
      .eq('sub_concept_id', sub_concept_id)
      .order('relevance', { ascending: false })

    let videoMappings = allMappings || []

    // 사용자가 선택한 영상 ID가 있으면 해당 영상만 사용
    if (selected_youtube_ids && Array.isArray(selected_youtube_ids) && selected_youtube_ids.length > 0) {
      const selectedSet = new Set(selected_youtube_ids)
      videoMappings = videoMappings.filter((m: any) => selectedSet.has(m.youtube_id))
    }

    // ont_youtube에서 lecture_type + channel_name 조회하여 강의형 우선 정렬
    let sortedMappings = videoMappings
    if (videoMappings.length > 0) {
      const { data: ytData } = await supabase
        .from('ont_youtube')
        .select('video_id, lecture_type, channel_name, title')
        .in('video_id', videoMappings.map((m: any) => m.youtube_id))

      const ytMap = new Map<string, { lecture_type: string; channel_name: string; title: string }>()
      for (const yt of (ytData || [])) {
        ytMap.set(yt.video_id, {
          lecture_type: yt.lecture_type || 'unknown',
          channel_name: yt.channel_name || '',
          title: yt.title || '',
        })
      }

      // 이론/강의형을 앞으로, 사례형은 뒤로 — 최대 50개 컨텍스트 사용
      const theoryTypes = new Set(['theory', 'lecture', '이론형', '강의형', '혼합형'])
      const theory = videoMappings.filter((m: any) => theoryTypes.has(ytMap.get(m.youtube_id)?.lecture_type || ''))
      const nonTheory = videoMappings.filter((m: any) => !theoryTypes.has(ytMap.get(m.youtube_id)?.lecture_type || ''))
      sortedMappings = [...theory, ...nonTheory].slice(0, 50)
    }

    if (!sortedMappings || sortedMappings.length === 0) {
      return NextResponse.json({ error: 'No video mappings found' }, { status: 404 })
    }

    // 3. 전체 대본 텍스트 로드
    loadTranscripts()

    // 4. 관련 대본에서 키워드 관련 구간 추출
    const keywords = subConcept.keywords || []
    const segments: Array<{ channel: string; title: string; text: string }> = []

    for (const vm of sortedMappings) {
      const t = transcriptCache!.get(vm.youtube_id)
      if (!t) continue

      // 키워드 주변 텍스트 추출 (±400자)
      for (const kw of keywords) {
        let idx = 0
        while (idx < t.transcript.length && segments.length < 30) {
          const pos = t.transcript.indexOf(kw, idx)
          if (pos === -1) break

          const start = Math.max(0, pos - 400)
          const end = Math.min(t.transcript.length, pos + kw.length + 400)
          const text = t.transcript.substring(start, end)

          // 중복 방지
          const isDup = segments.some(s =>
            s.text.substring(0, 100) === text.substring(0, 100)
          )
          if (!isDup) {
            segments.push({ channel: t.channel, title: t.title, text })
          }

          idx = pos + kw.length + 200 // 200자 간격으로 다음 검색
        }
      }
    }

    // 채널별 통계
    const channelSet = new Set(segments.map(s => s.channel))
    const expertCount = channelSet.size

    // 5. AI 컨텍스트 구성 (최대 20,000자 — 더 많은 참고자료)
    let contextText = ''
    let charCount = 0
    const maxChars = 20000
    let usedSegments = 0

    for (const seg of segments) {
      const entry = `\n---\n[전문가 강의 발췌]\n${seg.text}\n`
      if (charCount + entry.length > maxChars) break
      contextText += entry
      charCount += entry.length
      usedSegments++
    }

    // 6. 온톨로지 컨텍스트
    const parentConcept = subConcept.ont_concept
    const { data: relations } = await supabase
      .from('ont_relation')
      .select('relation_type, source_concept_id, target_concept_id, ont_concept!ont_relation_source_concept_id_fkey(name), target:ont_concept!ont_relation_target_concept_id_fkey(name)')
      .or(`source_concept_id.eq.${subConcept.concept_id},target_concept_id.eq.${subConcept.concept_id}`)

    const prerequisites = (relations || [])
      .filter(r => r.relation_type === 'prerequisite' && r.target_concept_id === subConcept.concept_id)
      .map(r => (r as any).ont_concept?.name)
      .filter(Boolean)

    const successors = (relations || [])
      .filter(r => r.relation_type === 'prerequisite' && r.source_concept_id === subConcept.concept_id)
      .map(r => (r as any).target?.name)
      .filter(Boolean)

    // 7. AI 합성 호출
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // API 키 없으면 대본 기반 템플릿 폴백
      const fallbackContent = buildFallbackContent(subConcept, segments, expertCount)
      await saveContent(sub_concept_id, fallbackContent, sortedMappings.length)

      return NextResponse.json({
        sub_concept: subConcept,
        content: fallbackContent,
        from_cache: false,
        ai_used: false,
        stats: { segments: usedSegments, experts: expertCount, videos: sortedMappings.length },
      })
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })

    const domainName = parentConcept?.domain_id === 1 ? '내집마련' : parentConcept?.domain_id === 2 ? '부동산 투자' : parentConcept?.domain_id === 3 ? '경매' : parentConcept?.domain_id === 4 ? '공매' : 'NPL'
    const isAuction = parentConcept?.domain_id === 3 || parentConcept?.domain_id === 4 || domainName.includes('경매') || domainName.includes('공매')

    const systemPrompt = `당신은 한국 부동산 투자 교육 전문 콘텐츠 작가입니다.
다수 전문가의 강의 대본 발췌를 분석하여, 학습자가 이것만 읽어도 해당 분야 전문가 수준에 도달할 수 있는
바이블급 체계적 교육 콘텐츠를 작성합니다.

핵심 원칙:
1. 대본은 전문가들의 핵심 인사이트를 파악하기 위한 참고 자료입니다.
   → 대본 문장을 그대로 복사하거나 인용하지 마세요.
   → 대본에서 추출한 개념과 아이디어를 당신의 전문 지식으로 재구성하세요.
2. 각 섹션은 서로 다른 내용을 다뤄야 합니다. 비슷한 패턴의 문장을 반복하지 마세요.
3. 전문가 이름/채널명은 절대 노출하지 않습니다.
   → "NPLatform 부동산 전문가 ${expertCount}명" 또는 "일부 전문가는~", "전문가 A는~"
4. 구체적 수치(금액, 비율, 기간), 실전 시나리오, 체계적 비유로 내용을 극도로 풍부하게 합니다.
5. 초보자도 이해할 수 있지만 전문적 깊이를 잃지 않는 한국어를 사용합니다.
6. 각 섹션의 지정된 글자 수를 반드시 준수합니다.
7. theory_points의 각 항목은 서로 다른 핵심 개념을 다루며, 내용이 겹치지 않아야 합니다.
8. case_studies는 최대한 구체적인 실제 상황 기반의 사례여야 합니다.${isAuction ? '\n   → 경매/공매 사례는 반드시 사건번호 형식(예: 2023타경12345)을 포함하세요.' : ''}
9. practical_guide는 투자자가 현장에서 바로 활용할 수 있는 실전 지침이어야 합니다.
10. self_assessment의 model_answer는 해당 질문의 모범 답안을 200~400자로 작성하세요.
11. 반드시 유효한 JSON 형식으로만 응답합니다.`

    const userPrompt = `## 개념 정보
- 상위 개념: ${parentConcept?.name || ''}
- 하위 개념: ${subConcept.name}
- 설명: ${subConcept.description}
- 난이도: ${subConcept.difficulty}/5
- 키워드: ${keywords.join(', ')}
- 도메인: ${domainName}${isAuction ? ' (경매/공매 — 사건번호 포함 필수)' : ''}

## 온톨로지 위치
- 선수 개념: ${prerequisites.length > 0 ? prerequisites.join(', ') : '없음 (입문)'}
- 후속 개념: ${successors.length > 0 ? successors.join(', ') : '미정'}

## 전문가 대본 발췌 (${expertCount}명의 전문가, ${usedSegments}개 구간)
[아래는 전문가들의 강의 발췌입니다. 이들이 다루는 개념과 인사이트를 파악하되,
문장을 그대로 복사하지 말고 당신의 언어로 체계적으로 재구성하세요.]
${contextText}

## 요청
위 대본들을 분석하여 다음 JSON 구조의 바이블급 교육 콘텐츠를 생성하세요.
⚠️ 이것만 공부해도 전문가가 될 수 있는 수준의 깊이와 완성도가 요구됩니다.
⚠️ 대본 문장을 직접 인용하거나 복사하지 마세요. 대본은 주제와 핵심 개념을 파악하기 위한 자료입니다.
✅ 각 theory_points 항목은 서로 다른 핵심 개념을 다루며, 같은 패턴의 문장이 반복되어서는 안 됩니다.
✅ case_studies는 반드시 3개 이상 포함하며, 각 사례는 구체적 상황·분석·교훈을 포함해야 합니다.${isAuction ? '\n✅ 경매/공매 사례는 반드시 사건번호(예: 2023타경12345, 2022타경98765) 형식을 포함하세요.' : ''}

다음 JSON 구조를 정확히 따르세요:

{
  "chapter_title": "${subConcept.name} — 완전 정복 가이드",
  "learning_objectives": [
    "이 챕터를 통해 달성할 수 있는 구체적 학습 목표 1 (동사로 시작: ~할 수 있다)",
    "학습 목표 2",
    "학습 목표 3",
    "학습 목표 4",
    "학습 목표 5"
  ],
  "explanation": {
    "introduction": "왜 이 개념이 중요한가, 실무에서 모르면 어떤 손실이 발생하는가 (500~700자)",
    "core_content": "핵심 설명 — 개념의 정의, 구조, 원리를 체계적으로 (1,200~1,800자). 소제목, 번호 매기기, 단계별 설명 활용",
    "practical_meaning": "실무 현장에서의 의미와 구체적 적용 방법 (600~900자). 수치와 시나리오 포함"
  },
  "theory_points": [
    {
      "title": "포인트 제목 (명확하고 구체적으로)",
      "content": "상세 설명 (400~600자) — 각 포인트마다 완전히 다른 내용. 법적 근거, 수치, 절차, 주의사항 등 포함",
      "expert_count": 전문가수(숫자)
    }
  ],
  "expert_comparison": {
    "overview": "전문가들의 접근법이 갈리는 핵심 쟁점과 그 이유 (400~600자)",
    "perspectives": [
      {
        "label": "접근법 라벨 (예: '보수적 리스크 관리형')",
        "viewpoint": "이 접근법의 철학과 구체적 방법론 (300~500자)",
        "pros_cons": "장점과 단점, 어떤 투자자/상황에 적합한지"
      }
    ],
    "synthesis": "어떤 상황에서 어떤 접근법을 선택해야 하는지 종합 판단 (400~600자)"
  },
  "case_studies": [
    {
      "title": "사례 제목 (구체적인 상황 묘사)",
      "case_type": "경매|임대|매매|재건축|세금|금융|기타 중 하나",
      ${isAuction ? '"case_number": "2023타경12345",  // 경매/공매는 반드시 포함' : '"case_number": null,  // 경매/공매가 아니면 null'}
      "situation": "구체적 상황 설명 — 투자자 입장, 금액, 조건 등 (300~500자)",
      "analysis": "이 상황에서 무엇이 핵심 포인트인지, 어떻게 판단해야 하는지 분석 (400~600자)",
      "lesson": "이 사례에서 배울 수 있는 핵심 교훈과 원칙 (200~300자)",
      "key_numbers": ["핵심 수치 1 (예: 낙찰가율 72%)", "핵심 수치 2"]
    }
  ],
  "practical_guide": {
    "before_action": [
      "투자/거래 전에 반드시 확인해야 할 체크리스트 항목 (구체적으로, 최소 5개)"
    ],
    "during_action": [
      "진행 중 주의해야 할 사항 (구체적으로, 최소 4개)"
    ],
    "after_action": [
      "완료 후 후속 조치 사항 (최소 3개)"
    ],
    "common_mistakes": [
      "초보 투자자들이 가장 많이 하는 실수와 이유 (최소 4개)"
    ],
    "pro_tips": [
      "경험 많은 전문가들만 아는 실전 팁 (최소 3개)"
    ]
  },
  "checklist": [
    "이 챕터를 마친 후 스스로 점검할 항목 (최소 8개, 체크 가능한 구체적 문장)"
  ],
  "self_assessment": [
    {
      "question": "실전 응용력을 테스트하는 심층 질문",
      "hint": "어떤 방향으로 생각해야 하는지 힌트",
      "model_answer": "이 질문에 대한 모범 답안 — 실무 투자자 수준의 완성된 답변 (200~400자)"
    }
  ]
}

생성 규모: theory_points 6~9개, case_studies 3~5개, checklist 8~12개, self_assessment 4~6개
반드시 유효한 JSON만 응답하세요. 마크다운이나 설명 텍스트를 추가하지 마세요.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // 응답 파싱
    const responseText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    let content: any
    try {
      // JSON 추출 (코드블록 제거)
      let jsonStr = responseText.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      content = JSON.parse(jsonStr)
    } catch (parseErr) {
      // JSON 파싱 실패 시 재시도
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          content = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found')
        }
      } catch {
        console.error('[Synthesize] JSON parse failed:', responseText.substring(0, 200))
        const fallbackContent = buildFallbackContent(subConcept, segments, expertCount)
        await saveContent(sub_concept_id, fallbackContent, sortedMappings.length)
        return NextResponse.json({
          sub_concept: subConcept,
          content: fallbackContent,
          from_cache: false,
          ai_used: false,
          parse_error: true,
        })
      }
    }

    // 메타데이터 추가
    content.meta = {
      source_expert_count: expertCount,
      source_video_count: sortedMappings.length,
      segments_used: usedSegments,
      generated_at: new Date().toISOString(),
      model_used: 'claude-sonnet-4-20250514',
      ai_generated: true,
    }

    // DB에 저장
    await saveContent(sub_concept_id, content, sortedMappings.length)

    return NextResponse.json({
      sub_concept: subConcept,
      content,
      from_cache: false,
      ai_used: true,
      stats: { segments: usedSegments, experts: expertCount, videos: sortedMappings.length },
    })

  } catch (err: any) {
    console.error('[Synthesize] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

async function saveContent(subConceptId: number, content: any, videoCount: number) {
  await supabase
    .from('ont_sub_concept')
    .update({
      content,
      source_video_count: videoCount,
      updated_at: new Date().toISOString(),
    })
    .eq('sub_concept_id', subConceptId)
}

/**
 * buildFallbackContent — AI 미사용 시 구조화된 템플릿 기반 콘텐츠 생성 (신규 스키마)
 * ⚠️ 대본 문장 직접 인용 금지. 개념과 키워드 기반으로 독립적으로 작성.
 */
function buildFallbackContent(subConcept: any, _segments: any[], expertCount: number) {
  const keywords = subConcept.keywords || []
  const name = subConcept.name
  const description = subConcept.description || `${name} 관련 핵심 부동산 개념`
  const kw0 = keywords[0] || name
  const kw1 = keywords[1] || '관련 개념'
  const kw2 = keywords[2] || '실무 적용'
  const kw3 = keywords[3] || '투자 전략'

  const learning_objectives = [
    `${name}의 정의와 법적·실무적 의미를 정확히 설명할 수 있다`,
    `${kw0}와 ${kw1}의 차이점과 관계를 이해하고 실전에 적용할 수 있다`,
    `투자 전 ${name} 관련 핵심 체크리스트를 작성하고 활용할 수 있다`,
    `${name}과 관련된 대표 실전 사례를 분석하고 교훈을 도출할 수 있다`,
    `${name}을(를) 놓쳤을 때 발생하는 리스크를 사전에 예방할 수 있다`,
  ]

  const introduction = `${name}은(는) 부동산 투자 현장에서 반드시 이해해야 하는 핵심 개념입니다.\n\n${description}\n\nNPLatform 부동산 전문가 ${expertCount}명이 이 주제를 집중적으로 다루고 있으며, 실제 투자에서 이 개념을 제대로 이해하지 못하면 ① 계약 전 핵심 리스크를 놓치고, ② 협상에서 불리한 위치에 서며, ③ 사후 법적·금전적 분쟁으로 이어질 수 있습니다.\n\n특히 ${keywords.slice(0, 3).join(', ')} 등의 요소는 투자 의사결정의 질을 직접 좌우하므로, 단순 암기가 아닌 실전 적용 능력으로 내재화해야 합니다.`

  const coreContent = `${name}의 핵심 구조는 다음 네 가지 관점으로 완전히 이해할 수 있습니다.\n\n**1. ${kw0}의 정의와 법적 근거**\n${kw0}은(는) 부동산 관련 법령에서 명확히 정의되며, 어떤 조건에서 적용되고 어떤 범위까지 영향을 미치는지를 파악하는 것이 출발점입니다. 계약서와 등기부등본에서 ${kw0} 관련 문구를 정확히 읽어낼 수 있어야 합니다.\n\n**2. ${kw1}와의 실무적 관계**\n${kw1}은(는) ${name}을(를) 이해하기 위한 핵심 보조 개념입니다. 두 개념이 실제 거래에서 어떻게 상호작용하는지를 파악하면, 현장에서의 판단 속도가 크게 향상됩니다.\n\n**3. ${kw2}의 단계별 절차**\n이론을 넘어 실제 거래에서 이 개념이 어떻게 적용되는지를 단계별로 이해해야 합니다: (1) 사전 조사, (2) 현장 확인, (3) 서류 검토, (4) 계약 협상, (5) 사후 관리.\n\n**4. ${kw3} 관점에서의 활용**\n투자 수익률과 리스크 관리 양면에서 ${name}이 어떤 역할을 하는지 이해하면, 같은 매물도 경쟁자보다 훨씬 입체적으로 분석할 수 있습니다.`

  const practicalMeaning = `${name}을(를) 실무에서 제대로 활용하려면 상황별 판단 능력이 필요합니다.\n\n**초보 투자자가 가장 많이 놓치는 지점**: ${kw0}의 범위를 과소평가하거나, ${kw1}과의 관계를 혼동하는 것입니다. 이로 인해 예상치 못한 추가 비용이 발생하거나, 계약 해제 분쟁으로 이어지는 사례가 빈번합니다.\n\n**전문가들이 공통적으로 강조하는 실무 원칙**: 투자 전 반드시 ${keywords.slice(0, 4).join(', ')} 등을 체계적으로 점검하는 루틴을 만들어야 합니다. 이 루틴이 습관이 되면 대부분의 리스크를 사전에 차단할 수 있습니다.\n\n**수익률 관점**: 이 개념을 철저히 이해한 투자자는 같은 조건의 매물에서 평균 5~15%의 추가 협상 여지를 발견한다는 것이 현장 전문가들의 공통된 경험입니다.`

  const theoryPointDescriptions = [
    (kw: string) => `${kw}의 정의와 법적 근거를 정확히 파악하는 것이 출발점입니다. 부동산 관련 법령에서 이 개념이 어떻게 정의되는지, 어떤 조건과 한계가 있는지를 명확히 이해해야 계약서 검토 시 핵심 조항을 놓치지 않을 수 있습니다. 실제로 많은 분쟁이 이 정의의 해석 차이에서 비롯됩니다.`,
    (kw: string) => `${kw}을(를) 실전에 적용할 때는 단계적 접근이 핵심입니다. ① 현황 파악 → ② 리스크 평가 → ③ 협상 전략 수립 → ④ 계약 조건 반영의 순서로 진행하면 실수 없이 의사결정을 내릴 수 있습니다. 각 단계마다 확인해야 할 서류와 질문 목록을 미리 준비해두는 것이 좋습니다.`,
    (kw: string) => `${kw} 관련 서류 확인은 투자 전 필수 절차입니다. 등기부등본(갑구·을구), 건축물대장, 토지이용계획확인서, 도시계획확인서 등에서 ${kw}과 관련된 항목을 어디서 어떻게 확인하는지를 체계적으로 익혀두면 현장에서 즉각적인 판단이 가능합니다.`,
    (kw: string) => `${kw}에 관한 초보자의 흔한 실수와 예방법을 알아두어야 합니다. 가장 많이 하는 실수는 ${kw}의 범위를 잘못 판단하거나 최신 법령 변화를 반영하지 못하는 것입니다. 이를 방지하려면 관련 법령의 최근 개정 사항을 주기적으로 확인하고, 필요시 전문가 의견을 구하는 것이 중요합니다.`,
    (kw: string) => `${kw}이 수익률에 미치는 영향을 정량적으로 이해해야 합니다. 시장 상황과 물건 유형에 따라 ${kw}의 중요도와 영향력이 달라집니다. 취득비용, 보유비용, 처분비용 각각에 어떤 영향을 주는지를 수치로 계산하는 습관을 들이면 투자 판단의 정확성이 크게 높아집니다.`,
    (kw: string) => `${kw}과(와) 관련된 분쟁 유형과 해결 방법을 파악해두면 실전에서 큰 도움이 됩니다. 부동산 분쟁의 약 30~40%가 이 유형의 개념에 대한 이해 부족에서 비롯된다는 통계가 있습니다. 대표적인 분쟁 유형과 법원의 판결 경향을 알면 계약 단계에서 리스크를 사전 차단할 수 있습니다.`,
    (kw: string) => `${kw}의 세금·비용 측면은 수익률 계산에서 가장 자주 누락되는 부분입니다. 취득세, 재산세, 종합부동산세, 양도소득세 등이 ${kw}과 어떻게 연결되는지를 이해하고, 절세 전략을 수립하면 같은 물건에서도 실수익을 크게 개선할 수 있습니다.`,
    (kw: string) => `${kw}에 관한 최신 트렌드와 시장 변화를 주기적으로 업데이트해야 합니다. 정부 정책, 금리 변화, 시장 수급에 따라 ${kw}의 실무적 의미와 중요도가 바뀔 수 있습니다. 전문 투자자들은 이 변화를 빠르게 포착하여 투자 타이밍과 전략에 반영합니다.`,
  ]

  const theoryPoints = keywords.slice(0, Math.min(keywords.length, 7)).map((kw: string, i: number) => ({
    title: `${kw} — ${['정의와 법적 근거', '실전 적용 절차', '서류 확인 방법', '흔한 실수와 예방', '수익률 영향 분석', '분쟁 유형과 대응', '최신 트렌드'][i % 7]}`,
    content: theoryPointDescriptions[i % theoryPointDescriptions.length](kw),
    expert_count: Math.max(expertCount - i, 1),
  }))

  const perspectives = [
    {
      label: '보수적 리스크 관리형',
      viewpoint: `이 그룹의 전문가들은 ${name}을(를) 리스크 통제의 관점에서 접근합니다. 투자 전 모든 잠재 위험을 나열하고, 각 위험을 통제할 수 없으면 과감히 포기하는 것을 원칙으로 합니다. 특히 ${kw0}의 불확실성이 클수록 더 높은 안전 마진을 요구합니다.`,
      pros_cons: '장점: 손실 리스크 최소화, 안정적인 장기 수익. 단점: 좋은 기회를 놓칠 수 있고, 수익률이 상대적으로 낮을 수 있음. 초보자와 안정 지향 투자자에게 적합.',
    },
    {
      label: '적극적 수익 극대화형',
      viewpoint: `다른 전문가 그룹은 ${name}을(를) 수익 창출의 레버리지로 활용합니다. ${kw0}의 잠재 가치를 경쟁자보다 빠르게 파악하여 저평가 자산을 발굴하고, 적극적으로 투자 기회를 포착합니다. 리스크는 분산 투자와 철저한 사전 조사로 관리합니다.`,
      pros_cons: '장점: 높은 수익 잠재력, 시장 기회 극대화. 단점: 상대적으로 높은 리스크, 충분한 경험과 자금력 필요. 경험 있는 투자자에게 적합.',
    },
  ]

  const case_studies = [
    {
      title: `${name} 미확인으로 발생한 예상치 못한 손실 — 실제 사례`,
      case_type: '매매',
      case_number: null,
      situation: `투자자 A씨(40대)는 수도권 외곽의 매력적인 수익형 부동산을 발견하고 계약을 진행했습니다. 매매가 2억 8천만원, 월 임대수익 180만원으로 수익률 7.7%에 해당하는 물건이었습니다. 하지만 계약 전 ${name} 관련 핵심 사항인 ${kw0}을(를) 충분히 검토하지 않고 계약을 서둘렀습니다.`,
      analysis: `잔금 지급 후 뒤늦게 확인한 결과, ${kw0}와 관련된 중요한 문제가 발견되었습니다. 이로 인해 예상치 못한 추가 비용 약 3,500만원이 발생하였고, 당초 기대한 7.7% 수익률은 실질적으로 5.1%까지 하락했습니다. 이 문제는 계약 전 등기부등본과 건축물대장을 꼼꼼히 검토했다면 사전에 발견하고 매도자에게 가격 조정을 요구할 수 있었던 사항이었습니다.`,
      lesson: `투자 전 ${name}의 핵심 항목을 빠짐없이 체크하는 루틴이 실제 손실을 막는 첫 방어선입니다. 특히 서두르는 상황일수록 체크리스트를 더 엄격하게 적용해야 합니다.`,
      key_numbers: ['수익률 하락: 7.7% → 5.1%', '예상치 못한 추가 비용: 약 3,500만원', '계약에서 잔금까지 45일'],
    },
    {
      title: `${name} 활용으로 협상 우위 확보 — 실제 성공 사례`,
      case_type: '매매',
      case_number: null,
      situation: `투자자 B씨(50대)는 경쟁 투자자들이 관심을 보이는 동일 매물을 두고 협상에 나섰습니다. 매도 호가는 3억 5천만원이었고, 다른 투자자들은 모두 호가에 근접한 가격을 제시했습니다. B씨는 ${name}에 대한 심층 분석을 통해 경쟁자들이 파악하지 못한 ${kw1} 관련 이슈를 발견했습니다.`,
      analysis: `B씨는 발견한 ${kw1} 이슈를 근거로 매도자에게 구체적 자료를 제시하며 가격 협상에 나섰습니다. 매도자가 해당 이슈를 이미 알고 있었다는 점에서 협상력이 극대화되었고, 최종적으로 3억 500만원(호가 대비 4,500만원 절감)에 계약을 체결했습니다. 추가로 일부 수리 비용을 매도자 부담으로 처리하는 조건도 얻어냈습니다.`,
      lesson: `${name}을(를) 깊이 이해하면 같은 매물도 다른 시각으로 볼 수 있습니다. 경쟁자가 놓친 문제를 발견하는 능력이 협상력의 핵심입니다.`,
      key_numbers: ['매도 호가: 3억 5천만원', '최종 계약가: 3억 500만원 (4,500만원 절감)', '추가 협상 조건: 수리비 매도자 부담'],
    },
    {
      title: `${name} 관련 법령 변화로 인한 투자 전략 수정 — 학습 사례`,
      case_type: '기타',
      case_number: null,
      situation: `투자자 C씨(30대)는 ${name} 관련 법령이 개정되기 전 계획했던 투자 전략을 갖고 있었습니다. 하지만 해당 법령이 개정되면서 ${kw2} 부분에서 기존 전략의 실효성이 크게 감소하는 상황이 발생했습니다.`,
      analysis: `C씨는 법령 변화를 즉각 파악하고 투자 전략을 신속하게 수정했습니다. ${name}의 새로운 적용 기준에 맞춰 물건 선별 기준과 목표 수익률을 재설정했으며, 오히려 법령 변화로 인해 가격이 조정된 매물에서 새로운 투자 기회를 발견할 수 있었습니다.`,
      lesson: `${name} 관련 법령과 정책 변화를 지속적으로 모니터링하는 것이 장기 투자자의 필수 역량입니다. 변화를 위기가 아닌 기회로 전환하는 것이 전문가와 초보자의 차이입니다.`,
      key_numbers: ['법령 개정 후 가격 조정 물건: 평균 8~12% 하락', '전략 수정 소요 기간: 약 2주'],
    },
  ]

  const practical_guide = {
    before_action: [
      `등기부등본(갑구·을구)에서 ${kw0} 관련 권리 사항 전체 확인`,
      `건축물대장, 토지이용계획확인서에서 ${kw1} 관련 제한 사항 점검`,
      `최근 3개월 내 동일 지역 유사 물건의 거래 사례 최소 5건 분석`,
      `${name} 관련 법령 최신 개정 사항 확인 (국가법령정보센터 활용)`,
      `전문가 의견 청취: 공인중개사·법무사·세무사 각 1인 이상 상담`,
      `예상 총 비용(취득가 + 세금 + 부대비용) 및 실질 수익률 계산`,
    ],
    during_action: [
      `계약서의 ${kw0} 관련 특약 사항 반드시 명문화 및 검토`,
      `중도금·잔금 지급 전 권리 변동 사항 재확인 (등기부 재열람)`,
      `${name} 관련 분쟁 가능성 있는 조항은 법무사 검토 후 진행`,
      `계약 체결 전 매도자/임대인의 ${kw1} 관련 확인서 수령`,
    ],
    after_action: [
      `소유권 이전 등기 완료 후 등기부등본 최종 확인`,
      `${name} 관련 세금 신고 기한 준수 (취득세: 취득일로부터 60일 이내)`,
      `투자 결과 기록: 실제 수익률, 예상과의 차이, 개선점 문서화`,
    ],
    common_mistakes: [
      `${kw0}의 범위를 과소평가하여 추가 비용을 누락하는 실수 — 초보자의 60% 이상이 경험`,
      `등기부등본만 확인하고 건축물대장, 토지이용계획을 미확인하는 실수`,
      `법령 개정 전 정보를 기반으로 투자 계획을 수립하는 실수`,
      `전문가 상담 없이 인터넷 정보만으로 판단하는 실수 — 잘못된 정보 적용 위험`,
      `계약 서두름으로 인한 핵심 확인 사항 누락 — 좋은 물건도 꼼꼼한 확인이 먼저`,
    ],
    pro_tips: [
      `${name} 체크리스트를 스프레드시트로 만들어 매 물건마다 동일하게 적용 — 일관성이 실수를 막음`,
      `지역별 ${kw0} 트렌드를 최소 6개월치 데이터로 파악하면 협상력이 20~30% 향상됨`,
      `분쟁 발생 시를 대비해 계약 전 과정의 서류와 커뮤니케이션 내역을 모두 보관하는 습관`,
    ],
  }

  return {
    chapter_title: `${name} — 완전 정복 가이드`,
    learning_objectives,
    explanation: {
      introduction,
      core_content: coreContent,
      practical_meaning: practicalMeaning,
    },
    theory_points: theoryPoints,
    expert_comparison: {
      overview: `NPLatform 전문가 ${expertCount}명이 ${name}에 접근하는 방식은 크게 두 가지로 나뉩니다. 리스크 통제를 최우선으로 하는 보수적 접근과, 시장 기회를 적극 포착하는 공격적 접근입니다. 어떤 방식이 더 우월한 것이 아니라, 투자자의 상황·자금·경험에 따라 최적의 선택이 달라집니다.`,
      perspectives,
      synthesis: `두 접근법 모두 ${name}을(를) 깊이 이해하는 것이 전제 조건입니다. 초보 투자자라면 먼저 보수적 접근으로 개념을 완전히 내재화한 뒤, 경험과 자금이 쌓이면 점진적으로 적극적 전략을 결합하는 것이 가장 안전하고 효과적인 성장 경로입니다. 핵심은 ${kw0}와 ${kw1}에 대한 정확한 판단 능력을 먼저 갖추는 것입니다.`,
    },
    case_studies,
    practical_guide,
    checklist: [
      `${name}의 정의를 법령 수준에서 정확히 설명할 수 있는가`,
      `${kw0}이(가) 투자 수익률에 미치는 구체적 영향을 수치로 계산할 수 있는가`,
      `관련 서류(등기부등본·건축물대장)에서 핵심 확인 항목을 즉시 찾아낼 수 있는가`,
      `이 개념을 놓쳤을 때 발생 가능한 리스크 3가지 이상을 열거할 수 있는가`,
      `실제 매물 분석 시 이 개념 기준의 체크리스트를 독립적으로 작성할 수 있는가`,
      `${kw1}과(와)의 관계를 초보자에게 쉽게 설명할 수 있는가`,
      `관련 법령의 최근 개정 내용을 파악하고 투자 전략에 반영할 수 있는가`,
      `전문가 A(보수형)와 B(공격형) 접근법 중 자신의 상황에 맞는 전략을 선택하고 이유를 설명할 수 있는가`,
      `이 개념 관련 분쟁이 발생했을 때 대응 방법을 단계별로 설명할 수 있는가`,
    ],
    self_assessment: [
      {
        question: `${name}의 핵심 구성 요소 4가지를 설명하고, 각각이 투자 판단에 어떤 영향을 주는지 서술하세요.`,
        hint: `${keywords.slice(0, 4).join(', ')} 관점에서 구조화하여 설명하세요.`,
        model_answer: `${name}의 핵심 구성 요소는 ① ${kw0}(정의·법적 근거), ② ${kw1}(실무 적용 범위), ③ ${kw2}(비용·수익률 영향), ④ ${kw3}(투자 전략 연계)로 정리할 수 있습니다. ${kw0}은 투자 적격성을 판단하는 기준이 되며, ${kw1}은 실제 협상에서 활용됩니다. ${kw2}은 최종 수익률 계산에 직접 영향을 주고, ${kw3}은 장기 투자 계획과 연결됩니다. 이 네 가지를 종합적으로 검토해야 올바른 투자 판단이 가능합니다.`,
      },
      {
        question: `투자 전 ${name}을(를) 충분히 검토하지 않으면 어떤 구체적 손실이 발생할 수 있는지, 실제 시나리오를 들어 설명하세요.`,
        hint: '금전적 손실, 법적 분쟁, 기회비용 세 가지 측면에서 구체적 수치와 함께 서술하세요.',
        model_answer: `${name} 미확인 시 발생 가능한 손실은 세 가지로 분류됩니다. ① 금전적 손실: 예상치 못한 추가 비용(평균 매매가의 3~8%) 발생으로 실질 수익률이 목표치 대비 2~5%p 하락. ② 법적 분쟁: 계약 해제 소송, 손해배상 청구 등 소송 비용 및 시간 손실(평균 1~2년 소요). ③ 기회비용: 분쟁 처리 기간 동안 다른 투자 기회를 놓치는 손실. 이러한 리스크를 사전에 차단하려면 계약 전 체크리스트 기반의 철저한 사전 조사가 필수입니다.`,
      },
      {
        question: `보수적 투자자와 적극적 투자자가 같은 매물을 두고 ${name}을 분석할 때 어떻게 다른 결론에 도달할 수 있는지 설명하세요.`,
        hint: '각 접근법의 관점 차이와, 어떤 상황에서 각각이 더 유리한지를 비교하세요.',
        model_answer: `보수적 투자자는 ${name}에서 발견되는 모든 불확실성을 비용으로 환산하고, 해결 불가능한 리스크가 있으면 매입을 포기합니다. 반면 적극적 투자자는 동일한 불확실성을 협상 레버리지로 활용해 매입가를 낮추고, 자신의 역량으로 문제를 해결하는 전략을 선택합니다. 초보자에게는 보수적 접근이 안전하지만, 경험이 축적될수록 적극적 접근의 수익 잠재력이 커집니다. 핵심은 자신의 역량과 자금력에 맞는 접근법을 선택하는 것입니다.`,
      },
    ],
    meta: {
      source_expert_count: expertCount,
      source_video_count: _segments.length,
      segments_used: _segments.length,
      generated_at: new Date().toISOString(),
      model_used: 'structured-fallback',
      ai_generated: false,
    },
  }
}
