/**
 * GET /api/v1/openapi/spec
 *
 * NPLatform 공개 API 스펙 (OpenAPI 3.1) — B2B 파트너·써드파티 통합용.
 * Phase 5 로드맵 #16 오픈 API 마켓플레이스 기반.
 *
 * 인증: X-API-Key 헤더 (api_keys 테이블로 관리, /api/v1/api-keys 참고)
 * 문서 UI: Swagger / Redoc / Scalar 어느 뷰어에서도 로드 가능.
 */

import { NextResponse } from 'next/server'

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'NPLatform Public API',
    version: '1.0.0',
    description:
      'NPLatform(트랜스파머)의 공개 B2B API. NPL 매물 조회, 시세, 딜룸, 결제 흐름을 표준 REST로 제공.',
    contact: { name: 'NPLatform API', email: 'api@nplatform.co.kr' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: 'https://nplatform.co.kr', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Local dev' },
  ],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: 'Listings', description: '매물 조회/등록' },
    { name: 'Market', description: '시세·거래 통계' },
    { name: 'Payments', description: '결제·정산' },
    { name: 'Analysis', description: 'NPL 분석·AI' },
    { name: 'RAG', description: '법률 RAG 검색' },
  ],
  paths: {
    '/api/v1/listings': {
      get: {
        tags: ['Listings'],
        summary: '매물 목록 조회',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['NPL', 'RE'] } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ListingListResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/listings/{id}': {
      get: {
        tags: ['Listings'],
        summary: '매물 상세 조회',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Listing' } },
            },
          },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/v1/market/search': {
      get: {
        tags: ['Market'],
        summary: '시세 검색 (주소·좌표·NPL 유형)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/payments/checkout': {
      post: {
        tags: ['Payments'],
        summary: '결제 세션 생성 (구독/크레딧)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckoutRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CheckoutResponse' },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/v1/rag/search': {
      post: {
        tags: ['RAG'],
        summary: '법률·판례 RAG 의미 검색',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: { type: 'string', description: '자연어 질의' },
                  top_k: { type: 'integer', default: 5 },
                  category: {
                    type: 'string',
                    enum: ['auction', 'npl_transfer', 'bankruptcy', 'tenant_rights', 'mortgage', 'tax_lien'],
                  },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/ai/copilot': {
      post: {
        tags: ['Analysis'],
        summary: 'AI 코파일럿 SSE 스트리밍',
        description: 'Server-Sent Events로 응답이 토큰 단위 스트리밍됩니다.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['messages'],
                properties: {
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string', enum: ['user', 'assistant'] },
                        content: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'SSE stream',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
    schemas: {
      Listing: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          price: { type: 'integer', description: '금액(원)' },
          type: { type: 'string', enum: ['NPL', 'RE'] },
          address: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ListingListResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
        },
      },
      CheckoutRequest: {
        type: 'object',
        required: ['type', 'amount'],
        properties: {
          type: { type: 'string', enum: ['SUBSCRIPTION', 'CREDIT_PURCHASE'] },
          plan_id: { type: 'string' },
          product_id: { type: 'string' },
          amount: { type: 'integer', minimum: 1 },
        },
      },
      CheckoutResponse: {
        type: 'object',
        properties: {
          orderId: { type: 'string', example: 'SUB-ABC-001' },
          amount: { type: 'integer' },
          checkoutUrl: { type: 'string', format: 'uri' },
          provider: { type: 'string', enum: ['toss', 'portone', 'inicis', 'none'] },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const

export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
