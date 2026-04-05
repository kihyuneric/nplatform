import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'

// ─── GET /api/v1/partner/dashboard ────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // action=summary → KPI summary only
    if (action === "summary") {
      return NextResponse.json({
        data: {
          total_referrals: 48,
          active_referrals: 12,
          total_earnings: 15800000,
          conversion_rate: 32.5,
        },
        _mock: true,
      });
    }

    // action=recent → Recent referrals
    if (action === "recent") {
      return NextResponse.json({
        data: [
          { id: "R-001", name: "김철수", property: "강남 아파트 NPL", date: "2026-03-18", status: "진행" },
          { id: "R-002", name: "이영희", property: "해운대 상가", date: "2026-03-17", status: "완료" },
          { id: "R-003", name: "박민수", property: "판교 오피스", date: "2026-03-16", status: "신규" },
        ],
        _mock: true,
      });
    }

    // action=revenue → Monthly revenue
    if (action === "revenue") {
      return NextResponse.json({
        data: [
          { month: "2025.10", revenue: 820 },
          { month: "2025.11", revenue: 1050 },
          { month: "2025.12", revenue: 940 },
          { month: "2026.01", revenue: 1380 },
          { month: "2026.02", revenue: 1120 },
          { month: "2026.03", revenue: 1250 },
        ],
        _mock: true,
      });
    }

    // action=activity → Activity log
    if (action === "activity") {
      return NextResponse.json({
        data: [
          { time: "2026-03-18T14:30:00Z", text: "리드 L-001 신규 배분", type: "lead" },
          { time: "2026-03-18T11:20:00Z", text: "계약서 검토 완료", type: "document" },
          { time: "2026-03-18T09:15:00Z", text: "정산 승인 (420만원)", type: "settlement" },
          { time: "2026-03-17T16:45:00Z", text: "거래 완료 처리", type: "complete" },
        ],
        _mock: true,
      });
    }

    // action=notices → Partner notices
    if (action === "notices") {
      return NextResponse.json({
        data: [
          { id: "N-001", title: "3월 정산 안내", date: "2026-03-15", read: false },
          { id: "N-002", title: "파트너 등급 변경 안내", date: "2026-03-10", read: true },
          { id: "N-003", title: "시스템 점검 공지", date: "2026-03-05", read: true },
        ],
        _mock: true,
      });
    }

    // No action → full dashboard data (original)
    // TODO: Replace with actual DB query using partner session/auth
    const data = {
      kpi: {
        monthlyLeads: { value: 12, change: 3, changeLabel: "전월 대비" },
        activeDeals: { value: 5, change: 1, changeLabel: "전월 대비" },
        monthlyRevenue: { value: 1250, unit: "만원", changePercent: 18, changeLabel: "전월 대비" },
        pendingSettlement: { value: 830, unit: "만원", pendingCount: 4, changeLabel: "미정산 건수" },
      },
      leads: [
        { id: "L-001", date: "2026-03-18", property: "서울 강남구 아파트 담보채권", amount: "32억", status: "신규", fee: "960만원" },
        { id: "L-002", date: "2026-03-17", property: "부산 해운대 상가 NPL", amount: "18억", status: "진행", fee: "540만원" },
        { id: "L-003", date: "2026-03-16", property: "경기 판교 오피스 비경매", amount: "56억", status: "완료", fee: "1,680만원" },
        { id: "L-004", date: "2026-03-15", property: "인천 송도 물류센터 채권", amount: "124억", status: "진행", fee: "3,720만원" },
        { id: "L-005", date: "2026-03-14", property: "대전 유성구 토지 NPL", amount: "8.7억", status: "신규", fee: "261만원" },
        { id: "L-006", date: "2026-03-13", property: "서울 마포구 빌라 포트폴리오", amount: "43억", status: "진행", fee: "1,290만원" },
        { id: "L-007", date: "2026-03-12", property: "광주 북구 상가 채권", amount: "6.2억", status: "완료", fee: "186만원" },
        { id: "L-008", date: "2026-03-11", property: "경기 성남 오피스텔 NPL", amount: "15억", status: "신규", fee: "450만원" },
        { id: "L-009", date: "2026-03-10", property: "서울 종로구 빌딩 채권", amount: "89억", status: "진행", fee: "2,670만원" },
        { id: "L-010", date: "2026-03-09", property: "부산 동래구 아파트 NPL", amount: "12억", status: "완료", fee: "360만원" },
      ],
      monthly: [
        { month: "2025.10", leads: 8, revenue: 820 },
        { month: "2025.11", leads: 11, revenue: 1050 },
        { month: "2025.12", leads: 9, revenue: 940 },
        { month: "2026.01", leads: 14, revenue: 1380 },
        { month: "2026.02", leads: 10, revenue: 1120 },
        { month: "2026.03", leads: 12, revenue: 1250 },
      ],
      timeline: [
        { time: "오늘 14:30", text: "리드 L-001 신규 배분", type: "lead" },
        { time: "오늘 11:20", text: "리드 L-004 계약서 검토 완료", type: "document" },
        { time: "오늘 09:15", text: "3월 1차 정산 승인 (420만원)", type: "settlement" },
        { time: "어제 16:45", text: "리드 L-003 거래 완료 처리", type: "complete" },
        { time: "어제 13:00", text: "리드 L-005 신규 배분", type: "lead" },
        { time: "3/16 10:30", text: "파트너 등급 골드로 승급", type: "upgrade" },
        { time: "3/15 15:20", text: "리드 L-006 수락 완료", type: "accept" },
        { time: "3/14 09:00", text: "2월 정산 완료 (1,120만원)", type: "settlement" },
      ],
    };

    return NextResponse.json(data);
  } catch (err) {
    logger.error("[partner/dashboard] Error:", { error: err });
    return Errors.internal('대시보드 데이터를 불러오는 데 실패했습니다.');
  }
}
