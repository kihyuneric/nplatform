import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_DASHBOARD = {
  summary: {
    total_listings: 42,
    active_deals: 8,
    total_views: 15320,
    interested_count: 234,
  },
  recent_listings: [
    { id: "LST-001", title: "서울 강남구 아파트 담보채권 포트폴리오", volume: "320억", status: "판매중", views: 1250, interested: 28, createdAt: "2026-03-15T09:00:00Z" },
    { id: "LST-002", title: "부산 해운대 상가 NPL 패키지", volume: "85억", status: "판매중", views: 680, interested: 15, createdAt: "2026-03-12T10:00:00Z" },
    { id: "LST-003", title: "경기 판교 오피스 비경매채권", volume: "156억", status: "협상중", views: 920, interested: 22, createdAt: "2026-03-08T14:00:00Z" },
    { id: "LST-004", title: "인천 송도 물류센터 NPL", volume: "210억", status: "완료", views: 1100, interested: 31, createdAt: "2026-02-28T09:00:00Z" },
    { id: "LST-005", title: "대전 유성구 토지 담보채권", volume: "48억", status: "판매중", views: 430, interested: 9, createdAt: "2026-02-20T11:00:00Z" },
  ],
  monthly_stats: [
    { month: "2025.10", listings: 5, views: 2100, deals: 1 },
    { month: "2025.11", listings: 7, views: 2800, deals: 2 },
    { month: "2025.12", listings: 6, views: 2400, deals: 1 },
    { month: "2026.01", listings: 8, views: 3200, deals: 2 },
    { month: "2026.02", listings: 9, views: 3600, deals: 1 },
    { month: "2026.03", listings: 7, views: 4200, deals: 2 },
  ],
};

// ─── GET /api/v1/institution/dashboard ────────────────────────
export async function GET(_req: NextRequest) {
  try {
    return NextResponse.json({ data: MOCK_DASHBOARD, _mock: true });
  } catch (err) {
    logger.error("[institution/dashboard] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "기관 대시보드 조회 실패" } },
      { status: 500 }
    );
  }
}
