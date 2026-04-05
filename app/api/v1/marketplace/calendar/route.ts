import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'

// ─── Types ────────────────────────────────────────────────────

type BiddingStatus = "SCHEDULED" | "ACTIVE" | "CLOSED"

interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  status: BiddingStatus
  collateral: string
  region: string
  amount: number
  court?: string
  caseNumber?: string
  round: number
  minBid: number
  listingId?: string
  tags: string[]
}

// ─── Mock Events Store ────────────────────────────────────────

const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "E1", title: "서울 강남구 아파트 NPL",
    date: "2026-03-03", time: "10:00", status: "CLOSED",
    collateral: "아파트", region: "서울특별시",
    amount: 2800000000, court: "서울중앙지방법원",
    caseNumber: "2025타경12345", round: 2, minBid: 1960000000,
    tags: ["아파트", "NPL", "서울"],
  },
  {
    id: "E2", title: "경기 성남시 오피스 경공매",
    date: "2026-03-07", time: "14:00", status: "CLOSED",
    collateral: "오피스", region: "경기도",
    amount: 4500000000, court: "수원지방법원",
    caseNumber: "2025타경98765", round: 1, minBid: 4500000000,
    tags: ["오피스", "경공매", "경기"],
  },
  {
    id: "E3", title: "부산 해운대 상가 NPL",
    date: "2026-03-11", time: "10:30", status: "CLOSED",
    collateral: "상가", region: "부산광역시",
    amount: 1200000000, court: "부산지방법원",
    caseNumber: "2025타경55432", round: 3, minBid: 672000000,
    tags: ["상가", "NPL", "부산"],
  },
  {
    id: "E4", title: "서울 마포구 빌라 임의매각",
    date: "2026-03-14", time: "11:00", status: "CLOSED",
    collateral: "빌라/다세대", region: "서울특별시",
    amount: 650000000, court: "서울서부지방법원",
    caseNumber: "2026타경11223", round: 1, minBid: 650000000,
    tags: ["빌라", "임의매각", "서울"],
  },
  {
    id: "E5", title: "인천 서구 공장 경공매",
    date: "2026-03-18", time: "09:30", status: "ACTIVE",
    collateral: "공장", region: "인천광역시",
    amount: 3200000000, court: "인천지방법원",
    caseNumber: "2025타경77654", round: 2, minBid: 2240000000,
    tags: ["공장", "경공매", "인천"],
  },
  {
    id: "E6", title: "대구 수성구 아파트 NPL",
    date: "2026-03-18", time: "14:30", status: "ACTIVE",
    collateral: "아파트", region: "대구광역시",
    amount: 580000000, court: "대구지방법원",
    caseNumber: "2026타경30001", round: 1, minBid: 580000000,
    tags: ["아파트", "NPL", "대구"],
  },
  {
    id: "E7", title: "경기 용인시 토지 경매",
    date: "2026-03-20", time: "10:00", status: "ACTIVE",
    collateral: "토지", region: "경기도",
    amount: 1800000000, court: "수원지방법원",
    caseNumber: "2026타경44567", round: 1, minBid: 1800000000,
    tags: ["토지", "경매", "경기"],
  },
  {
    id: "E8", title: "서울 송파구 오피스텔 NPL",
    date: "2026-03-25", time: "10:00", status: "SCHEDULED",
    collateral: "오피스", region: "서울특별시",
    amount: 920000000, court: "서울동부지방법원",
    caseNumber: "2026타경22334", round: 1, minBid: 920000000,
    tags: ["오피스텔", "NPL", "서울"],
  },
  {
    id: "E9", title: "부산 사하구 창고 NPL",
    date: "2026-03-26", time: "14:00", status: "SCHEDULED",
    collateral: "창고", region: "부산광역시",
    amount: 750000000, court: "부산지방법원",
    caseNumber: "2026타경55678", round: 2, minBid: 525000000,
    tags: ["창고", "NPL", "부산"],
  },
  {
    id: "E10", title: "경기 수원시 상가 임의매각",
    date: "2026-03-28", time: "11:00", status: "SCHEDULED",
    collateral: "상가", region: "경기도",
    amount: 2100000000, court: "수원지방법원",
    caseNumber: "2026타경10987", round: 1, minBid: 2100000000,
    tags: ["상가", "임의매각", "경기"],
  },
  {
    id: "E11", title: "서울 강서구 빌라 경공매",
    date: "2026-04-03", time: "10:00", status: "SCHEDULED",
    collateral: "빌라/다세대", region: "서울특별시",
    amount: 430000000, court: "서울남부지방법원",
    caseNumber: "2026타경77889", round: 1, minBid: 430000000,
    tags: ["빌라", "경공매", "서울"],
  },
  {
    id: "E12", title: "인천 남동구 공장 NPL",
    date: "2026-04-08", time: "14:00", status: "SCHEDULED",
    collateral: "공장", region: "인천광역시",
    amount: 5600000000, court: "인천지방법원",
    caseNumber: "2026타경99123", round: 1, minBid: 5600000000,
    tags: ["공장", "NPL", "인천"],
  },
  {
    id: "E13", title: "대전 유성구 아파트 경매",
    date: "2026-04-15", time: "10:30", status: "SCHEDULED",
    collateral: "아파트", region: "대전광역시",
    amount: 340000000, court: "대전지방법원",
    caseNumber: "2026타경22100", round: 2, minBid: 238000000,
    tags: ["아파트", "경매", "대전"],
  },
]

// ─── Route Handler ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const year = searchParams.get("year")
    const month = searchParams.get("month")  // 1-indexed
    const date = searchParams.get("date")    // YYYY-MM-DD exact
    const status = searchParams.get("status") as BiddingStatus | null
    const region = searchParams.get("region")
    const collateral = searchParams.get("collateral")

    let events = [...CALENDAR_EVENTS]

    // Filter by year+month
    if (year && month) {
      const y = Number(year)
      const m = Number(month)
      events = events.filter(e => {
        const d = new Date(e.date)
        return d.getFullYear() === y && d.getMonth() + 1 === m
      })
    }

    // Filter by exact date
    if (date) {
      events = events.filter(e => e.date === date)
    }

    // Filter by status
    if (status) {
      events = events.filter(e => e.status === status)
    }

    // Filter by region
    if (region) {
      events = events.filter(e => e.region === region)
    }

    // Filter by collateral
    if (collateral) {
      events = events.filter(e => e.collateral === collateral)
    }

    // Group by date for calendar view
    const byDate: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      if (!byDate[ev.date]) byDate[ev.date] = []
      byDate[ev.date].push(ev)
    }

    const summary = {
      total: events.length,
      scheduled: events.filter(e => e.status === "SCHEDULED").length,
      active: events.filter(e => e.status === "ACTIVE").length,
      closed: events.filter(e => e.status === "CLOSED").length,
    }

    return NextResponse.json({
      success: true,
      events,
      byDate,
      summary,
    })
  } catch (err) {
    logger.error("[GET /api/v1/marketplace/calendar]", { error: err })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "캘린더 데이터 조회 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
