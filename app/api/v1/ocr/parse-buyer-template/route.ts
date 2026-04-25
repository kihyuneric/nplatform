/**
 * POST /api/v1/ocr/parse-buyer-template
 *
 * 매수자 요구사항 엑셀 (v1) → MatchableDemand 호환 JSON 자동 파싱.
 *
 * 입력: multipart/form-data 의 `file` 필드 (xlsx)
 * 출력: { data: { fields, regions, collateralTypes, avoidConditions, warnings, source } }
 *
 * 매핑 규칙 (시트별):
 *   · [시트 1] 매수자 정보   — A열 라벨 → B열 값 추출
 *   · [시트 2] 관심지역_담보 — 행별 (시도/담보) → B열 O/X
 *   · [시트 3] 가격_수익률   — A열 라벨 → B열 숫자 (범위 조건)
 *   · [시트 4] 위험회피_조건 — 행별 (특수조건) → C열 O/X
 */

import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { SPECIAL_CONDITIONS_V2 } from "@/lib/npl/unified-report/types"

const TRUE_VALUES = new Set(["o", "v", "y", "yes", "1", "true", "☑", "해당", "제공"])
const trim = (v: unknown) => String(v ?? "").trim()
const norm = (v: unknown) => trim(v).replace(/\s+/g, "").toLowerCase()
const isTrue = (v: unknown): boolean => TRUE_VALUES.has(norm(v))

const numFromKRW = (v: unknown): number => {
  const s = trim(v).replace(/[^\d.-]/g, "")
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
const pctFromString = (v: unknown): number => {
  const s = trim(v).replace(/[^\d.-]/g, "")
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

// ─── 시트 1 · 매수자 정보 매핑 ─────────────────────────────
const SHEET1_FIELD_MAP: Array<{
  match: string
  field: string
  type?: "string" | "number" | "krw" | "pct" | "buyerType" | "scale" | "horizon" | "appetite"
}> = [
  { match: "회사", field: "buyer_name" },
  { match: "이름", field: "buyer_name" },
  { match: "매수자유형", field: "buyer_type", type: "buyerType" },
  { match: "담당자연락처", field: "contact_phone" },
  { match: "담당자이메일", field: "contact_email" },
  { match: "투자가능규모", field: "investment_scale", type: "scale" },
  { match: "위험성향", field: "risk_appetite", type: "appetite" },
  { match: "회수기간", field: "recovery_horizon", type: "horizon" },
  { match: "최소roi요구치", field: "min_roi", type: "pct" },
  { match: "최소예측회수율", field: "min_recovery_rate", type: "pct" },
]

// 매수자 유형 → enum 매핑
const BUYER_TYPE_MAP: Record<string, string> = {
  "개인투자자": "INDIVIDUAL_INVESTOR", "법인투자자": "CORPORATE_INVESTOR",
  "대부업체": "MONEY_LENDER", "amc": "AMC", "사모펀드": "PRIVATE_EQUITY",
  "신탁사": "TRUST", "캐피탈": "CAPITAL", "기타": "OTHER",
}

// 투자 규모 → 숫자 범위 (원)
const SCALE_MAP: Record<string, { min: number; max: number }> = {
  "1억미만": { min: 0, max: 100_000_000 },
  "1억~5억": { min: 100_000_000, max: 500_000_000 },
  "5억~10억": { min: 500_000_000, max: 1_000_000_000 },
  "10억~30억": { min: 1_000_000_000, max: 3_000_000_000 },
  "30억~50억": { min: 3_000_000_000, max: 5_000_000_000 },
  "50억~100억": { min: 5_000_000_000, max: 10_000_000_000 },
  "100억이상": { min: 10_000_000_000, max: 100_000_000_000 },
}

// 회수 기간 (months)
const HORIZON_MAP: Record<string, number> = {
  "6개월이내": 6, "12개월이내": 12, "24개월이내": 24, "장기24개월+": 60,
}

// 위험 성향
const APPETITE_MAP: Record<string, string> = {
  "안정형확실한회수우선": "CONSERVATIVE",
  "균형형수익리스크균형": "MODERATE",
  "공격형고수익추구": "AGGRESSIVE",
}

function normalizeMap(value: string, table: Record<string, string>): string {
  const key = norm(value).split(/[(·]/)[0].trim()
  if (table[key]) return table[key]
  for (const [k, v] of Object.entries(table)) {
    if (norm(value).includes(k)) return v
  }
  return value
}

function parseValue(raw: unknown, type: string | undefined): unknown {
  if (raw === null || raw === undefined || trim(raw) === "") return null
  if (type === "krw" || type === "number") return numFromKRW(raw)
  if (type === "pct") return pctFromString(raw)
  if (type === "buyerType") return normalizeMap(String(raw), BUYER_TYPE_MAP)
  if (type === "scale") return normalizeMap(String(raw), Object.fromEntries(Object.keys(SCALE_MAP).map(k => [k, k])))
  if (type === "horizon") {
    const k = norm(raw).split(/[(·]/)[0].trim()
    return HORIZON_MAP[k] ?? null
  }
  if (type === "appetite") return normalizeMap(String(raw), APPETITE_MAP)
  return trim(raw)
}

function parseSheet1(sheet: XLSX.WorkSheet) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  const fields: Record<string, unknown> = {}
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue
    const label = norm(row[0])
    if (!label) continue
    for (const m of SHEET1_FIELD_MAP) {
      if (label.includes(norm(m.match))) {
        const parsed = parseValue(row[1], m.type)
        if (parsed !== null && parsed !== "") fields[m.field] = parsed
        break
      }
    }
  }
  // investment_scale 라벨 → min/max 자동 계산
  if (fields.investment_scale && SCALE_MAP[fields.investment_scale as string]) {
    const range = SCALE_MAP[fields.investment_scale as string]
    fields.min_amount = range.min
    fields.max_amount = range.max
  }
  return { fields, warnings: [] as string[] }
}

// ─── 시트 2 · 관심 지역·담보 ─────────────────────────────
function parseSheet2(sheet: XLSX.WorkSheet) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  const regions: string[] = []
  const collateralTypes: string[] = []
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue
    const label = trim(row[0])
    if (!label || label.startsWith("■") || label.startsWith("[") || label === "항목") continue
    if (!isTrue(row[1])) continue
    // 시도 / 담보종류 자동 분류
    if (
      label.endsWith("도") || label.endsWith("시") || label.endsWith("특별시") ||
      label.endsWith("광역시") || label.endsWith("자치시") || label.endsWith("자치도")
    ) {
      regions.push(label)
    } else {
      collateralTypes.push(label)
    }
  }
  return { regions, collateralTypes, warnings: [] as string[] }
}

// ─── 시트 3 · 가격·수익률 조건 ────────────────────────────
const SHEET3_FIELD_MAP: Array<{ match: string; field: string; type: "krw" | "pct" | "string" }> = [
  { match: "최소채권원금", field: "min_principal", type: "krw" },
  { match: "최대채권원금", field: "max_principal", type: "krw" },
  { match: "최소매각희망가", field: "min_asking_price", type: "krw" },
  { match: "최대매각희망가", field: "max_asking_price", type: "krw" },
  { match: "최소할인율", field: "min_discount_rate", type: "pct" },
  { match: "최소예상roi", field: "min_roi_pct", type: "pct" },
  { match: "최소회수율", field: "min_recovery_rate_pct", type: "pct" },
  { match: "최대ltv", field: "max_ltv_pct", type: "pct" },
  { match: "최소ai리스크등급", field: "min_risk_grade", type: "string" },
]

function parseSheet3(sheet: XLSX.WorkSheet) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  const fields: Record<string, unknown> = {}
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue
    const label = norm(row[0])
    if (!label || label.startsWith("■") || label.startsWith("[")) continue
    for (const m of SHEET3_FIELD_MAP) {
      if (label.includes(norm(m.match))) {
        const parsed = parseValue(row[1], m.type)
        if (parsed !== null && parsed !== "") fields[m.field] = parsed
        break
      }
    }
  }
  // min_risk_grade → preferred_risk_grades (배열) 변환
  if (fields.min_risk_grade) {
    const grade = String(fields.min_risk_grade).toUpperCase()
    const ladder = ["A", "B", "C", "D"]
    const idx = ladder.indexOf(grade)
    if (idx >= 0) fields.preferred_risk_grades = ladder.slice(0, idx + 1)
  }
  return { fields, warnings: [] as string[] }
}

// ─── 시트 4 · 위험 회피 조건 ──────────────────────────────
function parseSheet4(sheet: XLSX.WorkSheet) {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
  const labelToKey = new Map<string, string>()
  for (const item of SPECIAL_CONDITIONS_V2) labelToKey.set(norm(item.label), item.key)

  const avoidConditions: string[] = []
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 3) continue
    const condLabel = trim(row[1])
    const checkVal = row[2]
    if (!condLabel) continue
    if (!isTrue(checkVal)) continue
    const key = labelToKey.get(norm(condLabel))
    if (key) avoidConditions.push(key)
  }
  return { avoidConditions, warnings: [] as string[] }
}

// ─── 라우트 핸들러 ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "file 필드를 첨부해주세요." } },
        { status: 400 },
      )
    }
    if (file.size === 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "빈 파일입니다." } },
        { status: 400 },
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "10MB 이하의 파일만 업로드 가능합니다." } },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })

    const sheetByPos = (idx: number) => {
      const name = workbook.SheetNames[idx]
      return name ? workbook.Sheets[name] : undefined
    }
    const sheet1 = workbook.Sheets["1_매수자정보"] ?? sheetByPos(0)
    const sheet2 = workbook.Sheets["2_관심지역_담보"] ?? sheetByPos(1)
    const sheet3 = workbook.Sheets["3_가격_수익률"] ?? sheetByPos(2)
    const sheet4 = workbook.Sheets["4_위험회피_조건"] ?? sheetByPos(3)

    const allWarnings: string[] = []
    const r1 = sheet1 ? parseSheet1(sheet1) : { fields: {}, warnings: ["시트 1 미발견"] }
    const r2 = sheet2 ? parseSheet2(sheet2) : { regions: [], collateralTypes: [], warnings: ["시트 2 미발견"] }
    const r3 = sheet3 ? parseSheet3(sheet3) : { fields: {}, warnings: ["시트 3 미발견"] }
    const r4 = sheet4 ? parseSheet4(sheet4) : { avoidConditions: [], warnings: ["시트 4 미발견"] }
    allWarnings.push(...r1.warnings, ...r2.warnings, ...r3.warnings, ...r4.warnings)

    return NextResponse.json({
      data: {
        // 매수자 정보 + 가격 조건 합쳐서 fields 로
        fields: { ...r1.fields, ...r3.fields },
        regions: r2.regions,
        collateralTypes: r2.collateralTypes,
        avoidConditions: r4.avoidConditions,
        warnings: allWarnings,
        source: {
          fileName: file.name,
          fileSize: file.size,
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
        },
      },
    })
  } catch (err) {
    console.error("[ocr/parse-buyer-template]", err)
    return NextResponse.json(
      { error: { code: "PARSE_ERROR", message: err instanceof Error ? err.message : "파싱 실패" } },
      { status: 500 },
    )
  }
}
