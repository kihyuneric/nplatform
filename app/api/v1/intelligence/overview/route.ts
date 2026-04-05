import { NextResponse } from "next/server"

export async function GET() {
  const data = {
    kpis: {
      totalNplSize: 127400, // 억원
      totalNplSizeChange: 8.3,
      totalVolume: 2847,
      totalVolumeChange: 14.2,
      avgDiscountRate: 22.8,
      avgDiscountRateChange: -1.7,
      winningRate: 71.3,
      winningRateChange: -0.8,
      newRegistrations: 312,
      newRegistrationsChange: 19.5,
      momGrowth: 8.3,
    },
    marketSizeTrend: [
      { month: "2025.04", size: 98200, volume: 1920 },
      { month: "2025.05", size: 101500, volume: 2050 },
      { month: "2025.06", size: 105800, volume: 2180 },
      { month: "2025.07", size: 103400, volume: 2090 },
      { month: "2025.08", size: 99700, volume: 1980 },
      { month: "2025.09", size: 108300, volume: 2250 },
      { month: "2025.10", size: 112700, volume: 2380 },
      { month: "2025.11", size: 109200, volume: 2270 },
      { month: "2025.12", size: 114600, volume: 2450 },
      { month: "2026.01", size: 119800, volume: 2640 },
      { month: "2026.02", size: 123400, volume: 2720 },
      { month: "2026.03", size: 127400, volume: 2847 },
    ],
    sectorBreakdown: [
      { name: "부동산", value: 68.4, amount: 87143 },
      { name: "선박", value: 9.2, amount: 11721 },
      { name: "기계장비", value: 7.8, amount: 9937 },
      { name: "매출채권", value: 8.6, amount: 10957 },
      { name: "기타", value: 6.0, amount: 7644 },
    ],
    recentNews: [
      {
        id: "n1",
        title: "금융당국, NPL 시장 투명성 강화를 위한 가이드라인 발표",
        source: "금융감독원",
        date: "2026-03-19",
        category: "정책",
        impact: "positive",
      },
      {
        id: "n2",
        title: "1분기 NPL 거래 규모 전년 동기 대비 18% 증가",
        source: "한국자산관리공사",
        date: "2026-03-18",
        category: "시장동향",
        impact: "positive",
      },
      {
        id: "n3",
        title: "저축은행 건전성 지표 개선…NPL 비율 4.2%로 하락",
        source: "저축은행중앙회",
        date: "2026-03-17",
        category: "금융동향",
        impact: "neutral",
      },
      {
        id: "n4",
        title: "부동산 NPL 낙찰가율, 강남권 아파트 중심으로 소폭 반등",
        source: "NPLatform 리서치",
        date: "2026-03-16",
        category: "경매동향",
        impact: "positive",
      },
      {
        id: "n5",
        title: "외국계 AMC, 국내 NPL 시장 진출 확대…경쟁 심화 전망",
        source: "매일경제",
        date: "2026-03-15",
        category: "시장동향",
        impact: "negative",
      },
    ],
    fetchedAt: new Date().toISOString(),
  }

  return NextResponse.json(data)
}
