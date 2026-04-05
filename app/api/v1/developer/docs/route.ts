import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    openapi: '3.0.0',
    info: { title: 'NPLatform API', version: '2.0.0', description: 'NPL 부실채권 거래 플랫폼 API' },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/exchange/listings': { get: { summary: '매물 목록 조회', tags: ['Exchange'] } },
      '/exchange/deals': { get: { summary: '거래 목록 조회', tags: ['Exchange'] }, post: { summary: '거래 생성', tags: ['Exchange'] } },
      '/institutions': { get: { summary: '기관 목록', tags: ['Institutions'] } },
      '/professional/services': { get: { summary: '전문가 서비스', tags: ['Professional'] } },
      '/billing/subscribe': { post: { summary: '구독 신청', tags: ['Billing'] } },
      '/ai/sample-analysis': { post: { summary: 'AI NPL 분석', tags: ['AI'] } },
      '/ai/nl-search': { post: { summary: 'AI 자연어 검색', tags: ['AI'] } },
      '/health': { get: { summary: '서버 상태', tags: ['System'] } },
    },
  })
}
