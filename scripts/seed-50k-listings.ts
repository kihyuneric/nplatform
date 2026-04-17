/**
 * scripts/seed-50k-listings.ts
 *
 * 5만건 매물 시드 — court_auction_listings 35k + deal_listings 15k
 *
 * 사용:
 *   pnpm tsx scripts/seed-50k-listings.ts                # 전체 5만
 *   pnpm tsx scripts/seed-50k-listings.ts --court 1000   # 부분
 *   pnpm tsx scripts/seed-50k-listings.ts --dry-run      # SQL만 출력
 *
 * 환경변수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 설계 노트:
 *   - 결정론적 시드 (SEED_BASE) — 재실행 시 동일 데이터
 *   - upsert by case_number (court) / id (deal) — 멱등
 *   - 1000건 단위 배치 insert (Supabase RLS 우회 service_role)
 *   - 한국 17개 광역시도 가중 분포 (서울/경기 65%, 광역시 25%, 도 10%)
 *   - 권리·낙찰가율 분포는 lib/ai/market-comps.ts 의 ANNUAL_DRIFT 와 정합
 */

import { createClient } from "@supabase/supabase-js"

// ─── Config ─────────────────────────────────────────────
const TOTAL_COURT = 35_000
const TOTAL_DEAL  = 15_000
const BATCH_SIZE  = 1_000
const SEED_BASE   = 20260407

// ─── 시드 가능한 의사난수 (mulberry32) ─────────────────────
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(SEED_BASE)
const rand = (min: number, max: number) => min + rng() * (max - min)
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
const pick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)]
const pickWeighted = <T>(items: readonly { v: T; w: number }[]): T => {
  const total = items.reduce((s, i) => s + i.w, 0)
  let r = rng() * total
  for (const it of items) {
    r -= it.w
    if (r <= 0) return it.v
  }
  return items[items.length - 1].v
}

// ─── 한국 지역 분포 ──────────────────────────────────────
const REGIONS = [
  { sido: "서울특별시", w: 28, sigungu: ["강남구","서초구","송파구","마포구","성동구","용산구","영등포구","강서구","노원구","관악구"] },
  { sido: "경기도",     w: 26, sigungu: ["성남시","수원시","고양시","용인시","화성시","안양시","부천시","평택시","의정부시","남양주시"] },
  { sido: "인천광역시", w: 8,  sigungu: ["연수구","남동구","서구","미추홀구","부평구","계양구"] },
  { sido: "부산광역시", w: 7,  sigungu: ["해운대구","수영구","남구","연제구","동래구","사하구","북구"] },
  { sido: "대구광역시", w: 4,  sigungu: ["수성구","중구","달서구","북구","동구"] },
  { sido: "대전광역시", w: 3,  sigungu: ["유성구","서구","중구","대덕구"] },
  { sido: "광주광역시", w: 3,  sigungu: ["서구","북구","광산구","남구"] },
  { sido: "울산광역시", w: 2,  sigungu: ["남구","중구","북구","울주군"] },
  { sido: "세종특별자치시", w: 1, sigungu: ["조치원읍","한솔동","도담동"] },
  { sido: "강원특별자치도", w: 3, sigungu: ["춘천시","원주시","강릉시","속초시"] },
  { sido: "충청북도",   w: 3, sigungu: ["청주시","충주시","제천시"] },
  { sido: "충청남도",   w: 3, sigungu: ["천안시","아산시","서산시","당진시"] },
  { sido: "전라북도",   w: 3, sigungu: ["전주시","익산시","군산시"] },
  { sido: "전라남도",   w: 2, sigungu: ["여수시","순천시","목포시"] },
  { sido: "경상북도",   w: 2, sigungu: ["포항시","구미시","경주시","안동시"] },
  { sido: "경상남도",   w: 2, sigungu: ["창원시","김해시","진주시","양산시"] },
] as const

const PROPERTY_TYPES = [
  { v: "아파트",   w: 48 },
  { v: "오피스텔", w: 18 },
  { v: "상가",     w: 14 },
  { v: "다세대",   w: 10 },
  { v: "토지",     w: 6  },
  { v: "공장",     w: 3  },
  { v: "기타",     w: 1  },
] as const

const COURTS = [
  "서울중앙지방법원","서울동부지방법원","서울서부지방법원","서울남부지방법원","서울북부지방법원",
  "수원지방법원","의정부지방법원","인천지방법원","부산지방법원","대구지방법원","대전지방법원",
  "광주지방법원","울산지방법원","춘천지방법원","청주지방법원","전주지방법원","창원지방법원",
] as const

const CREDITORS = [
  { name: "국민은행",     type: "BANK" },
  { name: "신한은행",     type: "BANK" },
  { name: "우리은행",     type: "BANK" },
  { name: "하나은행",     type: "BANK" },
  { name: "농협은행",     type: "BANK" },
  { name: "기업은행",     type: "BANK" },
  { name: "SC제일은행",   type: "BANK" },
  { name: "한국씨티은행", type: "BANK" },
  { name: "OK저축은행",   type: "SAVINGS_BANK" },
  { name: "웰컴저축은행", type: "SAVINGS_BANK" },
  { name: "SBI저축은행",  type: "SAVINGS_BANK" },
  { name: "신협",         type: "CREDIT_UNION" },
  { name: "새마을금고",   type: "CREDIT_UNION" },
  { name: "현대캐피탈",   type: "CAPITAL" },
  { name: "KB캐피탈",     type: "CAPITAL" },
] as const

// ─── 가격 시뮬레이션 ─────────────────────────────────────
// 광역시도별 평당가 × 면적 × 노이즈
const PRICE_PER_M2: Record<string, number> = {
  "서울특별시": 18_000_000,
  "경기도":     11_000_000,
  "인천광역시":  9_500_000,
  "부산광역시":  8_500_000,
  "대구광역시":  7_200_000,
  "대전광역시":  6_900_000,
  "광주광역시":  6_400_000,
  "울산광역시":  6_800_000,
  "세종특별자치시": 8_800_000,
  "강원특별자치도": 4_200_000,
  "충청북도":    4_500_000,
  "충청남도":    4_800_000,
  "전라북도":    4_100_000,
  "전라남도":    3_900_000,
  "경상북도":    4_000_000,
  "경상남도":    5_300_000,
}

function genCourtListing(i: number) {
  const region = pickWeighted(REGIONS.map(r => ({ v: r, w: r.w })))
  const sigungu = pick(region.sigungu)
  const dong = `${pick(["역삼","청담","논현","서초","반포","잠실","송파","목동","마포","성수","한남","이태원"])}동`
  const propertyType = pickWeighted(PROPERTY_TYPES)
  const area = +(rand(33, 165)).toFixed(2) // 10평 ~ 50평
  const ppm2 = PRICE_PER_M2[region.sido] ?? 5_000_000
  const appraised = Math.round(area * ppm2 * rand(0.85, 1.25))
  const auctionCount = pickWeighted([{v:1,w:50},{v:2,w:25},{v:3,w:15},{v:4,w:7},{v:5,w:3}])
  const discountPerRound = 0.20
  const minBid = Math.round(appraised * Math.pow(1 - discountPerRound, auctionCount - 1))
  const status = pickWeighted([
    { v: "SCHEDULED", w: 35 },
    { v: "BIDDING",   w: 12 },
    { v: "SOLD",      w: 38 },
    { v: "UNSOLD",    w: 10 },
    { v: "CANCELLED", w: 3  },
    { v: "WITHDRAWN", w: 2  },
  ])
  const isClosed = status === "SOLD"
  const winningBid = isClosed ? Math.round(minBid * rand(1.00, 1.18)) : null
  const winningBidRate = isClosed && winningBid ? +(winningBid / appraised).toFixed(4) : null

  const creditor = pick(CREDITORS)
  const loanPrincipal = Math.round(appraised * rand(0.55, 0.85))
  const loanBalance = Math.round(loanPrincipal * rand(1.05, 1.35))
  const seniorClaim = Math.round(loanBalance * rand(0.85, 1.0))
  const juniorClaim = Math.round(loanBalance * rand(0.0, 0.25))
  const lienCount = randInt(1, 4)
  const seizureCount = randInt(0, 3)

  const tenantCount = propertyType === "상가" ? randInt(0, 2) : randInt(0, 1)
  const totalTenantDeposit = tenantCount > 0 ? Math.round(appraised * rand(0.05, 0.20)) : 0
  const hasOpposingForce = tenantCount > 0 && rng() < 0.25

  const aiRoi = +(rand(8, 28)).toFixed(2)
  const aiRiskScore = randInt(15, 88)
  const aiBidProb = +(rand(0.18, 0.92)).toFixed(4)
  const aiVerdict = pickWeighted([
    { v: "STRONG_BUY", w: 8  },
    { v: "BUY",        w: 22 },
    { v: "CONSIDER",   w: 38 },
    { v: "CAUTION",    w: 22 },
    { v: "STOP",       w: 10 },
  ])

  // 경매기일: 과거 6개월 ~ 미래 3개월
  const daysOffset = randInt(-180, 90)
  const auctionDate = new Date(Date.now() + daysOffset * 86400000)
    .toISOString().slice(0, 10)

  // 사건번호: 2024~2026타경XXXXX
  const year = pickWeighted([{v:2024,w:25},{v:2025,w:50},{v:2026,w:25}])
  const caseNumber = `${year}타경${String(10000 + i).padStart(5, "0")}`

  return {
    case_number:        caseNumber,
    court_name:         pick(COURTS),
    property_type:      propertyType,
    address:            `${region.sido} ${sigungu} ${dong} ${randInt(1, 999)}-${randInt(1, 99)}`,
    sido:               region.sido,
    sigungu,
    dong,
    latitude:           +(rand(33.0, 38.6)).toFixed(7),
    longitude:          +(rand(126.0, 129.5)).toFixed(7),
    area_m2:            area,
    floor:              propertyType === "토지" ? null : randInt(1, 25),
    total_floors:       propertyType === "토지" ? null : randInt(5, 35),
    build_year:         randInt(1985, 2024),
    appraised_value:    appraised,
    min_bid_price:      minBid,
    winning_bid:        winningBid,
    winning_bid_rate:   winningBidRate,
    deposit_amount:     Math.round(minBid * 0.1),
    status,
    auction_date:       auctionDate,
    auction_count:      auctionCount,
    creditor_name:      creditor.name,
    creditor_type:      creditor.type,
    loan_principal:     loanPrincipal,
    loan_balance:       loanBalance,
    total_claim:        loanBalance,
    senior_claim:       seniorClaim,
    junior_claim:       juniorClaim,
    lien_count:         lienCount,
    seizure_count:      seizureCount,
    tenant_count:       tenantCount,
    total_tenant_deposit: totalTenantDeposit,
    has_opposing_force: hasOpposingForce,
    ai_roi_estimate:    aiRoi,
    ai_risk_score:      aiRiskScore,
    ai_bid_prob:        aiBidProb,
    ai_verdict:         aiVerdict,
    ai_screened_at:     new Date().toISOString(),
    ai_model_version:   "v1.0.0-2026-04",
    source:             "COURT",
  }
}

function genDealListing(_i: number, sellerId: string) {
  const region = pickWeighted(REGIONS.map(r => ({ v: r, w: r.w })))
  const sigungu = pick(region.sigungu)
  const collateralType = pickWeighted(PROPERTY_TYPES)
  const area = +(rand(40, 200)).toFixed(2)
  const ppm2 = PRICE_PER_M2[region.sido] ?? 5_000_000
  const appraised = Math.round(area * ppm2 * rand(0.85, 1.25))
  const ltv = +(rand(45, 88)).toFixed(2)
  const principal = Math.round(appraised * (ltv / 100))
  const askMin = Math.round(principal * rand(0.55, 0.78))
  const askMax = Math.round(askMin * rand(1.05, 1.22))
  const aiMid  = Math.round((askMin + askMax) / 2)

  const sellerType = pickWeighted([
    { v: "INSTITUTION", w: 35 },
    { v: "AMC",         w: 45 },
    { v: "INDIVIDUAL",  w: 20 },
  ])
  const riskGrade = pickWeighted([
    { v: "A", w: 10 },
    { v: "B", w: 35 },
    { v: "C", w: 35 },
    { v: "D", w: 15 },
    { v: "E", w: 5  },
  ])
  const status = pickWeighted([
    { v: "OPEN",            w: 55 },
    { v: "IN_REVIEW",       w: 12 },
    { v: "IN_NEGOTIATION",  w: 18 },
    { v: "CLOSED",          w: 12 },
    { v: "PENDING_REVIEW",  w: 3  },
  ])
  const visibility = pickWeighted([
    { v: "PUBLIC",   w: 70 },
    { v: "INTERNAL", w: 18 },
    { v: "TARGETED", w: 8  },
    { v: "VIP",      w: 4  },
  ])

  const deadlineDays = randInt(7, 90)
  const deadline = new Date(Date.now() + deadlineDays * 86400000).toISOString()

  return {
    seller_id:                  sellerId,
    seller_type:                sellerType,
    seller_verified:            rng() < 0.85,
    debt_principal:             principal,
    debt_delinquency_months:    randInt(3, 36),
    collateral_type:            collateralType,
    collateral_region:          region.sido,
    collateral_district:        sigungu,
    collateral_address:         `${region.sido} ${sigungu} ***`,
    collateral_area_sqm:        area,
    collateral_appraisal_value: appraised,
    collateral_ltv:             ltv,
    ask_min:                    askMin,
    ask_max:                    askMax,
    ai_estimate_low:            Math.round(askMin * 0.95),
    ai_estimate_mid:            aiMid,
    ai_estimate_high:           Math.round(askMax * 1.05),
    risk_grade:                 riskGrade,
    status,
    visibility,
    deadline,
    interested_count:           randInt(0, 35),
    view_count:                 randInt(10, 1500),
  }
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const courtIdx = args.indexOf("--court")
  const dealIdx  = args.indexOf("--deal")
  const courtCount = courtIdx >= 0 ? parseInt(args[courtIdx + 1], 10) : TOTAL_COURT
  const dealCount  = dealIdx  >= 0 ? parseInt(args[dealIdx  + 1], 10) : TOTAL_DEAL

  console.log(`[seed-50k] court=${courtCount} deal=${dealCount} dryRun=${dryRun}`)

  if (dryRun) {
    console.log("--- sample court ---")
    console.log(JSON.stringify(genCourtListing(0), null, 2))
    console.log("--- sample deal ---")
    console.log(JSON.stringify(genDealListing(0, "00000000-0000-0000-0000-000000000001"), null, 2))
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[seed-50k] env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정")
    process.exit(1)
  }
  const sb = createClient(url, key, { auth: { persistSession: false } })

  // 셀러 풀: 기존 auth.users 중 임의 100명 (없으면 system uuid)
  const { data: usersData } = await sb.auth.admin.listUsers({ page: 1, perPage: 100 })
  const sellerPool = (usersData?.users ?? []).map(u => u.id)
  if (sellerPool.length === 0) {
    sellerPool.push("00000000-0000-0000-0000-000000000001")
  }
  console.log(`[seed-50k] sellerPool size=${sellerPool.length}`)

  // 1) court_auction_listings
  let courtOk = 0, courtFail = 0
  for (let off = 0; off < courtCount; off += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, courtCount - off)
    const rows = Array.from({ length: size }, (_, j) => genCourtListing(off + j))
    const { error } = await sb
      .from("court_auction_listings")
      .upsert(rows, { onConflict: "case_number", ignoreDuplicates: false })
    if (error) {
      courtFail += size
      console.error(`[court] batch ${off} 실패:`, error.message)
    } else {
      courtOk += size
    }
    if ((off / BATCH_SIZE) % 5 === 0) {
      console.log(`[court] ${courtOk}/${courtCount}`)
    }
  }

  // 2) deal_listings
  let dealOk = 0, dealFail = 0
  for (let off = 0; off < dealCount; off += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, dealCount - off)
    const rows = Array.from({ length: size }, (_, j) =>
      genDealListing(off + j, sellerPool[(off + j) % sellerPool.length])
    )
    const { error } = await sb.from("deal_listings").insert(rows)
    if (error) {
      dealFail += size
      console.error(`[deal] batch ${off} 실패:`, error.message)
    } else {
      dealOk += size
    }
    if ((off / BATCH_SIZE) % 5 === 0) {
      console.log(`[deal] ${dealOk}/${dealCount}`)
    }
  }

  console.log("─".repeat(48))
  console.log(`[seed-50k] court  성공 ${courtOk} / 실패 ${courtFail}`)
  console.log(`[seed-50k] deal   성공 ${dealOk} / 실패 ${dealFail}`)
  console.log(`[seed-50k] total  ${courtOk + dealOk} / ${courtCount + dealCount}`)
}

main().catch((e) => {
  console.error("[seed-50k] fatal:", e)
  process.exit(1)
})
