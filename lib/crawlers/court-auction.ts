/**
 * lib/crawlers/court-auction.ts
 *
 * 법원 경매 공시 크롤러 (대법원 경매정보 API / 화면 스크래핑 대체)
 *
 * 실제 운영 시:
 *   1. 대법원 경매정보 (https://www.courtauction.go.kr) 공식 API (유료) 사용
 *   2. 또는 공공데이터포털 법원경매정보 API (data.go.kr) 사용
 *   3. 본 모듈은 두 방식 모두 지원하는 인터페이스를 제공하며,
 *      개발/테스트 시에는 시드 데이터를 반환한다.
 *
 * 환경변수:
 *   COURT_AUCTION_API_KEY  - 공공데이터포털 API 키
 *   COURT_AUCTION_SOURCE   - "datago" | "courtauction" | "mock" (default: "mock")
 */

export interface CourtAuctionItem {
  /** 사건번호 (예: 2024타경12345) */
  case_number: string
  /** 법원명 */
  court_name: string
  /** 기일 (경매 날짜) */
  auction_date: string
  /** 물건 종류 */
  property_type: "아파트" | "오피스텔" | "상가" | "토지" | "공장" | "기타"
  /** 소재지 (주소) */
  address: string
  /** 감정가 (원) */
  appraised_value: number
  /** 최저입찰가 (원) */
  minimum_bid: number
  /** 채권금액 (원) */
  claim_amount: number
  /** 유찰 횟수 */
  failed_auction_count: number
  /** 물건 상태 */
  status: "진행" | "매각" | "취하" | "취소"
  /** 원천 URL */
  source_url?: string
}

export interface CrawlResult {
  items: CourtAuctionItem[]
  total: number
  page: number
  crawled_at: string
  source: string
}

// ── Source: 공공데이터포털 API ─────────────────────────────────────────────

async function fetchFromDataGo(params: {
  page: number
  perPage: number
  region?: string
  propertyType?: string
}): Promise<CrawlResult> {
  const apiKey = process.env.COURT_AUCTION_API_KEY
  if (!apiKey) throw new Error("COURT_AUCTION_API_KEY 환경변수가 없습니다.")

  const url = new URL("https://api.odcloud.kr/api/15022658/v1/uddi:f2f0ffe6-b7be-4c1d-838c-ccbace8c6b6e")
  url.searchParams.set("page", String(params.page))
  url.searchParams.set("perPage", String(params.perPage))
  url.searchParams.set("serviceKey", apiKey)
  if (params.region) url.searchParams.set("용도지역", params.region)

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 }, // 1시간 캐시
  })

  if (!res.ok) throw new Error(`법원경매 API 오류: ${res.status}`)
  const json = await res.json()

  return {
    items: (json.data ?? []).map((r: Record<string, string>) => ({
      case_number: r["사건번호"] ?? "",
      court_name: r["법원명"] ?? "",
      auction_date: r["기일"] ?? "",
      property_type: mapPropertyType(r["물건종류"] ?? ""),
      address: r["소재지"] ?? "",
      appraised_value: Number((r["감정가"] ?? "0").replace(/,/g, "")),
      minimum_bid: Number((r["최저입찰가"] ?? "0").replace(/,/g, "")),
      claim_amount: Number((r["채권금액"] ?? "0").replace(/,/g, "")),
      failed_auction_count: Number(r["유찰횟수"] ?? 0),
      status: mapStatus(r["진행상태"] ?? ""),
    })),
    total: json.totalCount ?? 0,
    page: params.page,
    crawled_at: new Date().toISOString(),
    source: "data.go.kr",
  }
}

// ── Source: Mock (개발/테스트용) ──────────────────────────────────────────

function getMockData(page: number): CrawlResult {
  const items: CourtAuctionItem[] = Array.from({ length: 10 }, (_, i) => ({
    case_number: `2024타경${10000 + page * 10 + i}`,
    court_name: ["서울중앙지방법원", "수원지방법원", "인천지방법원", "부산지방법원"][i % 4],
    auction_date: new Date(Date.now() + (7 + i) * 86400 * 1000).toISOString().slice(0, 10),
    property_type: ["아파트", "오피스텔", "상가", "토지", "아파트", "상가", "아파트", "토지", "오피스텔", "공장"][i] as CourtAuctionItem["property_type"],
    address: [
      "서울특별시 강남구 역삼동 123-45", "경기도 수원시 영통구 매탄동 67",
      "인천광역시 남동구 구월동 890", "부산광역시 해운대구 우동 234",
      "서울특별시 서초구 반포동 567", "경기도 성남시 분당구 정자동 89",
      "서울특별시 마포구 공덕동 123", "경기도 용인시 기흥구 중동 456",
      "서울특별시 송파구 잠실동 789", "경기도 고양시 일산서구 탄현동 12",
    ][i],
    appraised_value: (300 + i * 50) * 1_000_000,
    minimum_bid: Math.round((300 + i * 50) * 1_000_000 * (0.7 - i * 0.03)),
    claim_amount: (200 + i * 30) * 1_000_000,
    failed_auction_count: i % 3,
    status: i === 3 ? "매각" : i === 7 ? "취하" : "진행",
    source_url: `https://www.courtauction.go.kr/RetrieveRealEstMulDetailInfo.laf?jiwonNm=서울중앙&saChrGbnNm=타경&saYear=2024&saSer=${10000 + i}`,
  }))

  return {
    items,
    total: 1000,
    page,
    crawled_at: new Date().toISOString(),
    source: "mock",
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mapPropertyType(raw: string): CourtAuctionItem["property_type"] {
  if (raw.includes("아파트")) return "아파트"
  if (raw.includes("오피스텔")) return "오피스텔"
  if (raw.includes("상가") || raw.includes("근린")) return "상가"
  if (raw.includes("토지") || raw.includes("임야")) return "토지"
  if (raw.includes("공장")) return "공장"
  return "기타"
}

function mapStatus(raw: string): CourtAuctionItem["status"] {
  if (raw.includes("매각")) return "매각"
  if (raw.includes("취하")) return "취하"
  if (raw.includes("취소")) return "취소"
  return "진행"
}

// ── Public API ────────────────────────────────────────────────────────────

export interface CrawlOptions {
  page?: number
  perPage?: number
  region?: string
  propertyType?: string
}

export async function crawlCourtAuctions(options: CrawlOptions = {}): Promise<CrawlResult> {
  const { page = 1, perPage = 20, region, propertyType } = options
  const source = process.env.COURT_AUCTION_SOURCE ?? "mock"

  if (source === "datago") {
    return fetchFromDataGo({ page, perPage, region, propertyType })
  }

  // Default: mock
  return getMockData(page)
}

/**
 * NplListing 형식으로 변환 (Supabase insert용)
 */
export function toNplListingInsert(item: CourtAuctionItem, sellerId: string) {
  const discountRate = item.appraised_value > 0
    ? Math.round((1 - item.minimum_bid / item.appraised_value) * 100)
    : 0

  return {
    title: `[법원경매] ${item.court_name} ${item.case_number}`,
    collateral_type: item.property_type,
    address: item.address,
    location_city: item.address.split(" ")[0] ?? "",
    location_district: item.address.split(" ")[1] ?? "",
    principal_amount: item.claim_amount,
    appraised_value: item.appraised_value,
    minimum_price: item.minimum_bid,
    discount_rate: discountRate,
    delinquency_months: item.failed_auction_count * 3,
    auction_date: item.auction_date || null,
    case_number: item.case_number,
    court_name: item.court_name,
    seller_id: sellerId,
    status: "DRAFT",
    tier_required: 1,
    source: "court_auction_crawler",
    source_url: item.source_url ?? null,
    created_at: new Date().toISOString(),
  }
}
