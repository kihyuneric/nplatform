import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "all"
  const priority = searchParams.get("priority") || "all"

  const signals = [
    {
      id: "s1",
      type: "급등",
      title: "서울 강남구 아파트 NPL 낙찰가율 급등",
      description: "강남구 소재 아파트 담보 NPL 낙찰가율이 전주 대비 5.8%p 급등하여 82.3%를 기록했습니다. 다수 기관 매수자의 동시 입찰 참여가 원인으로 분석됩니다.",
      priority: "긴급",
      region: "서울 강남구",
      sector: "부동산",
      changeValue: "+5.8%p",
      timestamp: "2026-03-20T09:23:00Z",
      relatedCount: 12,
    },
    {
      id: "s2",
      type: "대량거래",
      title: "A캐피탈, NPL 포트폴리오 1,200억원 규모 일괄 매각",
      description: "A캐피탈이 보유 중인 부동산 담보 NPL 포트폴리오 1,200억원 규모를 일괄 매각하는 프로세스를 시작했습니다. 복수의 AMC가 관심을 표명한 것으로 알려졌습니다.",
      priority: "긴급",
      region: "전국",
      sector: "부동산",
      changeValue: "1,200억원",
      timestamp: "2026-03-20T08:45:00Z",
      relatedCount: 8,
    },
    {
      id: "s3",
      type: "신규진입",
      title: "싱가포르계 자산운용사, 국내 NPL 시장 진출 선언",
      description: "싱가포르 소재 글로벌 자산운용사 G캐피탈이 국내 NPL 시장 진출을 공식 선언했습니다. 초기 투자 규모는 3,000억원으로 예상됩니다.",
      priority: "주의",
      region: "전국",
      sector: "전체",
      changeValue: "3,000억원",
      timestamp: "2026-03-20T07:30:00Z",
      relatedCount: 5,
    },
    {
      id: "s4",
      type: "급락",
      title: "지방 상업용 부동산 NPL 낙찰가율 급락",
      description: "대구·경북 지역 상가·오피스 담보 NPL의 평균 낙찰가율이 이달 들어 7.2%p 하락하였습니다. 지방 공실률 상승과 경기 침체 우려가 반영된 것으로 보입니다.",
      priority: "주의",
      region: "대구·경북",
      sector: "부동산",
      changeValue: "-7.2%p",
      timestamp: "2026-03-19T16:20:00Z",
      relatedCount: 18,
    },
    {
      id: "s5",
      type: "트렌드전환",
      title: "NPL 평균 할인율, 3개월 연속 하락세 전환",
      description: "전국 NPL 평균 할인율이 지난 3개월 연속 하락하며 22.8%를 기록했습니다. 이는 매수 경쟁 심화와 시장 유동성 증가가 주요 원인으로, 향후 수익률 압박이 예상됩니다.",
      priority: "참고",
      region: "전국",
      sector: "전체",
      changeValue: "-1.7%p",
      timestamp: "2026-03-19T14:00:00Z",
      relatedCount: 24,
    },
    {
      id: "s6",
      type: "급등",
      title: "선박 담보 NPL 시장 거래량 30% 급증",
      description: "해운업 경기 회복에 따른 선박 담보가치 상승으로 선박 NPL 거래량이 전분기 대비 30% 급증했습니다. 특히 컨테이너선 담보 NPL에 대한 투자자 관심이 높습니다.",
      priority: "주의",
      region: "전국",
      sector: "선박",
      changeValue: "+30%",
      timestamp: "2026-03-19T11:30:00Z",
      relatedCount: 7,
    },
    {
      id: "s7",
      type: "신규진입",
      title: "저축은행 NPL 매각 물량, 2분기부터 대폭 증가 전망",
      description: "금융당국의 건전성 강화 지도에 따라 주요 저축은행들이 2분기부터 NPL 매각을 대폭 확대할 것으로 예상됩니다. 예상 물량은 연간 5조원 수준입니다.",
      priority: "참고",
      region: "전국",
      sector: "매출채권",
      changeValue: "5조원/연",
      timestamp: "2026-03-18T15:45:00Z",
      relatedCount: 11,
    },
    {
      id: "s8",
      type: "트렌드전환",
      title: "개인 투자자 NPL 직접 투자 증가 추세",
      description: "기존 기관 중심이던 NPL 시장에서 고액 자산가 및 법인 형태의 개인 투자자 참여가 지난 6개월간 45% 증가했습니다. 소액 NPL 거래의 민주화 현상이 관측됩니다.",
      priority: "참고",
      region: "전국",
      sector: "전체",
      changeValue: "+45%",
      timestamp: "2026-03-18T10:00:00Z",
      relatedCount: 9,
    },
    {
      id: "s9",
      type: "대량거래",
      title: "캠코, 공공 NPL 공매 3월 특별 물량 2,800억원 출시",
      description: "한국자산관리공사(캠코)가 3월 특별 공매를 통해 2,800억원 규모의 공공 NPL 물량을 출시했습니다. 입찰 마감은 3월 25일입니다.",
      priority: "긴급",
      region: "전국",
      sector: "전체",
      changeValue: "2,800억원",
      timestamp: "2026-03-17T09:00:00Z",
      relatedCount: 34,
    },
    {
      id: "s10",
      type: "급락",
      title: "기계·장비 담보 NPL 할인율 확대, 투자 리스크 경고",
      description: "제조업 경기 둔화로 기계·장비 담보 NPL의 평균 할인율이 38%로 확대되었습니다. 자산 처분 시 예상보다 낮은 회수율이 예상되어 주의가 요구됩니다.",
      priority: "주의",
      region: "경기·충남",
      sector: "기계장비",
      changeValue: "38% 할인율",
      timestamp: "2026-03-16T13:30:00Z",
      relatedCount: 6,
    },
  ]

  let filtered = [...signals]

  if (type !== "all") {
    filtered = filtered.filter((s) => s.type === type)
  }
  if (priority !== "all") {
    filtered = filtered.filter((s) => s.priority === priority)
  }

  return NextResponse.json({
    signals: filtered,
    total: filtered.length,
    fetchedAt: new Date().toISOString(),
  })
}
