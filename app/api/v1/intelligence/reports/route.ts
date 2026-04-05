import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "all"
  const category = searchParams.get("category") || "all"

  const reports = [
    {
      id: "r1",
      title: "2026년 1분기 NPL 시장 동향 보고서",
      period: "2026-Q1",
      periodType: "quarterly",
      category: "시장동향",
      summary: "2026년 1분기 전국 NPL 시장은 전년 동기 대비 18.3% 성장하며 호조를 보였습니다. 특히 수도권 부동산 담보 NPL의 낙찰가율이 개선되었으며, 신규 기관 투자자 진입이 증가하였습니다.",
      author: "NPLatform 리서치팀",
      publishedAt: "2026-03-15",
      pages: 48,
      fileSize: "3.2MB",
      tags: ["수도권", "부동산", "기관투자자"],
      aiSummary: "AI 분석: 1분기 NPL 시장은 전반적으로 회복세를 보이며, 특히 아파트 담보 NPL의 낙찰가율이 71.3%로 전분기 대비 2.1%p 상승했습니다. 금리 인하 기대감이 시장 심리 개선에 기여한 것으로 분석됩니다.",
    },
    {
      id: "r2",
      title: "2026년 2월 NPL 월간 시장 리포트",
      period: "2026-02",
      periodType: "monthly",
      category: "월간리포트",
      summary: "2월 NPL 시장은 총 거래 규모 1조 2,340억원을 기록하며 전월 대비 8.4% 증가했습니다. 부동산 담보 NPL이 전체 거래의 68.4%를 차지하며 시장을 주도했습니다.",
      author: "NPLatform 리서치팀",
      publishedAt: "2026-03-05",
      pages: 32,
      fileSize: "2.1MB",
      tags: ["월간", "거래동향", "담보별분석"],
      aiSummary: "AI 분석: 2월 시장은 설 연휴 이후 거래 회복 속도가 예상보다 빠른 양상을 보였습니다. 평균 할인율은 22.8%로 전월(24.5%)에 비해 개선되었으며, 이는 매수 수요 강화를 시사합니다.",
    },
    {
      id: "r3",
      title: "2025년 연간 NPL 시장 결산 보고서",
      period: "2025",
      periodType: "annual",
      category: "연간결산",
      summary: "2025년 NPL 시장은 총 거래 규모 42조 7,700억원을 기록하며 사상 최대치를 경신했습니다. 금리 인상 여파로 부실채권 공급이 증가하였으며, 외국계 AMC의 시장 참여가 확대되었습니다.",
      author: "NPLatform 리서치팀",
      publishedAt: "2026-02-10",
      pages: 96,
      fileSize: "7.8MB",
      tags: ["연간", "시장결산", "AMC"],
      aiSummary: "AI 분석: 2025년은 NPL 시장의 구조적 변화가 두드러진 해였습니다. 기존 은행권 중심의 매도자 구조에서 저축은행, 캐피탈 등 2금융권의 비중이 증가했으며, 선박·기계 담보 NPL의 거래도 활발해졌습니다.",
    },
    {
      id: "r4",
      title: "부동산 NPL 지역별 심층 분석: 수도권 vs 지방",
      period: "2026-Q1",
      periodType: "quarterly",
      category: "특집분석",
      summary: "수도권과 지방의 NPL 시장 격차를 분석한 심층 보고서입니다. 서울·경기 지역의 낙찰가율이 지방 대비 평균 8%p 높으며, 이는 부동산 실수요의 지역 집중 현상을 반영합니다.",
      author: "NPLatform 부동산분석팀",
      publishedAt: "2026-03-10",
      pages: 64,
      fileSize: "5.1MB",
      tags: ["수도권", "지방", "지역격차", "낙찰가율"],
      aiSummary: "AI 분석: 수도권 NPL의 수익률 프리미엄이 유지되는 가운데, 지방 광역시 소재 상업용 부동산 NPL에서 투자 기회가 포착되고 있습니다. 특히 부산·대구 지역 상가 NPL의 할인율 확대가 주목할 만합니다.",
    },
    {
      id: "r5",
      title: "NPL 시장 투자 전략: AMC 운용 현황 분석",
      period: "2025-Q4",
      periodType: "quarterly",
      category: "투자전략",
      summary: "국내외 AMC(자산관리회사)의 NPL 운용 전략 및 수익률 현황을 분석합니다. 평균 IRR은 12.4%이며, 단기 회수 전략을 선호하는 추세가 두드러집니다.",
      author: "NPLatform 투자분석팀",
      publishedAt: "2026-01-20",
      pages: 52,
      fileSize: "4.3MB",
      tags: ["AMC", "IRR", "투자전략", "회수전략"],
      aiSummary: "AI 분석: AMC들의 평균 보유 기간이 18개월에서 14개월로 단축되는 추세를 보이고 있습니다. 이는 빠른 자본 순환을 통한 수익률 최적화 전략의 일환으로 분석됩니다.",
    },
    {
      id: "r6",
      title: "2026년 1월 NPL 월간 시장 리포트",
      period: "2026-01",
      periodType: "monthly",
      category: "월간리포트",
      summary: "2026년 1월 NPL 시장은 신년 초 거래 소강 후 빠른 회복세를 보였습니다. 총 거래 규모 1조 1,980억원으로 전월 대비 2.9% 증가하였습니다.",
      author: "NPLatform 리서치팀",
      publishedAt: "2026-02-05",
      pages: 30,
      fileSize: "2.0MB",
      tags: ["월간", "1월", "시장동향"],
      aiSummary: "AI 분석: 1월 시장은 연초 효과로 기관 투자자의 신규 집행 수요가 높았으며, 특히 아파트 담보 NPL에 대한 경쟁이 심화되어 낙찰가율이 소폭 상승하였습니다.",
    },
  ]

  let filtered = [...reports]

  if (period !== "all") {
    filtered = filtered.filter((r) => r.periodType === period)
  }
  if (category !== "all") {
    filtered = filtered.filter((r) => r.category === category)
  }

  return NextResponse.json({
    reports: filtered,
    total: filtered.length,
    fetchedAt: new Date().toISOString(),
  })
}
