"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronRight, Upload, Sparkles, FileText, Home, AlertCircle, Building2 } from "lucide-react"

const C = {
  bg0:"#030810", bg1:"#050D1A", bg2:"#080F1E", bg3:"#0A1628", bg4:"#0F1F35",
  em:"#10B981", emL:"#34D399", blue:"#3B82F6", blueL:"#60A5FA",
  amber:"#F59E0B", amber2:"#FCD34D", purple:"#A855F7", rose:"#F43F5E", teal:"#14B8A6",
  l0:"#FFFFFF", l1:"#F8FAFC", l2:"#F1F5F9", l3:"#E2E8F0",
  lt1:"#0F172A", lt2:"#334155", lt3:"#64748B", lt4:"#94A3B8",
}

type Step = 1 | 2 | 3 | 4
type AssetType = "아파트" | "상가" | "토지" | "기타"
type ListingMode = "" | "npl" | "realestate"
type DealType = "매매" | "전세" | "월세"
type RealEstateType = "아파트" | "오피스텔" | "상가" | "토지" | "단독주택" | "빌라"

interface NplFormState {
  assetType: AssetType | ""
  principal: string
  caseNumber: string
  auctionDate: string
  address: string
  appraisalValue: string
  seniorClaim: string
  buildingArea: string
  docs: { reg: File | null; appraisal: File | null; notice: File | null }
  requestAiGrade: boolean
}

const NPL_INITIAL: NplFormState = {
  assetType: "",
  principal: "",
  caseNumber: "",
  auctionDate: "",
  address: "",
  appraisalValue: "",
  seniorClaim: "",
  buildingArea: "",
  docs: { reg: null, appraisal: null, notice: null },
  requestAiGrade: false,
}

interface RealEstateFormState {
  realEstateType: RealEstateType | ""
  dealType: DealType
  address: string
  price: string
  monthlyRent: string
  area: string
  floor: string
  totalFloors: string
  direction: string
  availableDate: string
  maintenanceFee: string
  description: string
  photos: File[]
}

const RE_INITIAL: RealEstateFormState = {
  realEstateType: "",
  dealType: "매매",
  address: "",
  price: "",
  monthlyRent: "",
  area: "",
  floor: "",
  totalFloors: "",
  direction: "",
  availableDate: "",
  maintenanceFee: "",
  description: "",
  photos: [],
}

const NPL_STEPS = ["기본정보", "담보정보", "서류첨부", "검토 및 제출"]
const RE_STEPS = ["기본정보", "상세정보", "사진첨부", "검토 및 제출"]
const NPL_ASSET_TYPES: AssetType[] = ["아파트", "상가", "토지", "기타"]
const RE_TYPES: RealEstateType[] = ["아파트", "오피스텔", "상가", "토지", "단독주택", "빌라"]
const DEAL_TYPES: DealType[] = ["매매", "전세", "월세"]
const DIRECTIONS = ["동향", "서향", "남향", "북향", "남동향", "남서향"]

const REQUIRED_DOCS = [
  { icon: "📋", label: "등기부등본", desc: "최근 3개월 이내" },
  { icon: "📊", label: "감정평가서", desc: "공인 감정 기관 발급" },
  { icon: "⚖️", label: "경매 공고문", desc: "법원 발급" },
]

function formatKRW(v: string) {
  const n = Number(v.replace(/[^0-9]/g, ""))
  if (!n) return ""
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`
  if (n >= 10000) return `${Math.floor(n / 10000)}만원`
  return `${n.toLocaleString()}원`
}

// ─── Step Progress (Stripe style) ─────────────────────────────────────────────

function StepProgress({ steps, step }: { steps: string[]; step: Step }) {
  return (
    <div className="flex items-center w-full">
      {steps.map((label, i) => {
        const n = (i + 1) as Step
        const active = step === n
        const done = step > n
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  backgroundColor: done ? C.em : active ? C.blue : "transparent",
                  border: done ? `2px solid ${C.em}` : active ? `2px solid ${C.blue}` : `2px solid rgba(255,255,255,0.15)`,
                  color: done || active ? C.l0 : "rgba(255,255,255,0.35)",
                  boxShadow: active ? `0 0 0 4px rgba(59,130,246,0.2)` : done ? `0 0 0 4px rgba(16,185,129,0.15)` : "none",
                }}
              >
                {done ? <Check className="w-4 h-4" /> : n}
              </div>
              <span
                className="text-xs whitespace-nowrap font-medium transition-all duration-300"
                style={{ color: active ? C.blueL : done ? C.emL : "rgba(255,255,255,0.35)" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-3 mb-6 transition-all duration-500"
                style={{ backgroundColor: done ? C.em : "rgba(255,255,255,0.1)" }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold" style={{ color: C.lt2 }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: C.lt4 }}>{hint}</p>}
    </div>
  )
}

// ─── Input base styles ─────────────────────────────────────────────────────────

const inputCls = `w-full h-12 px-4 rounded-xl border text-sm font-medium outline-none transition-all duration-200
  focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500`
const inputStyle = {
  backgroundColor: C.l1,
  borderColor: C.l3,
  color: C.lt1,
}

// ─── Chip selector ────────────────────────────────────────────────────────────

function ChipGroup<T extends string>({
  items, value, onChange, cols = 4,
  color = "blue"
}: {
  items: T[]
  value: T | ""
  onChange: (v: T) => void
  cols?: number
  color?: "blue" | "emerald"
}) {
  const activeStyle = color === "emerald"
    ? { backgroundColor: "#ECFDF5", borderColor: C.em, color: "#065F46" }
    : { backgroundColor: "#EFF6FF", borderColor: C.blue, color: "#1D4ED8" }
  const inactiveStyle = { backgroundColor: C.l0, borderColor: C.l3, color: C.lt2 }
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className="h-11 rounded-xl border text-sm font-semibold transition-all duration-200 hover:shadow-sm"
          style={value === item ? activeStyle : inactiveStyle}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SellWizardPage() {
  const router = useRouter()
  const [mode, setMode] = useState<ListingMode>("")
  const [step, setStep] = useState<Step>(1)
  const [npl, setNpl] = useState<NplFormState>(NPL_INITIAL)
  const [re, setRe] = useState<RealEstateFormState>(RE_INITIAL)
  const [submitted, setSubmitted] = useState(false)

  const setN = (key: keyof NplFormState, value: any) =>
    setNpl((f) => ({ ...f, [key]: value }))
  const setNDoc = (key: keyof NplFormState["docs"], file: File | null) =>
    setNpl((f) => ({ ...f, docs: { ...f.docs, [key]: file } }))
  const setR = (key: keyof RealEstateFormState, value: any) =>
    setRe((f) => ({ ...f, [key]: value }))

  const canNext = () => {
    if (mode === "npl") {
      if (step === 1) return !!npl.assetType && !!npl.principal && !!npl.caseNumber
      if (step === 2) return !!npl.address && !!npl.appraisalValue
      return true
    }
    if (mode === "realestate") {
      if (step === 1) return !!re.realEstateType && !!re.address && !!re.price
      if (step === 2) return !!re.area
      return true
    }
    return false
  }

  const handleSubmit = () => setSubmitted(true)

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: C.l2 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "#ECFDF5", border: `2px solid ${C.em}` }}
          >
            <Check className="w-9 h-9" style={{ color: C.em }} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: C.lt1 }}>
            {mode === "npl" ? "매물 등록 완료" : "부동산 매물 등록 완료"}
          </h2>
          <p className="text-sm mb-8" style={{ color: C.lt3 }}>
            {mode === "npl"
              ? "검토 후 3영업일 내 결과를 안내드립니다."
              : "등록된 매물은 즉시 게시됩니다."}
          </p>
          <button
            onClick={() => router.push("/exchange")}
            className="h-12 px-8 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${C.em}, ${C.teal})` }}
          >
            거래소로 돌아가기
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Mode selector ──
  if (!mode) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: C.l2 }}>
        {/* Dark hero */}
        <div style={{ backgroundColor: C.bg1 }}>
          <div className="max-w-4xl mx-auto px-6 pt-14 pb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ backgroundColor: "rgba(59,130,246,0.15)", color: C.blueL, border: "1px solid rgba(59,130,246,0.3)" }}>
              NPL Exchange
            </div>
            <h1 className="text-4xl font-black mb-3" style={{ color: C.l0 }}>
              매물 등록
            </h1>
            <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
              어떤 유형의 매물을 등록하시겠습니까?
            </p>
          </div>
        </div>

        {/* Mode cards */}
        <div className="max-w-4xl mx-auto px-6 -mt-2 pb-16">
          <div className="grid sm:grid-cols-2 gap-5 pt-8">
            {/* NPL */}
            <motion.button
              whileHover={{ y: -3, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
              transition={{ duration: 0.2 }}
              onClick={() => setMode("npl")}
              className="text-left rounded-2xl p-8 transition-all"
              style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <FileText className="w-7 h-7" style={{ color: C.blue }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: C.lt1 }}>NPL 채권 매각</h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: C.lt3 }}>
                부실채권(NPL)을 기관·투자자에게 직접 매각합니다.<br />
                경매 진행 중인 담보물 포함.
              </p>
              <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.blue }}>
                등록하기 <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>

            {/* 부동산 */}
            <motion.button
              whileHover={{ y: -3, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
              transition={{ duration: 0.2 }}
              onClick={() => setMode("realestate")}
              className="text-left rounded-2xl p-8 transition-all"
              style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                <Home className="w-7 h-7" style={{ color: C.em }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: C.lt1 }}>부동산 직거래</h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: C.lt3 }}>
                아파트·상가·토지 등 부동산 매물을 직접 등록합니다.<br />
                매매·전세·월세 모두 가능.
              </p>
              <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.em }}>
                등록하기 <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  const steps = mode === "npl" ? NPL_STEPS : RE_STEPS
  const isNpl = mode === "npl"

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.l2 }}>

      {/* Dark Hero */}
      <div style={{ backgroundColor: C.bg1 }}>
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                style={{
                  backgroundColor: isNpl ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
                  color: isNpl ? C.blueL : C.emL,
                  border: `1px solid ${isNpl ? "rgba(59,130,246,0.3)" : "rgba(16,185,129,0.3)"}`,
                }}>
                {isNpl ? "NPL 채권 매각" : "부동산 직거래"}
              </div>
              <h1 className="text-3xl font-black" style={{ color: C.l0 }}>매물 등록</h1>
            </div>
            <button
              onClick={() => { setMode(""); setStep(1) }}
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              ← 유형 변경
            </button>
          </div>

          {/* Step Progress */}
          <StepProgress steps={steps} step={step} />
        </div>
      </div>

      {/* Light Form Area */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">

          {/* Main form */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >

                {/* ── NPL Steps ── */}
                {isNpl && (
                  <>
                    {step === 1 && (
                      <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                        <div>
                          <h2 className="text-xl font-bold mb-1" style={{ color: C.lt1 }}>기본 정보</h2>
                          <p className="text-sm" style={{ color: C.lt3 }}>채권의 기본 정보를 입력하세요</p>
                        </div>
                        <Field label="담보물 유형">
                          <ChipGroup items={NPL_ASSET_TYPES} value={npl.assetType} onChange={(v) => setN("assetType", v)} cols={4} color="blue" />
                        </Field>
                        <Field label="채권 원금" hint={npl.principal ? `= ${formatKRW(npl.principal)}` : undefined}>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: C.lt4 }}>₩</span>
                            <input
                              type="text"
                              placeholder="500,000,000"
                              value={npl.principal}
                              onChange={(e) => setN("principal", e.target.value.replace(/[^0-9]/g, ""))}
                              className={inputCls + " pl-9"}
                              style={inputStyle}
                            />
                          </div>
                        </Field>
                        <Field label="경매 사건 번호">
                          <input
                            type="text"
                            placeholder="예: 2024타경12345"
                            value={npl.caseNumber}
                            onChange={(e) => setN("caseNumber", e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="경매 기일">
                          <input
                            type="date"
                            value={npl.auctionDate}
                            onChange={(e) => setN("auctionDate", e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </Field>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                        <div>
                          <h2 className="text-xl font-bold mb-1" style={{ color: C.lt1 }}>담보물 정보</h2>
                          <p className="text-sm" style={{ color: C.lt3 }}>담보물의 위치와 가치 정보를 입력하세요</p>
                        </div>
                        <Field label="소재지 *">
                          <input
                            type="text"
                            placeholder="예: 서울시 강남구 역삼동 123-4"
                            value={npl.address}
                            onChange={(e) => setN("address", e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="감정 평가액 *" hint={npl.appraisalValue ? formatKRW(npl.appraisalValue) : undefined}>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: C.lt4 }}>₩</span>
                              <input
                                type="text"
                                placeholder="0"
                                value={npl.appraisalValue}
                                onChange={(e) => setN("appraisalValue", e.target.value)}
                                className={inputCls + " pl-9"}
                                style={inputStyle}
                              />
                            </div>
                          </Field>
                          <Field label="선순위 채권" hint={npl.seniorClaim ? formatKRW(npl.seniorClaim) : undefined}>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: C.lt4 }}>₩</span>
                              <input
                                type="text"
                                placeholder="0"
                                value={npl.seniorClaim}
                                onChange={(e) => setN("seniorClaim", e.target.value)}
                                className={inputCls + " pl-9"}
                                style={inputStyle}
                              />
                            </div>
                          </Field>
                        </div>
                        <Field label="건물 면적 (㎡)">
                          <input
                            type="text"
                            placeholder="0"
                            value={npl.buildingArea}
                            onChange={(e) => setN("buildingArea", e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </Field>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="rounded-2xl p-8 space-y-5" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                        <div>
                          <h2 className="text-xl font-bold mb-1" style={{ color: C.lt1 }}>서류 첨부</h2>
                          <p className="text-sm" style={{ color: C.lt3 }}>필수 서류를 첨부하면 매칭 확률이 높아집니다</p>
                        </div>
                        {([
                          { key: "reg", label: "등기부등본", hint: "최근 3개월 이내 발급본" },
                          { key: "appraisal", label: "감정평가서", hint: "공인 감정 기관 발급" },
                          { key: "notice", label: "경매 공고문", hint: "법원 발급 공고문" },
                        ] as const).map(({ key, label, hint }) => (
                          <label
                            key={key}
                            className="flex items-center gap-5 rounded-xl p-5 cursor-pointer transition-all hover:shadow-sm"
                            style={{
                              border: npl.docs[key] ? `2px solid ${C.em}` : `2px dashed ${C.l3}`,
                              backgroundColor: npl.docs[key] ? "#ECFDF5" : C.l1,
                            }}
                          >
                            <input
                              type="file"
                              accept=".pdf,.jpg,.png"
                              className="hidden"
                              onChange={(e) => setNDoc(key, e.target.files?.[0] ?? null)}
                            />
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: npl.docs[key] ? "#D1FAE5" : C.l3,
                                color: npl.docs[key] ? C.em : C.lt4,
                              }}>
                              {npl.docs[key] ? <Check className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: npl.docs[key] ? "#065F46" : C.lt2 }}>
                                {npl.docs[key] ? npl.docs[key]!.name : label}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: npl.docs[key] ? "#059669" : C.lt4 }}>
                                {npl.docs[key] ? "파일 선택됨 · 변경하려면 클릭" : hint}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {step === 4 && (
                      <div className="space-y-4">
                        <div className="rounded-2xl p-8" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                          <h2 className="text-xl font-bold mb-6" style={{ color: C.lt1 }}>입력 정보 확인</h2>
                          <dl className="space-y-0">
                            {[
                              ["담보물 유형", npl.assetType || "—"],
                              ["채권 원금", npl.principal ? formatKRW(npl.principal) : "—"],
                              ["경매 사건 번호", npl.caseNumber || "—"],
                              ["경매 기일", npl.auctionDate || "—"],
                              ["소재지", npl.address || "—"],
                              ["감정 평가액", npl.appraisalValue ? formatKRW(npl.appraisalValue) : "—"],
                              ["선순위 채권", npl.seniorClaim ? formatKRW(npl.seniorClaim) : "—"],
                              ["건물 면적", npl.buildingArea ? `${npl.buildingArea}㎡` : "—"],
                              ["등기부등본", npl.docs.reg?.name || "미첨부"],
                              ["감정평가서", npl.docs.appraisal?.name || "미첨부"],
                              ["경매 공고문", npl.docs.notice?.name || "미첨부"],
                            ].map(([k, v], i, arr) => (
                              <div key={k} className="flex items-center justify-between py-3.5"
                                style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.l3}` : "none" }}>
                                <dt className="text-sm" style={{ color: C.lt3 }}>{k}</dt>
                                <dd className="text-sm font-semibold text-right max-w-[60%] truncate" style={{ color: C.lt1 }}>{v}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>

                        {/* AI Grade option */}
                        <label className="flex items-center gap-4 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-sm"
                          style={{
                            backgroundColor: npl.requestAiGrade ? "#FFFBEB" : C.l0,
                            border: npl.requestAiGrade ? `2px solid ${C.amber}` : `1px solid ${C.l3}`,
                          }}>
                          <input
                            type="checkbox"
                            checked={npl.requestAiGrade}
                            onChange={(e) => setN("requestAiGrade", e.target.checked)}
                            className="w-5 h-5 rounded accent-amber-500 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="w-4 h-4" style={{ color: C.amber }} />
                              <span className="text-sm font-bold" style={{ color: C.lt1 }}>AI 등급 평가 요청</span>
                            </div>
                            <p className="text-xs" style={{ color: C.lt3 }}>AI가 채권 등급을 분석하여 매칭 가능성을 높여드립니다.</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </>
                )}

                {/* ── 부동산 Steps ── */}
                {!isNpl && (
                  <>
                    {step === 1 && (
                      <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                        <div>
                          <h2 className="text-xl font-bold mb-1" style={{ color: C.lt1 }}>기본 정보</h2>
                          <p className="text-sm" style={{ color: C.lt3 }}>매물의 기본 정보를 입력하세요</p>
                        </div>

                        <Field label="매물 유형">
                          <ChipGroup items={RE_TYPES} value={re.realEstateType} onChange={(v) => setR("realEstateType", v)} cols={3} color="emerald" />
                        </Field>

                        <Field label="거래 유형">
                          <div className="flex gap-2">
                            {DEAL_TYPES.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setR("dealType", t)}
                                className="flex-1 h-11 rounded-xl border text-sm font-semibold transition-all"
                                style={re.dealType === t
                                  ? { backgroundColor: "#ECFDF5", borderColor: C.em, color: "#065F46" }
                                  : { backgroundColor: C.l0, borderColor: C.l3, color: C.lt2 }}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </Field>

                        <Field label="소재지 *">
                          <input
                            type="text"
                            placeholder="예: 서울특별시 강남구 역삼동 123-45"
                            value={re.address}
                            onChange={(e) => setR("address", e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                          />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                          <Field label={re.dealType === "매매" ? "매매가 *" : "보증금 *"}
                            hint={re.price ? formatKRW(re.price) : undefined}>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: C.lt4 }}>₩</span>
                              <input
                                type="text"
                                placeholder="0"
                                value={re.price}
                                onChange={(e) => setR("price", e.target.value.replace(/[^0-9]/g, ""))}
                                className={inputCls + " pl-9"}
                                style={inputStyle}
                              />
                            </div>
                          </Field>
                          {re.dealType === "월세" && (
                            <Field label="월세" hint={re.monthlyRent ? `/월 ${formatKRW(re.monthlyRent)}` : undefined}>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: C.lt4 }}>₩</span>
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={re.monthlyRent}
                                  onChange={(e) => setR("monthlyRent", e.target.value.replace(/[^0-9]/g, ""))}
                                  className={inputCls + " pl-9"}
                                  style={inputStyle}
                                />
                              </div>
                            </Field>
                          )}
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                        <div>
                          <h2 className="text-xl font-bold mb-1" style={{ color: C.lt1 }}>상세 정보</h2>
                          <p className="text-sm" style={{ color: C.lt3 }}>매물의 상세 사항을 입력하세요</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="전용면적 (㎡) *">
                            <input type="text" placeholder="59.4" value={re.area}
                              onChange={(e) => setR("area", e.target.value)}
                              className={inputCls} style={inputStyle} />
                          </Field>
                          <Field label="층수">
                            <input type="text" placeholder="10" value={re.floor}
                              onChange={(e) => setR("floor", e.target.value)}
                              className={inputCls} style={inputStyle} />
                          </Field>
                          <Field label="총 층수">
                            <input type="text" placeholder="25" value={re.totalFloors}
                              onChange={(e) => setR("totalFloors", e.target.value)}
                              className={inputCls} style={inputStyle} />
                          </Field>
                          <Field label="방향">
                            <select value={re.direction} onChange={(e) => setR("direction", e.target.value)}
                              className={inputCls + " appearance-none"} style={inputStyle}>
                              <option value="">선택</option>
                              {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </Field>
                        </div>
                        <Field label="입주 가능일">
                          <input type="date" value={re.availableDate}
                            onChange={(e) => setR("availableDate", e.target.value)}
                            className={inputCls} style={inputStyle} />
                        </Field>
                        <Field label="관리비 (월, 원)">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: C.lt4 }}>₩</span>
                            <input type="text" placeholder="0" value={re.maintenanceFee}
                              onChange={(e) => setR("maintenanceFee", e.target.value.replace(/[^0-9]/g, ""))}
                              className={inputCls + " pl-9"} style={inputStyle} />
                          </div>
                        </Field>
                        <Field label="상세 설명">
                          <textarea
                            rows={4}
                            placeholder="매물의 특징, 주변 환경, 거래 조건 등을 자유롭게 작성해주세요."
                            value={re.description}
                            onChange={(e) => setR("description", e.target.value)}
                            className={inputCls + " resize-none h-auto py-3"}
                            style={inputStyle}
                          />
                        </Field>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="rounded-2xl p-8 space-y-5" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                        <div>
                          <h2 className="text-xl font-bold mb-1" style={{ color: C.lt1 }}>사진 첨부</h2>
                          <p className="text-sm" style={{ color: C.lt3 }}>사진이 많을수록 거래 성사율이 높아집니다 (최대 10장)</p>
                        </div>
                        <label
                          className="flex flex-col items-center justify-center rounded-2xl p-12 cursor-pointer transition-all"
                          style={{
                            border: re.photos.length > 0 ? `2px solid ${C.em}` : `2px dashed ${C.l3}`,
                            backgroundColor: re.photos.length > 0 ? "#ECFDF5" : C.l1,
                          }}
                        >
                          <input
                            type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []).slice(0, 10)
                              setR("photos", files)
                            }}
                          />
                          <Upload className="w-10 h-10 mb-4" style={{ color: re.photos.length > 0 ? C.em : C.lt4 }} />
                          {re.photos.length > 0 ? (
                            <p className="text-base font-bold" style={{ color: "#065F46" }}>{re.photos.length}장 선택됨</p>
                          ) : (
                            <>
                              <p className="text-sm font-semibold mb-1" style={{ color: C.lt2 }}>클릭하여 사진 업로드</p>
                              <p className="text-xs" style={{ color: C.lt4 }}>JPG, PNG, WEBP · 장당 최대 10MB</p>
                            </>
                          )}
                        </label>
                        {re.photos.length > 0 && (
                          <div className="grid grid-cols-5 gap-2">
                            {re.photos.map((f, i) => (
                              <div key={i} className="aspect-square rounded-xl flex items-center justify-center overflow-hidden"
                                style={{ backgroundColor: C.l2, border: `1px solid ${C.l3}` }}>
                                <p className="text-xs text-center px-1 truncate w-full" style={{ color: C.lt4 }}>{f.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {step === 4 && (
                      <div className="rounded-2xl p-8" style={{ backgroundColor: C.l0, border: `1px solid ${C.l3}` }}>
                        <h2 className="text-xl font-bold mb-6" style={{ color: C.lt1 }}>입력 정보 확인</h2>
                        <dl className="space-y-0">
                          {[
                            ["매물 유형", re.realEstateType || "—"],
                            ["거래 유형", re.dealType],
                            ["소재지", re.address || "—"],
                            ["가격", re.price ? formatKRW(re.price) : "—"],
                            ...(re.dealType === "월세" ? [["월세", re.monthlyRent ? formatKRW(re.monthlyRent) : "—"]] : []),
                            ["전용면적", re.area ? `${re.area}㎡` : "—"],
                            ["층수", re.floor ? `${re.floor}층` : "—"],
                            ["방향", re.direction || "—"],
                            ["입주 가능일", re.availableDate || "—"],
                            ["관리비", re.maintenanceFee ? `${formatKRW(re.maintenanceFee)}/월` : "—"],
                            ["사진", re.photos.length > 0 ? `${re.photos.length}장` : "없음"],
                          ].map(([k, v], i, arr) => (
                            <div key={k} className="flex items-center justify-between py-3.5"
                              style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.l3}` : "none" }}>
                              <dt className="text-sm" style={{ color: C.lt3 }}>{k}</dt>
                              <dd className="text-sm font-semibold text-right max-w-[60%] truncate" style={{ color: C.lt1 }}>{v}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
                disabled={step === 1}
                className="h-11 px-6 rounded-xl text-sm font-semibold transition-all hover:shadow-sm disabled:opacity-0"
                style={{ border: `1px solid ${C.l3}`, backgroundColor: C.l0, color: C.lt2 }}
              >
                ← 이전
              </button>
              {step < 4 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={!canNext()}
                  className="h-11 px-8 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{ background: `linear-gradient(135deg, ${C.blue}, #6366F1)` }}
                >
                  다음 단계 <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="h-11 px-8 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${C.em}, ${C.teal})` }}
                >
                  <Check className="w-4 h-4" /> 등록 제출
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-72 shrink-0 hidden lg:block">
            <div className="sticky top-6 space-y-4">

              {/* Progress card */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: C.bg3, border: `1px solid rgba(255,255,255,0.06)` }}>
                <h3 className="text-sm font-bold mb-5" style={{ color: C.l1 }}>등록 진행 현황</h3>
                <div className="space-y-3">
                  {steps.map((label, i) => {
                    const n = (i + 1) as Step
                    const done = step > n
                    const active = step === n
                    return (
                      <div key={n} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                          style={{
                            backgroundColor: done ? C.em : active ? C.blue : "rgba(255,255,255,0.08)",
                            color: done || active ? C.l0 : "rgba(255,255,255,0.3)",
                          }}>
                          {done ? <Check className="w-3 h-3" /> : n}
                        </div>
                        <span className="text-sm font-medium transition-all"
                          style={{ color: active ? C.l1 : done ? C.emL : "rgba(255,255,255,0.3)" }}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div className="mt-5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${C.em}, ${C.teal})` }}
                    animate={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {step}/{steps.length} 단계
                </p>
              </div>

              {/* Required docs */}
              {isNpl && (
                <div className="rounded-2xl p-6" style={{ backgroundColor: C.bg3, border: `1px solid rgba(255,255,255,0.06)` }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: C.l1 }}>필요 서류</h3>
                  <div className="space-y-3">
                    {REQUIRED_DOCS.map((doc, i) => {
                      const docKeys: Array<keyof NplFormState["docs"]> = ["reg", "appraisal", "notice"]
                      const attached = npl.docs[docKeys[i]] !== null
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                            style={{ backgroundColor: attached ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)" }}>
                            {doc.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold" style={{ color: attached ? C.emL : C.l2 }}>{doc.label}</p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{doc.desc}</p>
                          </div>
                          {attached && <Check className="w-4 h-4 shrink-0" style={{ color: C.em }} />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tip */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.blueL }} />
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {isNpl
                      ? "서류를 모두 첨부하면 매칭 가능성이 2.4배 높아집니다."
                      : "사진을 5장 이상 첨부하면 거래 성사율이 크게 높아집니다."}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
