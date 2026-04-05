import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_LEADERBOARD = [
  { rank: 1, name: "김대한", company: "한국자산관리", referrals: 48, earnings: 15800000, grade: "DIAMOND" },
  { rank: 2, name: "이서준", company: "서울NPL파트너스", referrals: 42, earnings: 13500000, grade: "DIAMOND" },
  { rank: 3, name: "박지훈", company: "부동산솔루션", referrals: 35, earnings: 11200000, grade: "PLATINUM" },
  { rank: 4, name: "최유진", company: "한강자산", referrals: 31, earnings: 9800000, grade: "PLATINUM" },
  { rank: 5, name: "정민호", company: "강남투자관리", referrals: 28, earnings: 8500000, grade: "GOLD" },
  { rank: 6, name: "강은지", company: "동부자산운용", referrals: 24, earnings: 7200000, grade: "GOLD" },
  { rank: 7, name: "윤성민", company: "태평양파트너스", referrals: 20, earnings: 6100000, grade: "GOLD" },
  { rank: 8, name: "한수빈", company: "수도권NPL", referrals: 18, earnings: 5400000, grade: "SILVER" },
  { rank: 9, name: "오재현", company: "삼성부동산", referrals: 15, earnings: 4500000, grade: "SILVER" },
  { rank: 10, name: "서하늘", company: "대한자산컨설팅", referrals: 12, earnings: 3600000, grade: "SILVER" },
];

const MOCK_MONTHLY_LEADERBOARD = [
  { rank: 1, name: "김대한", company: "한국자산관리", referrals: 8, earnings: 2400000, grade: "DIAMOND" },
  { rank: 2, name: "박지훈", company: "부동산솔루션", referrals: 7, earnings: 2100000, grade: "PLATINUM" },
  { rank: 3, name: "이서준", company: "서울NPL파트너스", referrals: 6, earnings: 1800000, grade: "DIAMOND" },
  { rank: 4, name: "정민호", company: "강남투자관리", referrals: 5, earnings: 1500000, grade: "GOLD" },
  { rank: 5, name: "최유진", company: "한강자산", referrals: 5, earnings: 1400000, grade: "PLATINUM" },
  { rank: 6, name: "강은지", company: "동부자산운용", referrals: 4, earnings: 1200000, grade: "GOLD" },
  { rank: 7, name: "윤성민", company: "태평양파트너스", referrals: 3, earnings: 900000, grade: "GOLD" },
  { rank: 8, name: "한수빈", company: "수도권NPL", referrals: 3, earnings: 800000, grade: "SILVER" },
  { rank: 9, name: "오재현", company: "삼성부동산", referrals: 2, earnings: 600000, grade: "SILVER" },
  { rank: 10, name: "서하늘", company: "대한자산컨설팅", referrals: 2, earnings: 500000, grade: "SILVER" },
];

// ─── GET /api/v1/referrals/leaderboard ────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");

    const data = period === "this_month" ? MOCK_MONTHLY_LEADERBOARD : MOCK_LEADERBOARD;

    return NextResponse.json({ data, _mock: true });
  } catch (err) {
    logger.error("[referrals/leaderboard] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "리더보드 조회 실패" } },
      { status: 500 }
    );
  }
}
