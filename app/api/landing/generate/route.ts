import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt, buildUserPrompt } from '@/lib/landing-generator/prompts'
import type { GenerateRequest, GeneratedStory } from '@/lib/landing-generator/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json()
    const { topic, targetAudience, tone } = body

    if (!topic) {
      return NextResponse.json({ error: '주제를 입력해주세요' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // API 키 없으면 mock 데이터 반환
      return NextResponse.json({ story: getMockStory(topic) })
    }

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(topic, targetAudience, tone),
        },
      ],
      system: buildSystemPrompt(),
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('AI 응답에 텍스트가 없습니다')
    }

    // JSON 파싱 (코드블록 제거)
    let jsonStr = textContent.text.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const story: GeneratedStory = JSON.parse(jsonStr)

    return NextResponse.json({ story })
  } catch (error: unknown) {
    console.error('Generate error:', error)
    const message = error instanceof Error ? error.message : '스토리 생성 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** API 키 없을 때 사용할 Mock 데이터 */
function getMockStory(topic: string): GeneratedStory {
  return {
    meta: {
      title: `${topic} - 실전 완벽 마스터 과정`,
      description: `${topic}의 A부터 Z까지. 현직 전문가가 알려주는 실전 노하우를 배워보세요.`,
      keywords: [topic, '부동산', '투자', '교육', '실전'],
      imageKeywords: [
        'modern building architecture',
        'person stressed finance',
        'real estate investment success',
        'classroom education seminar',
        'professional businessman portrait',
        'city skyline buildings',
      ],
    },
    hero: {
      headline: `월급쟁이도 할 수 있는\n${topic} 완벽 가이드`,
      subheadline:
        '현직 10년차 전문가가 공개하는 실전 노하우. 이론이 아닌 진짜 돈 버는 방법을 알려드립니다.',
      ctaText: '무료 체험 신청하기',
    },
    painPoints: {
      title: '혹시 이런 고민을 하고 계신가요?',
      items: [
        {
          icon: '😰',
          title: '월급만으로는 불안한 미래',
          description:
            '물가는 오르고 월급은 그대로... 은퇴 후 삶이 막막하게 느껴지시나요?',
        },
        {
          icon: '🤔',
          title: '어디서부터 시작해야 할지 모르겠다',
          description:
            '유튜브, 블로그 정보는 넘쳐나는데 뭐가 맞는 건지 판단이 안 되시나요?',
        },
        {
          icon: '😱',
          title: '실패가 두려워 시작을 못한다',
          description:
            '큰 돈이 오가는 부동산, 잘못된 선택 한 번이면 큰 손실이 날까 봐 두려우시죠?',
        },
      ],
    },
    solution: {
      title: `${topic}이 답입니다`,
      subtitle: '검증된 시스템으로 안전하게 시작하세요',
      features: [
        {
          icon: '🎯',
          title: '실전 중심 커리큘럼',
          description:
            '이론 20% + 실전 80%. 실제 사례 분석을 통해 바로 적용 가능한 역량을 키웁니다.',
        },
        {
          icon: '👨‍🏫',
          title: '1:1 맞춤 코칭',
          description:
            '수강생 개인 상황에 맞는 맞춤형 전략을 제시합니다. 혼자 고민하지 마세요.',
        },
        {
          icon: '📊',
          title: '독자 분석 도구 제공',
          description:
            '수강생 전용 분석 툴킷을 제공하여 스스로 물건을 분석할 수 있는 능력을 갖추게 합니다.',
        },
        {
          icon: '🤝',
          title: '수료 후에도 계속되는 네트워크',
          description:
            '500명+ 동문 네트워크에서 정보 공유, 공동 투자 기회를 얻으세요.',
        },
      ],
    },
    curriculum: {
      title: '4주 완성 커리큘럼',
      steps: [
        {
          step: 1,
          title: '기초 이론 & 마인드셋',
          description: '성공하는 투자자의 사고방식과 핵심 용어, 시장 구조를 이해합니다.',
          duration: '1주차',
        },
        {
          step: 2,
          title: '실전 분석 방법론',
          description:
            '실제 물건을 분석하는 체크리스트와 수익률 계산법을 실습합니다.',
          duration: '2주차',
        },
        {
          step: 3,
          title: '계약 & 법률 실무',
          description:
            '계약서 작성, 등기, 세금까지. 실무에서 꼭 알아야 할 법률 지식을 배웁니다.',
          duration: '3주차',
        },
        {
          step: 4,
          title: '포트폴리오 구축 & 출구전략',
          description:
            '장기적으로 자산을 불려나가는 전략과 리스크 관리법을 완성합니다.',
          duration: '4주차',
        },
      ],
    },
    testimonials: {
      title: '수강생들의 진짜 후기',
      items: [
        {
          name: '김서진',
          role: 'IT기업 과장 (38세)',
          content:
            '회사 다니면서 부업으로 시작했는데, 6개월 만에 첫 수익을 냈습니다. 체계적인 커리큘럼 덕분에 혼자서는 절대 못 했을 분석을 할 수 있게 됐어요.',
          rating: 5,
        },
        {
          name: '박준혁',
          role: '자영업자 (45세)',
          content:
            '유튜브로 독학하다 2번 실패했었는데, 이 과정 듣고 나서 접근 방식 자체가 달라졌어요. 1:1 코칭이 정말 큰 도움이 됩니다.',
          rating: 5,
        },
        {
          name: '이수연',
          role: '주부 (42세)',
          content:
            '남편 몰래 시작했다가 지금은 부부가 함께 투자하고 있어요. 초보자도 이해하기 쉽게 설명해주셔서 정말 감사합니다.',
          rating: 5,
        },
      ],
    },
    instructor: {
      name: '최민수',
      title: '부동산 투자 전문 컨설턴트',
      bio: '15년간 부동산 투자 시장에서 활동하며 1,000건 이상의 거래를 분석했습니다. 현재 3개 법인을 운영하며 후배 투자자 양성에 힘쓰고 있습니다.',
      credentials: [
        '부동산 투자 경력 15년',
        '누적 수강생 3,000명+',
        '자산관리사 / 공인중개사 보유',
        'KBS, MBC 부동산 전문가 패널 출연',
      ],
    },
    pricing: {
      title: '지금 신청하면 특별 할인',
      originalPrice: '990,000원',
      salePrice: '490,000원',
      discount: '50% OFF',
      benefits: [
        '4주 정규 과정 전체 수강',
        '1:1 개인 코칭 2회 포함',
        '전용 분석 툴킷 제공',
        '수료 후 동문 네트워크 가입',
        '평생 무료 복습 영상 제공',
      ],
      deadline: '🔥 이번 기수 마감까지 3일 남았습니다',
    },
    faq: {
      title: '자주 묻는 질문',
      items: [
        {
          question: '완전 초보자도 수강할 수 있나요?',
          answer:
            '네, 물론입니다. 이 과정은 부동산 지식이 전혀 없는 분들도 이해할 수 있도록 기초부터 차근차근 설명합니다.',
        },
        {
          question: '직장인인데 시간이 될까요?',
          answer:
            '모든 강의는 녹화본으로도 제공됩니다. 평일 저녁이나 주말에 자유롭게 수강하실 수 있습니다.',
        },
        {
          question: '환불 규정이 어떻게 되나요?',
          answer:
            '수강 시작 7일 이내 100% 환불 보장합니다. 만족하지 못하시면 전액 환불해 드립니다.',
        },
        {
          question: '수강 기간이 지나면 복습할 수 없나요?',
          answer:
            '수강 기간 이후에도 녹화 영상은 평생 무료로 시청 가능합니다.',
        },
        {
          question: '투자금이 얼마나 있어야 시작할 수 있나요?',
          answer:
            '소액으로 시작할 수 있는 방법부터 알려드립니다. 최소 자본금에 대한 기준은 과정 내에서 상세히 안내합니다.',
        },
      ],
    },
    finalCta: {
      headline: '더 이상 고민만 하지 마세요',
      subheadline:
        '이미 3,000명이 이 과정으로 새로운 수익을 만들고 있습니다. 다음은 당신의 차례입니다.',
      ctaText: '지금 바로 신청하기',
      urgencyText: '⏰ 이번 기수 잔여석 7자리',
    },
  }
}
