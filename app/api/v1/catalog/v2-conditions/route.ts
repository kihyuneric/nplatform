/**
 * /api/v1/catalog/v2-conditions
 *
 * GET — V2 18 특수조건 카탈로그 + 통계 반환.
 *
 * P0-12 (2026-05-03):
 * 마케팅 자료 / IR 데크 / 외부 보고서에서 "X가지 자동 검증" 클레임 시
 * 본 endpoint 결과 인용. 임의 숫자 (예: "80가지") 사용 금지.
 *
 * 공개 endpoint (인증 불필요) — 카탈로그 자체는 비공개 정보 아님.
 */
import { NextResponse } from 'next/server'
import { V2_CATALOG, getCatalogStats } from '@/lib/agreements/v2-catalog'

export async function GET() {
  const stats = getCatalogStats()

  return NextResponse.json({
    catalog: V2_CATALOG,
    stats,
    version: 'v2',
    last_updated: '2026-05-03',
    citation: `NPLatform V2 카탈로그 — 총 ${stats.total}개 특수조건 자동 검증 (실제 코드 검증 가능)`,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',  // 1시간 캐싱
    },
  })
}
