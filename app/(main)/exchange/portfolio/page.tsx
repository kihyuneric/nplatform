"use client"

/**
 * app/(main)/exchange/portfolio/page.tsx
 *
 * 포트폴리오 일괄매각 — 다건 NPL 패키지 등록.
 *
 * 흐름:
 *   1) Excel 템플릿 다운로드 (NPLatform_포트폴리오_등록_템플릿.xlsx)
 *   2) Excel 업로드 → 클라이언트 파싱 (xlsx)
 *   3) 검증 결과 표시 (행별 오류·경고)
 *   4) 일괄 매물 등록 (각 행 → /api/v1/exchange/listings POST · Promise.allSettled)
 *   5) 성공·실패 요약
 */

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Upload, Download, FileText, AlertTriangle, CheckCircle2, Loader2, Trash2,
} from "lucide-react"
import { MckPageShell, MckPageHeader, MckKpiGrid } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"

interface PortfolioRow {
  rowIndex: number
  institution: string
  collateralType: string
  region: string
  loanPrincipal: number
  unpaidInterest: number
  appraisalValue: number
  askingPrice: number
  listingType: 'NPL' | 'REO' | 'UPL'
  status: 'PENDING' | 'VALID' | 'INVALID' | 'UPLOADED' | 'FAILED'
  errors: string[]
  warnings: string[]
  /** 업로드 후 매물 ID */
  uploadedId?: string
  uploadError?: string
}

export default function PortfolioBulkUploadPage() {
  const router = useRouter()
  const [rows, setRows] = useState<PortfolioRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ─── Excel 파싱 ──────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    try {
      const xlsx = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const workbook = xlsx.read(buffer, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

      const parsed = json.map((row, i) => parseRow(row, i + 2))  // header 제외, 1-index
      setRows(parsed)
    } catch (err) {
      alert(`파일 파싱 실패: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [])

  // ─── 일괄 업로드 ─────────────────────────────────────
  const handleUploadAll = useCallback(async () => {
    const valid = rows.filter(r => r.status === 'VALID')
    if (valid.length === 0) {
      alert('유효한 행이 없습니다.')
      return
    }
    if (!confirm(`${valid.length}건을 일괄 등록합니다. 계속하시겠습니까?`)) return

    setUploading(true)

    const results = await Promise.allSettled(
      valid.map(row => uploadRow(row))
    )

    setRows(prev => prev.map(r => {
      if (r.status !== 'VALID') return r
      const idx = valid.findIndex(v => v.rowIndex === r.rowIndex)
      if (idx < 0) return r
      const res = results[idx]
      if (res.status === 'fulfilled') {
        return { ...r, status: 'UPLOADED', uploadedId: res.value.id }
      } else {
        return { ...r, status: 'FAILED', uploadError: res.reason?.message ?? 'Unknown' }
      }
    }))

    setUploading(false)
  }, [rows])

  const handleClearAll = useCallback(() => {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) setRows([])
  }, [])

  // ─── KPI ─────────────────────────────────────────────
  const stats = {
    total: rows.length,
    valid: rows.filter(r => r.status === 'VALID').length,
    invalid: rows.filter(r => r.status === 'INVALID').length,
    uploaded: rows.filter(r => r.status === 'UPLOADED').length,
    failed: rows.filter(r => r.status === 'FAILED').length,
  }
  const totalPrincipal = rows.reduce((acc, r) => acc + r.loanPrincipal, 0)
  const totalAsking = rows.reduce((acc, r) => acc + r.askingPrice, 0)

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "거래소", href: "/exchange" },
          { label: "포트폴리오 일괄매각" },
        ]}
        eyebrow="EXCHANGE · 포트폴리오 일괄매각"
        title="다건 NPL 일괄 등록"
        subtitle="Excel 템플릿으로 여러 NPL 매물을 한 번에 등록합니다."
      />

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* KPI Strip */}
        <div style={{ marginBottom: 32 }}>
          <MckKpiGrid
            variant="dark"
            items={[
              { label: "총 행", value: `${stats.total}`, hint: "Excel 파싱 결과" },
              { label: "검증 통과", value: `${stats.valid}`, hint: "등록 가능" },
              { label: "오류", value: `${stats.invalid}`, hint: "수정 필요" },
              { label: "총 대출원금", value: formatKRW(totalPrincipal), hint: `희망 ${formatKRW(totalAsking)}` },
            ]}
          />
        </div>

        {/* Actions */}
        <div style={{
          background: MCK.paper, border: `1px solid ${MCK.border}`,
          borderTop: `2px solid ${MCK.electric}`,
          padding: "24px", marginBottom: 24,
          display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px",
              background: MCK.ink, color: MCK.paper,
              border: "none", borderTop: `2px solid ${MCK.electric}`,
              fontSize: 13, fontWeight: 800, cursor: parsing ? "not-allowed" : "pointer",
              opacity: parsing ? 0.6 : 1,
            }}
          >
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Excel 업로드
          </button>

          <Link
            href="/templates/NPLatform_포트폴리오_등록_템플릿.xlsx"
            download
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 16px",
              background: MCK.paperTint, color: MCK.electricDark,
              border: `1px solid ${MCK.electric}`,
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}
          >
            <Download size={13} /> 템플릿 다운로드
          </Link>

          {rows.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={uploading || stats.valid === 0}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 18px",
                  background: stats.valid > 0 ? "#10B981" : MCK.border,
                  color: stats.valid > 0 ? "#FFFFFF" : MCK.textMuted,
                  border: "none",
                  fontSize: 13, fontWeight: 800,
                  cursor: uploading || stats.valid === 0 ? "not-allowed" : "pointer",
                  marginLeft: "auto",
                }}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {stats.valid}건 일괄 등록
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={uploading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 14px",
                  background: MCK.paper, color: MCK.greyDark,
                  border: `1px solid ${MCK.border}`,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> 초기화
              </button>
            </>
          )}
        </div>

        {/* Empty state */}
        {rows.length === 0 && (
          <div style={{
            background: MCK.paper, border: `1px dashed ${MCK.border}`,
            padding: "60px 32px", textAlign: "center",
          }}>
            <FileText size={32} style={{ color: MCK.textMuted, margin: "0 auto 12px" }} />
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>BULK UPLOAD</div>
            <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.ink, marginBottom: 8 }}>
              Excel 템플릿으로 시작하세요
            </h3>
            <p style={{ fontSize: 13, color: MCK.textSub, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              템플릿 다운로드 → 행마다 NPL 매물 정보 입력 → Excel 업로드.
              검증 통과한 행만 일괄 등록됩니다 (최대 200건/회).
            </p>
          </div>
        )}

        {/* Rows table */}
        {rows.length > 0 && (
          <div style={{
            background: MCK.paper, border: `1px solid ${MCK.border}`,
            overflow: "auto",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ background: MCK.inkDeep, color: MCK.paper }}>
                <tr>
                  <th style={cellStyle}>#</th>
                  <th style={cellStyle}>상태</th>
                  <th style={cellStyle}>기관</th>
                  <th style={cellStyle}>담보·지역</th>
                  <th style={cellStyle}>대출원금</th>
                  <th style={cellStyle}>감정가</th>
                  <th style={cellStyle}>희망매각가</th>
                  <th style={cellStyle}>유형</th>
                  <th style={cellStyle}>비고</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowIndex} style={{ borderBottom: `1px solid ${MCK.border}` }}>
                    <td style={cellStyle}>{r.rowIndex}</td>
                    <td style={cellStyle}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={cellStyle}>{r.institution || "—"}</td>
                    <td style={cellStyle}>{r.collateralType} · {r.region}</td>
                    <td style={{ ...cellStyle, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatKRW(r.loanPrincipal)}</td>
                    <td style={{ ...cellStyle, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatKRW(r.appraisalValue)}</td>
                    <td style={{ ...cellStyle, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatKRW(r.askingPrice)}</td>
                    <td style={cellStyle}>{r.listingType}</td>
                    <td style={cellStyle}>
                      {r.errors.length > 0 && (
                        <div style={{ color: "#DC2626", display: "flex", alignItems: "center", gap: 4 }}>
                          <AlertTriangle size={11} />
                          {r.errors[0]}
                        </div>
                      )}
                      {r.uploadedId && (
                        <Link href={`/exchange/${r.uploadedId}`} style={{ color: MCK.electricDark, fontWeight: 700 }}>
                          상세 보기 →
                        </Link>
                      )}
                      {r.uploadError && (
                        <div style={{ color: "#DC2626" }}>업로드 실패: {r.uploadError}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </MckPageShell>
  )
}

// ─── Helpers ────────────────────────────────────────────────

const cellStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  borderBottom: `1px solid ${MCK.border}`,
  letterSpacing: "-0.005em",
}

function StatusBadge({ status }: { status: PortfolioRow['status'] }) {
  const config = {
    PENDING:  { bg: "#F3F4F6", color: "#4B5563", label: "대기" },
    VALID:    { bg: "#DBEAFE", color: "#1D4ED8", label: "검증완료" },
    INVALID:  { bg: "#FEE2E2", color: "#B91C1C", label: "오류" },
    UPLOADED: { bg: "#D1FAE5", color: "#065F46", label: "등록완료" },
    FAILED:   { bg: "#FEE2E2", color: "#B91C1C", label: "등록실패" },
  }[status]
  return (
    <span style={{
      padding: "3px 8px", fontSize: 10, fontWeight: 800,
      background: config.bg, color: config.color,
      letterSpacing: "0.04em",
    }}>
      {config.label}
    </span>
  )
}

/** Excel row → PortfolioRow 변환 + 검증 */
function parseRow(raw: Record<string, unknown>, rowIndex: number): PortfolioRow {
  const errors: string[] = []
  const warnings: string[] = []

  const institution = String(raw['기관명'] ?? raw['institution'] ?? '').trim()
  const collateralType = String(raw['담보 유형'] ?? raw['collateral_type'] ?? '').trim()
  const region = String(raw['지역'] ?? raw['region'] ?? '').trim()
  const loanPrincipal = Number(raw['대출원금'] ?? raw['loan_principal'] ?? 0)
  const unpaidInterest = Number(raw['미수이자'] ?? raw['unpaid_interest'] ?? 0)
  const appraisalValue = Number(raw['감정가'] ?? raw['appraisal_value'] ?? 0)
  const askingPrice = Number(raw['희망매각가'] ?? raw['asking_price'] ?? 0)
  const listingType = String(raw['유형'] ?? raw['listing_type'] ?? 'NPL').trim().toUpperCase()

  if (!institution) errors.push('기관명 누락')
  if (!collateralType) errors.push('담보 유형 누락')
  if (!region) errors.push('지역 누락')
  if (loanPrincipal < 1_000_000) errors.push('대출원금 100만원 이상 필요')
  if (askingPrice <= 0) errors.push('희망매각가 입력 필요')
  if (askingPrice > loanPrincipal * 1.5) warnings.push('희망가가 원금의 150% 초과')
  if (!['NPL', 'REO', 'UPL'].includes(listingType)) errors.push('유형은 NPL/REO/UPL 중 하나')

  return {
    rowIndex,
    institution,
    collateralType,
    region,
    loanPrincipal,
    unpaidInterest,
    appraisalValue,
    askingPrice,
    listingType: (listingType as PortfolioRow['listingType']) ?? 'NPL',
    status: errors.length > 0 ? 'INVALID' : 'VALID',
    errors,
    warnings,
  }
}

/** 단일 행 업로드 — /api/v1/exchange/listings POST */
async function uploadRow(row: PortfolioRow): Promise<{ id: string }> {
  const res = await fetch('/api/v1/exchange/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institution_name: row.institution,
      collateral_type: row.collateralType,
      location: row.region,
      address: row.region,
      principal_amount: row.loanPrincipal,
      loan_principal: row.loanPrincipal,
      unpaid_interest: row.unpaidInterest,
      claim_balance: row.loanPrincipal + row.unpaidInterest,
      title: `${row.region} ${row.collateralType} 채권`,
      listing_type: row.listingType,
      appraisal_value: row.appraisalValue,
      asking_price_min: row.askingPrice,
      asking_price_max: row.askingPrice,
      seller_fee_rate: 0.007,
      additional_addresses: [],
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json()
  return { id: data.data?.id ?? data.id ?? 'unknown' }
}
