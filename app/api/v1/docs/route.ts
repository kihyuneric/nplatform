/**
 * GET /api/v1/docs
 *
 * NPlatform API OpenAPI 3.0 스펙 자동 생성
 * - Swagger UI: /api/docs (별도 페이지)
 * - JSON 스펙 다운로드: /api/v1/docs?format=json
 * - YAML 스펙: /api/v1/docs?format=yaml
 */

import { NextRequest, NextResponse } from 'next/server'
import { publicCacheHeaders } from '@/lib/cache-headers'

// ─── OpenAPI 3.0 스펙 ──────────────────────────────────────

function buildOpenAPISpec(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'NPlatform API',
      version: '1.0.0',
      description: `
# NPlatform API

NPL(부실채권) 부동산 투자 플랫폼 REST API

## 인증
- **Bearer Token**: Supabase JWT \`Authorization: Bearer <token>\`
- **API Key**: 개발자 포털에서 발급 \`X-API-Key: <key>\`

## 요청 제한 (Rate Limiting)
| 유형 | 한도 |
|------|------|
| 기본 | 100 req/min |
| AI/OCR | 20 req/min |
| 인증 | 10 req/min |
| 검색 | 60 req/min |

## 환경
- **Production**: \`https://nplatform.co.kr/api/v1\`
- **Sandbox**: \`https://sandbox.nplatform.co.kr/api/v1\`
      `.trim(),
      contact: { name: 'NPlatform API Support', email: 'api@nplatform.co.kr' },
      license: { name: 'Proprietary' },
    },
    servers: [
      { url: `${baseUrl}/api/v1`, description: '현재 환경' },
      { url: 'https://nplatform.co.kr/api/v1', description: 'Production' },
    ],
    tags: [
      { name: '분석', description: 'NPL 자동 분석 엔진' },
      { name: '시장지수', description: 'NBI 낙찰가율 지수' },
      { name: '코파일럿', description: 'AI NPL 투자 어시스턴트' },
      { name: '포트폴리오', description: '포트폴리오 분석' },
      { name: '결제', description: '크레딧 구매 · 구독' },
      { name: '거래소', description: 'NPL 매물 조회 · 거래' },
      { name: '관리자', description: '시장 데이터 · ML 모델 관리 (ADMIN)' },
      { name: '파이프라인', description: '데이터 파이프라인 (CRON)' },
    ],
    paths: {

      // ── 분석 엔진 ────────────────────────────────────────
      '/analysis-engine': {
        get: {
          tags: ['분석'],
          summary: '분석 모델 목록 조회',
          description: '실행 가능한 모든 분석 모델과 필요 필드 스키마를 반환합니다.',
          parameters: [
            {
              name: 'model',
              in: 'query',
              schema: { type: 'string' },
              description: '특정 모델 ID (없으면 전체 목록)',
            },
          ],
          responses: {
            '200': {
              description: '모델 목록',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AnalysisModelList' },
                },
              },
            },
          },
        },
        post: {
          tags: ['분석'],
          summary: 'NPL 자동 분석 실행',
          description: '입력 데이터에 맞는 모든 분석 모델을 자동 실행합니다. 최소 1개 필드 필요.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisInput' },
                examples: {
                  basic: {
                    summary: '아파트 기본 분석',
                    value: {
                      collateral_type: '아파트',
                      region: '서울',
                      appraised_value: 500000000,
                      ltv_ratio: 75,
                      delinquency_months: 12,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: '분석 결과', content: { 'application/json': { schema: { $ref: '#/components/schemas/AnalysisReport' } } } },
            '422': { description: '데이터 부족', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ── NBI 지수 ─────────────────────────────────────────
      '/indices/nbi': {
        get: {
          tags: ['시장지수'],
          summary: 'NBI 낙찰가율 지수 조회',
          description: 'NPlatform Bid-Rate Index (NBI). 기준: 2024-01 = 100',
          parameters: [
            { name: 'region', in: 'query', schema: { type: 'string', default: '전국' }, description: '지역 (서울, 경기, 부산 …)' },
            { name: 'property_type', in: 'query', schema: { type: 'string', enum: ['종합','아파트','상가','오피스텔','토지'], default: '종합' } },
            { name: 'periods', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 36, default: 15 }, description: '조회 기간 (월)' },
            { name: 'compare', in: 'query', schema: { type: 'boolean', default: false }, description: '지역 비교 모드' },
          ],
          responses: {
            '200': {
              description: 'NBI 지수',
              content: {
                'application/json': {
                  example: {
                    ok: true,
                    index: { value: 106.2, latest_ratio: 86.6, trend: 'rising', series: [] },
                    generated_at: '2026-04-02T00:00:00Z',
                    cached: true,
                  },
                },
              },
            },
          },
        },
      },

      // ── AI 코파일럿 ─────────────────────────────────────
      '/copilot': {
        post: {
          tags: ['코파일럿'],
          summary: 'NPL AI 코파일럿 대화',
          description: 'Claude AI 기반 NPL 투자 분석 어시스턴트. 물건 정보를 컨텍스트로 제공하면 맞춤 분석을 제공합니다.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CopilotRequest' },
                examples: {
                  basic: {
                    summary: '기본 질문',
                    value: { message: '이 물건 낙찰가율 예측해줘', context: { appraised_value: 500000000, region: '서울', collateral_type: '아파트' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'AI 응답', content: { 'application/json': { schema: { $ref: '#/components/schemas/CopilotResponse' } } } },
            '429': { description: '요청 한도 초과' },
          },
        },
      },

      // ── 포트폴리오 ───────────────────────────────────────
      '/portfolio/analyze': {
        post: {
          tags: ['포트폴리오'],
          summary: 'NPL 포트폴리오 분석',
          description: '최대 50개 물건의 포트폴리오 분석. 상관관계, 분산화 점수, 5개 스트레스 시나리오 제공.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: {
                      type: 'array',
                      minItems: 1,
                      maxItems: 50,
                      items: { $ref: '#/components/schemas/AnalysisInput' },
                    },
                    portfolioId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: '포트폴리오 분석 결과' },
          },
        },
      },

      // ── 결제 ─────────────────────────────────────────────
      '/payments/confirm': {
        post: {
          tags: ['결제'],
          summary: '결제 완료 검증 및 혜택 지급',
          description: 'PortOne 결제 완료 후 서버사이드 검증. 금액 위변조 방지.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['paymentId', 'orderId', 'amount'],
                  properties: {
                    paymentId:  { type: 'string', description: 'PortOne 결제 ID' },
                    orderId:    { type: 'string', description: '주문 ID (CRD- 또는 SUB- 접두사)' },
                    amount:     { type: 'integer', description: '결제 금액 (원)' },
                    packageId:  { type: 'string', enum: ['credit_10','credit_30','credit_100','credit_300'] },
                    planId:     { type: 'string', enum: ['pro','enterprise'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '결제 완료',
              content: {
                'application/json': {
                  example: { ok: true, paymentId: 'pay_xxx', paidAmount: 27000, creditsGranted: 30, benefit: '30 크레딧이 충전되었습니다.' },
                },
              },
            },
            '400': { description: '결제 검증 실패 (금액 불일치 등)' },
          },
        },
      },

      // ── 관리자: 시장 데이터 ──────────────────────────────
      '/admin/market-data': {
        get: {
          tags: ['관리자'],
          summary: '시장 참조 데이터 조회',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['rent','auction','all'] }, required: true },
          ],
          responses: { '200': { description: '시장 데이터' }, '403': { description: '관리자 권한 필요' } },
        },
      },

      // ── 파이프라인 ───────────────────────────────────────
      '/cron/data-pipeline': {
        get: {
          tags: ['파이프라인'],
          summary: '데이터 파이프라인 트리거',
          description: 'Vercel Cron 또는 수동 트리거. CRON_SECRET 인증 필요.',
          parameters: [
            { name: 'mode', in: 'query', schema: { type: 'string', enum: ['daily','weekly','monthly','manual'], default: 'daily' } },
          ],
          security: [{ cronSecret: [] }],
          responses: {
            '200': { description: '파이프라인 실행 결과' },
            '401': { description: 'CRON_SECRET 불일치' },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Supabase JWT 토큰' },
        apiKey:     { type: 'apiKey', in: 'header', name: 'X-API-Key', description: '개발자 포털 API 키' },
        cronSecret: { type: 'http', scheme: 'bearer', description: 'CRON_SECRET 환경변수 값' },
      },
      schemas: {
        AnalysisInput: {
          type: 'object',
          description: 'NPL 물건 분석 입력 데이터',
          properties: {
            collateral_type:    { type: 'string', example: '아파트', description: '담보물 유형' },
            region:             { type: 'string', example: '서울', description: '지역' },
            appraised_value:    { type: 'number', example: 500000000, description: '감정가 (원)' },
            area_sqm:           { type: 'number', example: 85.2, description: '전용면적 (㎡)' },
            floor:              { type: 'integer', example: 5 },
            year_built:         { type: 'integer', example: 2005 },
            ltv_ratio:          { type: 'number', example: 75, description: 'LTV (%)' },
            delinquency_months: { type: 'integer', example: 12, description: '연체 개월' },
            principal_amount:   { type: 'number', example: 375000000, description: '채권 원금 (원)' },
            senior_claims:      { type: 'number', description: '선순위 채권 (원)' },
            tenant_exists:      { type: 'boolean' },
            tenant_type:        { type: 'string', enum: ['없음','전세','월세','무상임차'] },
            tenant_deposit:     { type: 'number', description: '임차 보증금 (원)' },
            min_bid:            { type: 'number', description: '최저입찰가 (원)' },
          },
        },
        AnalysisModelList: {
          type: 'object',
          properties: {
            models: { type: 'array', items: { type: 'object' } },
            totalModels: { type: 'integer' },
          },
        },
        AnalysisReport: {
          type: 'object',
          properties: {
            executedModels: { type: 'array', items: { type: 'string' } },
            completeness: { type: 'number', description: '데이터 완성도 (0~100)' },
            generatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CopilotRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message:  { type: 'string', description: '사용자 질문' },
            history:  { type: 'array', description: '이전 대화 이력', items: { type: 'object' } },
            context:  { $ref: '#/components/schemas/AnalysisInput' },
            extract_from_message: { type: 'boolean', description: '메시지에서 물건 정보 자동 추출' },
          },
        },
        CopilotResponse: {
          type: 'object',
          properties: {
            reply:            { type: 'string', description: 'AI 응답 텍스트' },
            intent:           { type: 'string', description: '감지된 인텐트' },
            analysisResults:  { type: 'object', description: '자동 실행된 분석 결과' },
            suggestedQuestions: { type: 'array', items: { type: 'string' } },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } },
          },
        },
      },
    },
  }
}

// ─── 라우트 핸들러 ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const format = searchParams.get('format') ?? 'json'

  const spec = buildOpenAPISpec(origin)

  if (format === 'yaml') {
    // 간단한 YAML 직렬화 (js-yaml 없이)
    const yaml = jsonToYaml(spec, 0)
    return new Response(yaml, {
      headers: {
        'Content-Type': 'application/yaml',
        'Content-Disposition': 'attachment; filename="nplatform-api.yaml"',
        ...publicCacheHeaders(3600),
      },
    })
  }

  return NextResponse.json(spec, {
    headers: {
      ...publicCacheHeaders(3600),
      'Access-Control-Allow-Origin': '*',  // CORS: 외부 Swagger UI 허용
    },
  })
}

// ─── 간단한 JSON → YAML 변환 (외부 라이브러리 없이) ────────

function jsonToYaml(obj: unknown, indent: number): string {
  const pad = '  '.repeat(indent)
  if (obj === null || obj === undefined) return 'null'
  if (typeof obj === 'boolean') return obj.toString()
  if (typeof obj === 'number') return obj.toString()
  if (typeof obj === 'string') {
    // 특수문자 있으면 따옴표 처리
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.includes("'")) {
      return `"${obj.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    }
    return obj
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return obj.map((item) => `\n${pad}- ${jsonToYaml(item, indent + 1)}`).join('')
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return entries
      .map(([k, v]) => {
        const valStr = jsonToYaml(v, indent + 1)
        const isComplex = typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v as object).length > 0
        const isArr = Array.isArray(v) && (v as unknown[]).length > 0
        if (isComplex || isArr) {
          return `\n${pad}${k}:${valStr}`
        }
        return `\n${pad}${k}: ${valStr}`
      })
      .join('')
  }
  return String(obj)
}
