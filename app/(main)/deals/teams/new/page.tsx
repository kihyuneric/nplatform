"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users, ArrowLeft, ArrowRight, Lock, Globe,
  CheckCircle2, Loader2, Building2, Search,
  MapPin, Crown, Sparkles,
} from "lucide-react"
import Link from "next/link"

/* ─── 타입 ─────────────────────────────────────────────────── */
interface ListingPreview {
  id: string
  title: string
  collateral_type: string
  address: string
  principal_amount: number
  discount_rate: number
  risk_grade: string
  institution: string
}

interface TeamForm {
  name: string
  description: string
  investment_type: string
  target_amount: string
  min_per_member: string
  max_per_member: string
  max_members: string
  is_private: boolean
  leader_role: string
  listing_id: string
}

/* ─── 상수 ─────────────────────────────────────────────────── */
const STEPS = ["매물 선택", "기본 설정", "투자 계획", "확인 및 생성"]
const INVEST_TYPES = ["NPL채권", "아파트", "상가", "오피스", "공장/창고", "토지", "혼합"]

const GRADE_COLOR: Record<string, string> = {
  A: "#10B981", "B+": "#14B8A6", B: "#3B82F6", C: "#F59E0B", D: "#EF4444", F: "#6B7280",
}

const SAMPLE_LISTINGS: ListingPreview[] = [
  { id: "lst-301", title: "강남구 역삼동 오피스빌딩 NPL", collateral_type: "오피스", address: "서울 강남구 역삼동 123", principal_amount: 8_200_000_000, discount_rate: 31.7, risk_grade: "B", institution: "국민은행" },
  { id: "lst-302", title: "수원 영통구 아파트 단지 NPL", collateral_type: "아파트", address: "경기 수원시 영통구 매탄동 44", principal_amount: 3_400_000_000, discount_rate: 34.6, risk_grade: "B+", institution: "우리은행" },
  { id: "lst-303", title: "부산 해운대 근린상가 NPL", collateral_type: "상가", address: "부산 해운대구 우동 90-5", principal_amount: 2_100_000_000, discount_rate: 44.7, risk_grade: "C", institution: "하나은행" },
  { id: "lst-304", title: "인천 남동구 물류창고 NPL", collateral_type: "공장/창고", address: "인천 남동구 논현동 755", principal_amount: 5_600_000_000, discount_rate: 29.1, risk_grade: "A", institution: "신한은행" },
  { id: "lst-305", title: "마포구 공덕동 근린상가 NPL", collateral_type: "상가", address: "서울 마포구 공덕동 256", principal_amount: 1_850_000_000, discount_rate: 31.5, risk_grade: "B", institution: "기업은행" },
]

const fmt = (n: number) =>
  n >= 100_000_000 ? `${(n / 100_000_000).toFixed(0)}억` : n >= 10_000 ? `${(n / 10_000).toFixed(0)}만` : n.toLocaleString()

/* ─── 페이지 ─────────────────────────────────────────────────*/
export default function NewTeamPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [listings, setListings] = useState<ListingPreview[]>(SAMPLE_LISTINGS)
  const [listingSearch, setListingSearch] = useState("")
  const [loadingListings, setLoadingListings] = useState(false)

  const [form, setForm] = useState<TeamForm>({
    name: "", description: "", investment_type: "NPL채권",
    target_amount: "", min_per_member: "", max_per_member: "",
    max_members: "5", is_private: false, leader_role: "", listing_id: "",
  })

  const update = (key: keyof TeamForm, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  /* 매물 목록 로드 */
  useEffect(() => {
    setLoadingListings(true)
    fetch("/api/v1/exchange/listings?limit=20&status=ACTIVE")
      .then(r => r.json())
      .then(res => { if ((res.data ?? []).length > 0) setListings(res.data) })
      .catch(() => {})
      .finally(() => setLoadingListings(false))
  }, [])

  /* 매물 선택 시 이름 자동 채우기 */
  useEffect(() => {
    if (form.listing_id && !form.name) {
      const l = listings.find(x => x.id === form.listing_id)
      if (l) update("name", `${l.title} 공동투자팀`)
    }
  }, [form.listing_id])

  const filteredListings = listings.filter(l =>
    !listingSearch ||
    l.title.includes(listingSearch) ||
    l.address.includes(listingSearch) ||
    l.collateral_type.includes(listingSearch)
  )

  const selectedListing = listings.find(l => l.id === form.listing_id)

  const canNext = () => {
    if (step === 0) return true // 매물 선택 선택적
    if (step === 1) return form.name.trim().length >= 3
    if (step === 2) return Number(form.target_amount) >= 10_000_000
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          target_amount: Number(form.target_amount),
          min_per_member: Number(form.min_per_member) || undefined,
          max_per_member: Number(form.max_per_member) || undefined,
          max_members: Number(form.max_members),
          listing_id: form.listing_id || undefined,
        }),
      })
      const data = await res.json()
      router.push(`/deals/teams/${data.id ?? data.data?.id ?? "t1"}`)
    } catch {
      router.push("/deals/teams")
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#10B981]/40 focus:border-[#10B981]/50 transition-all"
  const labelCls = "block text-xs font-semibold text-[#8BAFD1] mb-1.5"

  return (
    <div className="min-h-screen bg-[#060E1A]">

      {/* Header */}
      <div className="bg-[#0D1F38] px-6 py-7 border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/deals/teams" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wider mb-0.5">
              팀투자
            </p>
            <h1 className="text-xl font-extrabold text-white">팀투자 딜 개설하기</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-1 mb-7">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  i < step ? "bg-emerald-500 text-white"
                  : i === step ? "bg-[#10B981] text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : "bg-white/10 text-white/30"
                }`}>
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block whitespace-nowrap ${
                  i === step ? "font-semibold text-white" : i < step ? "text-emerald-400" : "text-white/25"
                }`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < step ? "bg-emerald-500/50" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* 폼 카드 */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.07] p-6">

          {/* ── Step 0: 매물 선택 ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[#3B82F6]" />
                <h2 className="text-sm font-bold text-white">거래소 매물 연동 (선택)</h2>
              </div>
              <p className="text-xs text-slate-500">팀투자의 대상 NPL 매물을 거래소에서 선택하세요. 나중에 설정할 수도 있습니다.</p>

              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="매물명, 주소, 담보 유형 검색..."
                  value={listingSearch}
                  onChange={e => setListingSearch(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>

              {loadingListings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {/* 선택 안 함 옵션 */}
                  <button
                    onClick={() => update("listing_id", "")}
                    className={`w-full text-left rounded-xl p-3 border transition-all text-sm ${
                      !form.listing_id
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!form.listing_id ? "border-[#10B981] bg-[#10B981]" : "border-slate-600"}`}>
                        {!form.listing_id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                      매물 나중에 선택
                    </div>
                  </button>

                  {filteredListings.map(l => (
                    <button
                      key={l.id}
                      onClick={() => update("listing_id", l.id)}
                      className={`w-full text-left rounded-xl p-4 border transition-all ${
                        form.listing_id === l.id
                          ? "border-[#10B981]/50 bg-[#10B981]/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          form.listing_id === l.id ? "border-[#10B981] bg-[#10B981]" : "border-slate-600"
                        }`}>
                          {form.listing_id === l.id && <CheckCircle2 className="w-3 h-3 text-black" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${GRADE_COLOR[l.risk_grade] ?? "#6B7280"}20`, color: GRADE_COLOR[l.risk_grade] ?? "#6B7280" }}>
                              {l.risk_grade}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "#3B82F620", color: "#93C5FD" }}>
                              {l.collateral_type}
                            </span>
                          </div>
                          <p className={`font-semibold text-sm ${form.listing_id === l.id ? "text-white" : "text-slate-300"}`}>{l.title}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />{l.address}
                          </div>
                          <div className="flex gap-4 mt-1.5 text-xs">
                            <span className="text-slate-500">채권 <span className="text-white font-semibold">{fmt(l.principal_amount)}원</span></span>
                            <span className="text-slate-500">할인율 <span className="text-[#10B981] font-semibold">{l.discount_rate}%</span></span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedListing && (
                <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#10B98112", border: "1px solid #10B98130" }}>
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <p className="text-xs text-[#10B981] font-semibold truncate">{selectedListing.title}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: 기본 설정 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">리더 투자사 기본 설정</h2>
              </div>

              {selectedListing && (
                <div className="rounded-xl p-3 flex items-center gap-2 mb-4" style={{ background: "#3B82F612", border: "1px solid #3B82F625" }}>
                  <Building2 className="w-4 h-4 text-[#3B82F6] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500">연동 매물</p>
                    <p className="text-xs text-slate-300 font-semibold truncate">{selectedListing.title}</p>
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>팀 이름 *</label>
                <input placeholder="예: 강남 오피스 NPL 공동투자팀" value={form.name}
                  onChange={e => update("name", e.target.value)} className={inputCls} />
                <p className="text-[11px] text-white/25 mt-1">최소 3자 이상</p>
              </div>

              <div>
                <label className={labelCls}>투자 전략 소개</label>
                <textarea placeholder="투자 목적, 전략, 기대 수익률, 리더 역할 등을 간략히 설명하세요"
                  value={form.description} onChange={e => update("description", e.target.value)}
                  rows={3} className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className={labelCls}>리더 역할 정의</label>
                <input placeholder="예: 물건 분석·실사·협상 담당" value={form.leader_role}
                  onChange={e => update("leader_role", e.target.value)} className={inputCls} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer"
                onClick={() => update("is_private", !form.is_private)}>
                <div className="flex items-center gap-3">
                  {form.is_private ? <Lock className="w-4 h-4 text-white/40" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                  <div>
                    <p className="text-sm font-semibold text-white">{form.is_private ? "비공개 팀" : "공개 팀"}</p>
                    <p className="text-xs text-white/35">{form.is_private ? "초대된 투자사만 참여" : "공동 투자사 공개 모집"}</p>
                  </div>
                </div>
                <div className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${form.is_private ? "bg-[#10B981]" : "bg-white/15"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.is_private ? "translate-x-6" : "translate-x-1"}`} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: 투자 계획 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#10B981]" />
                <h2 className="text-sm font-bold text-white">투자 조건 설정</h2>
              </div>

              <div>
                <label className={labelCls}>투자 유형</label>
                <div className="grid grid-cols-4 gap-2">
                  {INVEST_TYPES.map(t => (
                    <button key={t} onClick={() => update("investment_type", t)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        form.investment_type === t
                          ? "bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]"
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>총 목표 금액 (원) *</label>
                <input type="number" placeholder="500000000" value={form.target_amount}
                  onChange={e => update("target_amount", e.target.value)} className={inputCls} />
                <p className="text-[11px] text-white/35 mt-1">
                  {Number(form.target_amount) > 0
                    ? `≈ ${(Number(form.target_amount) / 100_000_000).toFixed(2)}억원`
                    : "최소 1,000만원 이상"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>1사 최소 투자 (원)</label>
                  <input type="number" placeholder="100000000" value={form.min_per_member}
                    onChange={e => update("min_per_member", e.target.value)} className={inputCls} />
                  {Number(form.min_per_member) > 0 && (
                    <p className="text-[11px] text-white/35 mt-1">≈ {fmt(Number(form.min_per_member))}원</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>1사 최대 투자 (원)</label>
                  <input type="number" placeholder="2000000000" value={form.max_per_member}
                    onChange={e => update("max_per_member", e.target.value)} className={inputCls} />
                  {Number(form.max_per_member) > 0 && (
                    <p className="text-[11px] text-white/35 mt-1">≈ {fmt(Number(form.max_per_member))}원</p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelCls}>최대 공동 투자사 수 (2~10)</label>
                <input type="number" min="2" max="10" value={form.max_members}
                  onChange={e => update("max_members", e.target.value)} className={`${inputCls} max-w-xs`} />
              </div>
            </div>
          )}

          {/* ── Step 3: 최종 확인 ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-1">팀투자 딜 최종 확인</h2>
              <div className="bg-[#0D1F38] rounded-xl border border-white/[0.06] p-5 space-y-3">
                {[
                  { label: "연동 매물", value: selectedListing?.title ?? "미선택" },
                  { label: "팀 이름", value: form.name || "—" },
                  { label: "투자 유형", value: form.investment_type },
                  { label: "총 목표 금액", value: Number(form.target_amount) > 0 ? `${fmt(Number(form.target_amount))}원` : "—" },
                  { label: "1사 투자 범위", value: form.min_per_member && form.max_per_member ? `${fmt(Number(form.min_per_member))} ~ ${fmt(Number(form.max_per_member))}원` : "—" },
                  { label: "최대 참여사", value: `${form.max_members}개사` },
                  { label: "공개 설정", value: form.is_private ? "비공개" : "공개 모집" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                    <span className="text-white/40">{row.label}</span>
                    <span className="font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 네비게이션 */}
          <div className="flex justify-between mt-7 pt-5 border-t border-white/[0.06]">
            <button
              onClick={() => step > 0 ? setStep(step - 1) : router.push("/deals/teams")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? "취소" : "이전"}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canNext()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                style={{ background: canNext() ? "#10B981" : "#1e293b", color: canNext() ? "#000" : "#64748b" }}
              >
                다음 단계 <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                style={{ background: "#10B981", color: "#000" }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                팀 개설하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
