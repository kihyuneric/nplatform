/**
 * GET /api/v1/ai/health
 *
 * AI 기능 작동 상태 확인 엔드포인트
 * - API 키 설정 여부
 * - Claude 모델 응답 여부 (간단한 ping 테스트)
 * - 각 AI 기능 모듈 상태
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const startedAt = Date.now()

  const apiKey = process.env.ANTHROPIC_API_KEY
  const hasKey = !!(apiKey && apiKey.trim() !== '' && apiKey !== 'your-key-here')

  // 모델 핑 테스트 (hasKey일 때만)
  let pingOk = false
  let pingMs = 0
  let pingError: string | null = null
  let modelUsed: string | null = null

  if (hasKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey })

      const t0 = Date.now()
      const resp = await client.messages.create({
        model: 'claude-haiku-4-5',   // Ping용 — 가장 빠르고 저렴
        max_tokens: 16,
        system: [
          {
            type: 'text' as const,
            text: 'You are a health-check assistant. Respond with exactly: OK',
            cache_control: { type: 'ephemeral' as const },
          },
        ],
        messages: [{ role: 'user', content: 'ping' }],
      })

      pingMs = Date.now() - t0
      pingOk = resp.content[0]?.type === 'text'
      modelUsed = resp.model
    } catch (err: unknown) {
      pingError = err instanceof Error ? err.message : 'Unknown error'
    }
  }

  const totalMs = Date.now() - startedAt

  return NextResponse.json({
    ok: hasKey && pingOk,
    timestamp: new Date().toISOString(),
    latency_ms: totalMs,

    api_key: {
      configured: hasKey,
      hint: hasKey
        ? `sk-ant-...${apiKey!.slice(-4)}`
        : 'NOT SET — .env.local에 ANTHROPIC_API_KEY 추가 필요',
    },

    claude: {
      ping_ok: pingOk,
      ping_ms: pingOk ? pingMs : null,
      model: modelUsed ?? 'claude-haiku-4-5 (ping용)',
      error: pingError,
    },

    features: {
      profitability_analysis: {
        status: hasKey ? 'active' : 'fallback',
        description: 'NPL 수익성 분석 + AI 투자의견 서술',
        endpoint: '/api/v1/npl/profitability',
        model: 'claude-sonnet-4-5',
      },
      ocr: {
        status: 'active',    // ANTHROPIC_API_KEY 없어도 PDF/DOCX 텍스트 추출 가능
        description: 'PDF·이미지·DOCX·HWP 문서 데이터 추출',
        endpoint: '/api/v1/ocr',
        model: 'claude-haiku-4-5',
      },
      copilot: {
        status: hasKey ? 'active' : 'fallback',
        description: 'AI 딜 코파일럿 (자연어 분석)',
        endpoint: '/api/v1/ai/copilot',
        model: 'claude-sonnet-4-5',
      },
      rights_analysis: {
        status: hasKey ? 'active' : 'fallback',
        description: '등기부등본 OCR → 권리관계 AI 분석',
        endpoint: '/api/v1/ai/recovery-predict',
        model: 'claude-sonnet-4-5',
      },
      contract_review: {
        status: hasKey ? 'active' : 'fallback',
        description: '계약서 위험 조항 자동 검토',
        endpoint: '/api/v1/ai/contract-review',
        model: 'claude-sonnet-4-5',
      },
      dd_report: {
        status: hasKey ? 'active' : 'fallback',
        description: '실사 체크리스트 AI 보고서 생성',
        endpoint: '/api/v1/ai/dd-report',
        model: 'claude-sonnet-4-5',
      },
    },

    cost_strategy: {
      prompt_caching: true,
      description: 'NPL 시스템 프롬프트 캐싱 활성화 (반복 요청 ~90% 비용 절감)',
      model_routing: {
        ping_health_check: 'claude-haiku-4-5 ($0.80/1M)',
        ocr_extraction: 'claude-haiku-4-5 ($0.80/1M)',
        analysis_narrative: 'claude-sonnet-4-5 ($3.00/1M)',
        copilot_tool_use: 'claude-sonnet-4-5 ($3.00/1M)',
      },
    },
  })
}
