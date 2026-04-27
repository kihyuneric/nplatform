"use client"

/**
 * /exchange/demands/[id]/edit — 매수 수요 편집 페이지 (admin / 매수자 통합)
 *
 *  · `?as=admin` 쿼리 시 관리자 모드 (status / urgency / is_public 강제 변경 가능)
 *  · 본인 모드: 담보·지역·금액·할인율·설명 등 핵심 검색 조건만 편집
 *  · PATCH /api/v1/exchange/demands/[id] 로 부분 업데이트
 *  · McKinsey White Paper 톤 — paper + ink + electric blue
 */

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, AlertCircle, CheckCircle2, X } from "lucide-react"
import { MckPageShell, MckPageHeader, MckBadge } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"
import { useAuth } from "@/components/auth/auth-provider"

// ─── Types ────────────────────────────────────────────────────────────────
type DemandUrgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
type DemandStatus = "ACTIVE" | "PAUSED" | "CLOSED"

interface BuyerDemand {
  id: string
  buyer_id?: string
  buyer_name: string
  collateral_types: string[]
  regions: string[]
  min_amount: number
  max_amount: number
  target_discount_rate: number
  recovery_period: string
  investment_experience: string
  urgency: DemandUrgency
  description: string
  is_public: boolean
  status: DemandStatus
  proposal_count: number
  created_at: string
  updated_at: string
}

const COLLATERAL_OPTIONS = [
  "아파트", "오피스텔", "단독주택", "다가구", "빌라", "근린상가",
  "사옥", "공장", "토지", "복합건물", "숙박시설",
]
const REGION_OPTIONS = [
  "서울", "경기", "인천", "부산", "대구", "광주", "대전",
  "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
]
const URGENCY_OPTIONS: { value: DemandUrgency; label: string; tone: "neutral" | "blue" | "ink" | "brass" }[] = [
  { value: "LOW",    label: "여유",   tone: "neutral" },
  { value: "MEDIUM", label: "보통",   tone: "blue" },
  { value: "HIGH",   label: "급함",   tone: "brass" },
  { value: "URGENT", label: "매우급함", tone: "ink" },
]
const STATUS_OPTIONS: { value: DemandStatus; label: string }[] = [
  { value: "ACTIVE", label: "활성" },
  { value: "PAUSED", label: "일시중지" },
  { value: "CLOSED", label: "종료" },
]

export default function DemandEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const isAdminMode = searchParams?.get("as") === "admin"
  const userIsAdmin = !!user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
  const adminUI = isAdminMode && userIsAdmin

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [demand, setDemand] = useState<BuyerDemand | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // ─── Form state ────────────────────────────────────────────
  const [collateralTypes, setCollateralTypes] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [minAmount, setMinAmount] = useState(0)
  const [maxAmount, setMaxAmount] = useState(0)
  const [targetDiscount, setTargetDiscount] = useState(30)
  const [recoveryPeriod, setRecoveryPeriod] = useState("1년")
  const [investmentExp, setInvestmentExp] = useState("3년")
  const [urgency, setUrgency] = useState<DemandUrgency>("MEDIUM")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [status, setStatus] = useState<DemandStatus>("ACTIVE")

  // ─── Load demand ───────────────────────────────────────────
  useEffect(() => {
    const id = params?.id
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/v1/exchange/demands/${id}`)
        if (!r.ok) throw new Error("매수 수요를 불러오지 못했습니다")
        const d = await r.json()
        const x = d.data as BuyerDemand
        if (cancelled) return
        setDemand(x)
        setCollateralTypes(x.collateral_types ?? [])
        setRegions(x.regions ?? [])
        setMinAmount(x.min_amount ?? 0)
        setMaxAmount(x.max_amount ?? 0)
        setTargetDiscount(x.target_discount_rate ?? 30)
        setRecoveryPeriod(x.recovery_period ?? "1년")
        setInvestmentExp(x.investment_experience ?? "3년")
        setUrgency((x.urgency as DemandUrgency) ?? "MEDIUM")
        setDescription(x.description ?? "")
        setIsPublic(x.is_public ?? true)
        setStatus((x.status as DemandStatus) ?? "ACTIVE")
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "로딩 실패")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [params])

  // ─── Submit ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!demand) return
    setSaving(true)
    setErr(null)
    try {
      const body: Record<string, unknown> = {
        collateral_types: collateralTypes,
        regions,
        min_amount: minAmount,
        max_amount: maxAmount,
        target_discount_rate: targetDiscount,
        recovery_period: recoveryPeriod,
        investment_experience: investmentExp,
        urgency,
        description,
      }
      // 관리자 전용 필드
      if (adminUI) {
        body.status = status
        body.is_public = isPublic
      }
      const r = await fetch(`/api/v1/exchange/demands/${demand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const errData = await r.json().catch(() => null)
        throw new Error(errData?.error || "저장 실패")
      }
      setSaved(true)
      setTimeout(() => {
        router.push(`/exchange/demands/${demand.id}`)
      }, 700)
    } catch (e: any) {
      setErr(e?.message || "저장 중 오류")
    } finally {
      setSaving(false)
    }
  }

  // ─── Render: loading / error ────────────────────────────────
  if (loading) {
    return (
      <MckPageShell variant="tint">
        <MckPageHeader
          breadcrumbs={[{ label: "거래소", href: "/exchange" }, { label: "매수 수요", href: "/exchange/demands" }, { label: "편집" }]}
          eyebrow="BUYER DEMAND · EDIT"
          title="불러오는 중..."
          subtitle="매수 수요 정보를 불러오고 있습니다."
        />
        <div className="max-w-[1100px] mx-auto" style={{ padding: "48px 24px 80px", display: "flex", justifyContent: "center" }}>
          <Loader2 size={28} className="animate-spin" style={{ color: MCK.electric }} />
        </div>
      </MckPageShell>
    )
  }
  if (err && !demand) {
    return (
      <MckPageShell variant="tint">
        <div className="max-w-[1100px] mx-auto" style={{ padding: "48px 24px" }}>
          <div style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 32 }}>
            <h2 style={{ ...MCK_TYPE.h2, fontFamily: MCK_FONTS.serif, color: MCK.ink }}>매수 수요를 찾을 수 없습니다</h2>
            <p style={{ ...MCK_TYPE.bodySm, color: MCK.textSub, marginTop: 8 }}>{err}</p>
            <Link href="/exchange/demands" style={{ display: "inline-flex", marginTop: 16, padding: "8px 14px", background: MCK.ink, color: MCK.paper, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
              <ArrowLeft size={14} /> 목록으로
            </Link>
          </div>
        </div>
      </MckPageShell>
    )
  }

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[
          { label: "거래소", href: "/exchange" },
          { label: "매수 수요", href: "/exchange/demands" },
          { label: `수요 #${demand!.id.slice(-6).toUpperCase()}`, href: `/exchange/demands/${demand!.id}` },
          { label: "편집" },
        ]}
        eyebrow={adminUI ? "BUYER DEMAND · ADMIN EDIT" : "BUYER DEMAND · EDIT"}
        title="매수 수요 편집"
        subtitle={
          adminUI
            ? "관리자 모드 — 상태·공개 여부 등 모든 필드를 변경할 수 있습니다."
            : "검색 조건과 설명을 자유롭게 수정한 뒤 저장하세요."
        }
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {adminUI && <MckBadge tone="ink" size="md">ADMIN</MckBadge>}
            <Link href={`/exchange/demands/${demand!.id}`} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 14px", fontSize: 12, fontWeight: 700,
              background: MCK.paper, color: MCK.ink, border: `1px solid ${MCK.ink}`,
              textDecoration: "none",
            }}>
              <X size={14} /> 취소
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px", fontSize: 12, fontWeight: 800,
                background: MCK.ink, color: MCK.paper,
                border: "none", borderTop: `2px solid ${MCK.electric}`,
                cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        }
      />

      <div className="max-w-[1100px] mx-auto" style={{ padding: "32px 24px 80px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* 알림 */}
        {err && (
          <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(220, 38, 38, 0.06)", border: "1px solid rgba(220, 38, 38, 0.30)", color: "#991B1B", fontSize: 12 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{err}</span>
          </div>
        )}
        {saved && (
          <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(34, 81, 255, 0.06)", border: `1px solid ${MCK.electric}`, color: MCK.ink, fontSize: 12 }}>
            <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 2, color: MCK.electric }} />
            <span>저장되었습니다. 상세 페이지로 이동합니다…</span>
          </div>
        )}

        {/* 1. 담보 유형 */}
        <FormCard title="담보 유형" desc="복수 선택 가능. 매물 매칭에 사용됩니다.">
          <ChipGroup
            options={COLLATERAL_OPTIONS}
            selected={collateralTypes}
            onToggle={(v) => setCollateralTypes(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])}
          />
        </FormCard>

        {/* 2. 지역 */}
        <FormCard title="관심 지역" desc="시·도 단위. 복수 선택 가능.">
          <ChipGroup
            options={REGION_OPTIONS}
            selected={regions}
            onToggle={(v) => setRegions(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])}
          />
        </FormCard>

        {/* 3. 투자 금액 */}
        <FormCard title="투자 가능 금액" desc="채권 매입 예산 범위 (원 단위).">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <NumberField label="최소" value={minAmount} onChange={setMinAmount} suffix={formatKRW(minAmount)} />
            <NumberField label="최대" value={maxAmount} onChange={setMaxAmount} suffix={formatKRW(maxAmount)} />
          </div>
        </FormCard>

        {/* 4. 할인율 / 회수기간 / 경험 */}
        <FormCard title="투자 조건" desc="목표 할인율 · 회수 기간 · 경험.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <NumberField label="목표 할인율 (%)" value={targetDiscount} onChange={setTargetDiscount} suffix={`${targetDiscount}%`} />
            <TextField label="회수 기간" value={recoveryPeriod} onChange={setRecoveryPeriod} placeholder="예: 1년 / 2년" />
            <TextField label="투자 경험" value={investmentExp} onChange={setInvestmentExp} placeholder="예: 5년+" />
          </div>
        </FormCard>

        {/* 5. 긴급도 */}
        <FormCard title="긴급도" desc="매도자가 우선순위를 빠르게 인지합니다.">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {URGENCY_OPTIONS.map((opt) => {
              const active = urgency === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  style={{
                    padding: "8px 14px", fontSize: 12, fontWeight: 800,
                    background: active ? MCK.ink : MCK.paper,
                    color: active ? MCK.paper : MCK.ink,
                    border: `1px solid ${active ? MCK.ink : MCK.border}`,
                    borderTop: active ? `2px solid ${MCK.electric}` : `1px solid ${MCK.border}`,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </FormCard>

        {/* 6. 설명 */}
        <FormCard title="추가 설명" desc="매도자에게 어필할 매수 의도·조건 등.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="예: 권리관계가 깔끔한 임의매각 건 우선 검토합니다."
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: "inherit",
              color: MCK.ink,
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              resize: "vertical",
            }}
          />
        </FormCard>

        {/* 7. 관리자 전용 */}
        {adminUI && (
          <FormCard title="관리자 전용" desc="공개 여부 · 상태 강제 변경.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>상태</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DemandStatus)}
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 13,
                    background: MCK.paper, color: MCK.ink,
                    border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`,
                  }}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>공개 여부</div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", border: `1px solid ${MCK.border}`, background: MCK.paper, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  공개 (검색 결과 노출)
                </label>
              </div>
            </div>
          </FormCard>
        )}
      </div>
    </MckPageShell>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FormCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: MCK.paper,
      border: `1px solid ${MCK.border}`,
      borderTop: `2px solid ${MCK.electric}`,
      padding: 24,
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ ...MCK_TYPE.h3, fontFamily: MCK_FONTS.serif, color: MCK.ink, letterSpacing: "-0.02em" }}>
          {title}
        </h3>
        {desc && <p style={{ ...MCK_TYPE.bodySm, color: MCK.textSub, marginTop: 4 }}>{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              padding: "7px 12px", fontSize: 12, fontWeight: 700,
              background: active ? MCK.ink : MCK.paper,
              color: active ? MCK.paper : MCK.ink,
              border: `1px solid ${active ? MCK.ink : MCK.border}`,
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{
          width: "100%", padding: "10px 12px", fontSize: 13,
          color: MCK.ink, background: MCK.paper,
          border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`,
          fontVariantNumeric: "tabular-nums",
        }}
      />
      {suffix && <div style={{ ...MCK_TYPE.bodySm, color: MCK.textSub, marginTop: 4 }}>{suffix}</div>}
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 12px", fontSize: 13,
          color: MCK.ink, background: MCK.paper,
          border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`,
        }}
      />
    </div>
  )
}
