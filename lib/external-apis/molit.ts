// lib/external-apis/molit.ts
// 국토교통부 실거래가 공개시스템 (MOLIT) + KAMCO 경매정보 연동
// 현재: Mock 모드

export interface MolitTransaction {
  address: string
  dealDate: string        // "2026-02"
  price: number           // 만원
  area: number            // 전용면적 (m²)
  floor: number | null
  buildYear: number | null
  dealType: 'apt' | 'villa' | 'office' | 'land'
}

export interface KamcoAuction {
  caseNo: string          // 사건번호
  courtName: string       // 관할 법원
  address: string
  minimumBid: number      // 최저매각가격 (원)
  appraisedValue: number  // 감정가 (원)
  auctionDate: string
  biddingCount: number    // 입찰자 수
  status: 'scheduled' | 'sold' | 'failed'
  assetType: string
}

// ─── Mock 실거래가 데이터 ─────────────────────────────────────────────────────
export async function fetchRecentTransactions(
  sigunguCode: string,
  yearMonth?: string,
  dealType: MolitTransaction['dealType'] = 'apt'
): Promise<MolitTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY
  if (apiKey) {
    // TODO: 국토교통부 실거래가 API 호출
    // GET http://openapi.molit.go.kr:8081/OpenAPI_ToolInstallPackage/service/rest/...
  }

  await new Promise(r => setTimeout(r, 200))

  const basePrice = 80_000 + Math.floor(Math.random() * 40_000)  // 만원
  const months = ["2026-01", "2026-02", "2026-03", "2026-04"]

  return months.flatMap(month =>
    Array.from({ length: 3 }, (_, i) => ({
      address: `서울시 강남구 역삼동 ${100 + i}번지`,
      dealDate: month,
      price: basePrice + Math.floor(Math.random() * 10_000) * (i % 2 === 0 ? 1 : -1),
      area: 59 + i * 20,
      floor: 5 + i * 3,
      buildYear: 2005 + i * 5,
      dealType,
    }))
  )
}

// ─── Mock KAMCO 경매 데이터 ──────────────────────────────────────────────────
export async function fetchAuctionData(
  region?: string,
  dateRange?: { from: string; to: string }
): Promise<KamcoAuction[]> {
  const apiKey = process.env.KAMCO_API_KEY
  if (apiKey) {
    // TODO: 한국자산관리공사 온비드 API 호출
    // GET https://www.onbid.co.kr/op/cta/cltAsset/selectCollateralAssetList.do
  }

  await new Promise(r => setTimeout(r, 250))

  return [
    {
      caseNo: "2026타경12345",
      courtName: "서울중앙지방법원",
      address: "서울 강남구 역삼동 825-1",
      minimumBid: 420_000_000,
      appraisedValue: 600_000_000,
      auctionDate: "2026-05-15",
      biddingCount: 0,
      status: "scheduled",
      assetType: "아파트",
    },
    {
      caseNo: "2025타경98765",
      courtName: "서울동부지방법원",
      address: "서울 송파구 문정동 150",
      minimumBid: 336_000_000,
      appraisedValue: 480_000_000,
      auctionDate: "2026-04-25",
      biddingCount: 4,
      status: "sold",
      assetType: "오피스텔",
    },
    {
      caseNo: "2025타경54321",
      courtName: "수원지방법원",
      address: "경기 수원시 영통구 매탄동 200",
      minimumBid: 196_000_000,
      appraisedValue: 280_000_000,
      auctionDate: "2026-04-18",
      biddingCount: 0,
      status: "failed",
      assetType: "아파트",
    },
  ]
}

// ─── 낙찰가율 계산 ───────────────────────────────────────────────────────────
export function calcBidRatio(soldPrice: number, appraisedValue: number): number {
  if (appraisedValue <= 0) return 0
  return soldPrice / appraisedValue
}
