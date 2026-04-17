import { NextResponse } from "next/server"

/**
 * OpenAPI 3.0 spec for NPLatform public API (v1).
 * Generated manually from Zod validators and route handlers.
 * Served at GET /api/openapi.
 */

const spec = {
  openapi: "3.0.3",
  info: {
    title: "NPLatform API",
    description: [
      "NPL 매물 거래/분석/관리 REST API — v1",
      "",
      "## 인증 방식",
      "",
      "### 1. Bearer JWT (세션 기반)",
      "웹 UI에서 로그인한 사용자 세션이 자동으로 `Authorization: Bearer <JWT>`를 전달합니다.",
      "",
      "### 2. API Key (서버 간 연동)",
      "`/my/developer` 페이지에서 API 키를 발급받아 `X-API-Key` 헤더에 넣어 요청하세요.",
      "- 키는 발급 직후 한 번만 표시됩니다. 안전한 곳에 보관하세요.",
      "- 분당 60회, 시간당 1,000회 요청 제한이 적용됩니다.",
      "- 권한 범위(scopes): `read:exchange`, `read:analysis`, `write:deals`.",
      "",
      "예시:",
      "```bash",
      "curl -H 'X-API-Key: npl_live_xxx' https://nplatform.kr/api/v1/exchange",
      "```",
    ].join("\n"),
    version: "1.0.0",
    contact: { name: "NPLatform", url: "https://nplatform.kr" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: "https://nplatform.kr/api/v1", description: "Production" },
    { url: "http://localhost:3000/api/v1", description: "Local dev" },
  ],
  tags: [
    { name: "Exchange", description: "NPL 매물 거래소" },
    { name: "Analysis", description: "매물 분석 엔진" },
    { name: "Deals", description: "거래 진행" },
    { name: "Demands", description: "수요 공고" },
    { name: "Portfolio", description: "포트폴리오 관리" },
    { name: "Notifications", description: "알림" },
    { name: "Billing", description: "결제/정산" },
    { name: "Admin", description: "관리자 전용" },
    { name: "Developer", description: "API 키 관리 (개발자 콘솔)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase 세션 JWT. 웹 로그인 후 쿠키에 저장된 토큰을 사용합니다.",
      },
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description:
          "서버 간 연동용 API 키. `/my/developer`에서 발급. 형식: `npl_live_*` (production) / `npl_test_*` (test).",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["ok", "error"],
        properties: {
          ok: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
      NPLListing: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          collateral_type: { type: "string", enum: ["아파트", "오피스텔", "상가", "토지", "공장", "기타"] },
          address: { type: "string" },
          location_city: { type: "string" },
          location_district: { type: "string" },
          principal_amount: { type: "number" },
          discount_rate: { type: "number" },
          risk_grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
          institution: { type: "string" },
          status: { type: "string", enum: ["DRAFT", "ACTIVE", "HIDDEN", "SOLD", "ARCHIVED"] },
          created_at: { type: "string", format: "date-time" },
          tier_required: { type: "integer", enum: [0, 1, 2, 3] },
        },
      },
      Demand: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          buyer_name: { type: "string" },
          collateral_types: { type: "array", items: { type: "string" } },
          regions: { type: "array", items: { type: "string" } },
          min_amount: { type: "number" },
          max_amount: { type: "number" },
          urgency: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          target_discount_rate: { type: "number" },
          preferred_risk_grades: { type: "array", items: { type: "string" } },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Deal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          listing_id: { type: "string", format: "uuid" },
          buyer_id: { type: "string", format: "uuid" },
          seller_id: { type: "string", format: "uuid" },
          stage: {
            type: "string",
            enum: ["INITIAL", "NDA", "LOI", "DD", "CONTRACT", "CLOSING", "COMPLETED", "CANCELED"],
          },
          agreed_price: { type: "number" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "프로덕션 서버" },
          prefix: { type: "string", example: "npl_live_ab12" },
          scopes: {
            type: "array",
            items: { type: "string", enum: ["read:exchange", "read:analysis", "write:deals"] },
          },
          created_at: { type: "string", format: "date-time" },
          last_used_at: { type: "string", format: "date-time", nullable: true },
          revoked_at: { type: "string", format: "date-time", nullable: true },
        },
      },
      MatchResult: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 100 },
          breakdown: {
            type: "object",
            properties: {
              collateral: { type: "number" },
              region: { type: "number" },
              price: { type: "number" },
              riskGrade: { type: "number" },
              urgency: { type: "number" },
            },
          },
          concentrationPenalty: { type: "number" },
        },
      },
    },
  },
  paths: {
    "/exchange": {
      get: {
        tags: ["Exchange"],
        summary: "NPL 매물 목록 조회",
        description: "비로그인도 L0 마스킹 데이터로 조회 가능. API Key 또는 Bearer JWT로 인증 시 tier에 맞춰 언마스킹된 필드가 포함됩니다.",
        security: [{ bearerAuth: [] }, { apiKey: [] }, {}],
        parameters: [
          { name: "collateral_type", in: "query", schema: { type: "string" } },
          { name: "region", in: "query", schema: { type: "string" } },
          { name: "price_min", in: "query", schema: { type: "integer" } },
          { name: "price_max", in: "query", schema: { type: "integer" } },
          { name: "grade", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          "200": {
            description: "매물 목록",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        items: { type: "array", items: { $ref: "#/components/schemas/NPLListing" } },
                        total: { type: "integer" },
                        page: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Exchange"],
        summary: "매물 등록 (매도자)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/NPLListing" } },
          },
        },
        responses: {
          "201": { description: "Created" },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/exchange/{id}": {
      get: {
        tags: ["Exchange"],
        summary: "매물 상세 조회 (tier 마스킹 적용)",
        security: [{ bearerAuth: [] }, { apiKey: [] }, {}],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "매물 상세", content: { "application/json": { schema: { $ref: "#/components/schemas/NPLListing" } } } },
          "404": { description: "Not found" },
        },
      },
    },
    "/exchange/demands": {
      get: {
        tags: ["Demands"],
        summary: "수요 공고 목록",
        responses: {
          "200": {
            description: "수요 목록",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Demand" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Demands"],
        summary: "수요 등록 (매수자)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Demand" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/analysis/{id}": {
      get: {
        tags: ["Analysis"],
        summary: "매물 AI 분석 결과 조회",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "분석 결과" } },
      },
    },
    "/analysis/run": {
      post: {
        tags: ["Analysis"],
        summary: "결정론적 수익 분석 실행",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["listing_id", "bid_rate_pct"],
                properties: {
                  listing_id: { type: "string" },
                  bid_rate_pct: { type: "number" },
                  scenario: { type: "string", enum: ["loan_sale", "npl_buy", "own_bid"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "ROI/IRR/회수기간 등",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    netProfit: { type: "number" },
                    roi: { type: "number" },
                    irr: { type: "number" },
                    paybackMonths: { type: "integer" },
                    breakEvenBidRatio: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/deals": {
      get: {
        tags: ["Deals"],
        summary: "진행 중 거래 목록",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "거래 목록", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Deal" } } } } } },
      },
    },
    "/deals/{id}": {
      get: {
        tags: ["Deals"],
        summary: "거래 상세",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "거래 상세", content: { "application/json": { schema: { $ref: "#/components/schemas/Deal" } } } } },
      },
      patch: {
        tags: ["Deals"],
        summary: "거래 스테이지 전환",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["stage"], properties: { stage: { type: "string" } } },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
    },
    "/buyer/portfolio": {
      get: {
        tags: ["Portfolio"],
        summary: "매수자 포트폴리오 현황",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "포트폴리오 통계+매물" } },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "알림 목록",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "알림" } },
      },
    },
    "/commissions": {
      get: {
        tags: ["Billing"],
        summary: "수수료/정산 조회",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Commissions list" } },
      },
    },
    "/admin/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "관리자 대시보드 KPI",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "KPI" } },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "사용자 목록 (관리자)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "사용자 목록" } },
      },
    },
    "/stats": {
      get: {
        tags: ["Analysis"],
        summary: "NPL 시장 평균 수익률 등 지표",
        security: [{ bearerAuth: [] }, { apiKey: [] }, {}],
        responses: { "200": { description: "통계" } },
      },
    },
    "/developer/api-keys": {
      get: {
        tags: ["Developer"],
        summary: "내 API 키 목록",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "API 키 목록",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/ApiKey" } },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Developer"],
        summary: "API 키 발급",
        description: "새 API 키를 발급합니다. **key 필드는 이 응답에서 한 번만 반환됩니다** — 안전한 곳에 저장하세요.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "프로덕션 서버" },
                  scopes: {
                    type: "array",
                    items: { type: "string", enum: ["read:exchange", "read:analysis", "write:deals"] },
                    default: ["read:exchange"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "발급 성공 — `key`는 한 번만 반환됩니다.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/ApiKey" },
                        {
                          type: "object",
                          properties: {
                            key: {
                              type: "string",
                              description: "Raw API key — 한 번만 표시됨",
                              example: "npl_live_ab12cd34ef56gh78",
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/developer/api-keys/{id}": {
      delete: {
        tags: ["Developer"],
        summary: "API 키 폐기 (revoke)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Revoked" },
          "404": { description: "Not found" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { apiKey: [] }],
}

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
