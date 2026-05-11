/**
 * POST /api/v1/analysis/collateral
 *
 * Claude AI 기반 부동산 담보 가치 분석 (SSE 스트리밍)
 *
 * Body: { address: string, assetTitle?: string }
 * Response: text/event-stream  →  data: { text: string }\n\n  →  data: [DONE]\n\n
 *
 * ⚠ 주소는 AI 분석에만 사용되고 응답 본문에 절대 노출되지 않음.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `당신은 대한민국 NPL(부실채권) 투자 전문 부동산 담보 가치 분석가입니다.
투자자와 LP에게 해당 부동산이 담보물로서 갖는 가치와 리스크를 전문적으로 분석합니다.

**필수 규칙**:
- 부동산 주소(번지, 지번 등 구체적 주소)는 절대 노출하지 마세요
- 행정구역(시·구·동 수준)만 위치 참조로 사용하세요
- 전문적이고 간결하게 작성하세요
- 실제 NPL 투자 관점(환가성·담보 안정성·개발잠재력)에서 분석하세요
- 한국어로 작성하세요`

function buildUserPrompt(address: string, assetTitle?: string): string {
  return `다음 부동산의 담보 가치를 NPL 투자 관점에서 분석해주세요.

분석 대상: ${address}${assetTitle ? `\n자산명: ${assetTitle}` : ''}

아래 구조로 분석해주세요. 주소는 절대 출력하지 마세요.

## 입지 특성 분석
- 위치적 가치 (행정구역명만 사용, 주소 노출 금지)
- 접근성 및 교통 인프라
- 주변 환경 및 생활 인프라
- 인근 주요 거점·랜드마크

## 개발 잠재력 및 규제 현황
- 용도지역·지구 현황 및 개발 가능성
- 규제 완화·도시계획 동향
- 개발 가능 방향 (1~3가지)

## 시장 포지셔닝 및 시세 흐름
- 해당 권역 유사 자산과의 비교 포지셔닝
- 주요 수요층 및 매수 주체
- 최근 가격 동향 (상승·보합·하락 여부)

## 담보로서의 핵심 가치 요인
- 환금성 (유동성·처분 용이성)
- 담보 안정성 (가치 하방 경직성)
- 특이 프리미엄 요인 (있을 경우)

## 주요 리스크 요인
- 리스크 항목 3~5가지 (핵심만)

## 종합 평가

| 항목 | 평가 |
|------|------|
| 입지 희소성 | |
| 환금성 | |
| 담보 안정성 | |
| 개발 잠재력 | |
| 단기 유동성 | |
| 장기 자산가치 | |

**한 줄 결론**: 이 자산의 담보 가치 핵심을 한 문장으로 정리해주세요.`
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI 서비스 미설정 (ANTHROPIC_API_KEY)' },
        { status: 503 },
      )
    }

    const body = await req.json()
    const { address, assetTitle } = body as { address?: string; assetTitle?: string }

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return NextResponse.json({ error: '주소가 필요합니다' }, { status: 400 })
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2500,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: buildUserPrompt(address.trim(), assetTitle),
              },
            ],
          })

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const payload = JSON.stringify({ text: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '분석 오류'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '서버 오류'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
