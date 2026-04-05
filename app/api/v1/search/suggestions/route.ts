import { NextRequest, NextResponse } from "next/server"

// ─── Sample Data for Suggestions ─────────────────────────────

const SAMPLE_LISTINGS = [
  { text: "강남구 아파트 담보 부실채권", type: "listing" as const },
  { text: "서초구 오피스 건물 채권", type: "listing" as const },
  { text: "해운대구 상가 부실채권", type: "listing" as const },
  { text: "성남시 오피스 NPL", type: "listing" as const },
  { text: "용인시 상가 담보 채권", type: "listing" as const },
  { text: "마포구 오피스텔 부실채권", type: "listing" as const },
  { text: "남동구 토지 NPL 매각", type: "listing" as const },
  { text: "유성구 아파트 채권 매각", type: "listing" as const },
  { text: "강서구 상가 담보 NPL", type: "listing" as const },
  { text: "분당구 오피스 부실채권 매각", type: "listing" as const },
  { text: "송파구 아파트 다세대 채권", type: "listing" as const },
  { text: "영등포구 오피스텔 NPL", type: "listing" as const },
]

const SAMPLE_REGIONS = [
  { text: "서울", type: "region" as const },
  { text: "서울 강남구", type: "region" as const },
  { text: "서울 서초구", type: "region" as const },
  { text: "서울 마포구", type: "region" as const },
  { text: "서울 송파구", type: "region" as const },
  { text: "서울 영등포구", type: "region" as const },
  { text: "경기", type: "region" as const },
  { text: "경기 성남시", type: "region" as const },
  { text: "경기 용인시", type: "region" as const },
  { text: "부산", type: "region" as const },
  { text: "부산 해운대구", type: "region" as const },
  { text: "대구", type: "region" as const },
  { text: "인천", type: "region" as const },
  { text: "인천 남동구", type: "region" as const },
  { text: "대전", type: "region" as const },
  { text: "대전 유성구", type: "region" as const },
  { text: "광주", type: "region" as const },
  { text: "울산", type: "region" as const },
  { text: "제주", type: "region" as const },
]

const SAMPLE_INSTITUTIONS = [
  { text: "한국자산관리공사", type: "institution" as const },
  { text: "우리은행", type: "institution" as const },
  { text: "하나은행", type: "institution" as const },
  { text: "신한은행", type: "institution" as const },
  { text: "국민은행", type: "institution" as const },
  { text: "IBK기업은행", type: "institution" as const },
  { text: "대신F&I", type: "institution" as const },
  { text: "연합자산관리", type: "institution" as const },
  { text: "유암코", type: "institution" as const },
  { text: "하나F&I", type: "institution" as const },
  { text: "NH농협은행", type: "institution" as const },
  { text: "KDB산업은행", type: "institution" as const },
]

const ALL_SUGGESTIONS = [
  ...SAMPLE_LISTINGS,
  ...SAMPLE_REGIONS,
  ...SAMPLE_INSTITUTIONS,
]

// ─── Route Handler ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? ""

  if (!q) {
    return NextResponse.json({ suggestions: [] })
  }

  const matched = ALL_SUGGESTIONS.filter((item) =>
    item.text.toLowerCase().includes(q)
  )
    .slice(0, 8)
    .map((item) => ({
      text: item.text,
      type: item.type,
    }))

  return NextResponse.json({ suggestions: matched })
}
