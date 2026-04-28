"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2, CheckCircle2, ChevronRight, FileText,
  HandshakeIcon, ShieldCheck, Clock, Percent, Star,
  ChevronDown, ChevronUp,
} from "lucide-react"
import DS, { formatKRW } from "@/lib/design-system"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── 온보딩 혜택 ─────────────────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: Percent,
    title: "매도 수수료 6개월 면제",
    desc: "거래 성사 시 매도 수수료(통상 0.9%) 6개월간 100% 면제. 온보딩 확인 후 즉시 적용.",
    highlight: true,
  },
  {
    icon: HandshakeIcon,
    title: "전담 딜 매니저 배정",
    desc: "기관 전용 딜 매니저가 매물 등록부터 계약 종결까지 전 과정을 1:1 지원합니다.",
  },
  {
    icon: ShieldCheck,
    title: "마스킹·PII 자동 처리",
    desc: "채권자 정보·주민번호 등 민감 정보를 AI가 자동으로 마스킹·검수합니다.",
  },
  {
    icon: Star,
    title: "기관 인증 배지",
    desc: "매물 목록에 '기관 인증' 배지가 표시되어 매수자 신뢰도를 높입니다.",
  },
  {
    icon: FileText,
    title: "NDA·LOI 템플릿 자동 생성",
    desc: "표준 NDA·LOI 계약서를 기관 정보 기반으로 1-Click 생성합니다.",
  },
  {
    icon: Clock,
    title: "빠른 심사 우선 처리",
    desc: "일반 매물 대비 심사 우선 처리로 등록~공개까지 평균 2시간 이내.",
  },
]

// ─── 서류 체크리스트 ───────────────────────────────────────────────────────
const DOCS = [
  { id: "bizreg",    label: "사업자등록증",                     required: true },
  { id: "bankbook",  label: "법인 통장 사본",                    required: true },
  { id: "seal",      label: "법인 인감증명서 (3개월 이내)",       required: true },
  { id: "npl_auth",  label: "NPL 업무 위임장 또는 수탁 계약서",  required: false },
  { id: "regulator", label: "금융감독원 등록증 (해당 기관)",       required: false },
]

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "6개월 면제 기산일은 언제부터인가요?",
    a: "온보딩 신청 승인일로부터 183일간 적용됩니다. 면제 기간 중 성사된 거래에 대해서는 매도 수수료(부가세 포함)가 청구되지 않습니다.",
  },
  {
    q: "심사에 얼마나 걸리나요?",
    a: "서류 완비 기준 영업일 1~2일 이내 승인 연락을 드립니다. 추가 서류 요청 시 최대 5영업일이 소요될 수 있습니다.",
  },
  {
    q: "6개월 이후 수수료는 어떻게 되나요?",
    a: "온보딩 종료 후에는 표준 매도 수수료율(≤0.9%, 거래금액 구간 및 플랜에 따라 할인 가능)이 적용됩니다.",
  },
  {
    q: "NPL이 아닌 부동산 담보물도 등록 가능한가요?",
    a: "가능합니다. NPL 채권과 연계된 담보 부동산은 물론, 일반 부동산 자산도 등록하실 수 있습니다.",
  },
]

type Step = 1 | 2 | 3

interface FormData {
  instName: string
  bizRegNo: string
  repName: string
  repPosition: string
  phone: string
  email: string
  assetType: string[]
  estimatedVolume: string
  uploadedDocs: string[]
  agreeTerms: boolean
  agreePrivacy: boolean
}

export default function InstitutionOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>({
    instName: "",
    bizRegNo: "",
    repName: "",
    repPosition: "",
    phone: "",
    email: "",
    assetType: [],
    estimatedVolume: "",
    uploadedDocs: [],
    agreeTerms: false,
    agreePrivacy: false,
  })

  const update = (patch: Partial<FormData>) => setForm(p => ({ ...p, ...patch }))

  const toggleAssetType = (v: string) => {
    update({ assetType: form.assetType.includes(v) ? form.assetType.filter(x => x !== v) : [...form.assetType, v] })
  }

  const toggleDoc = (id: string) => {
    update({ uploadedDocs: form.uploadedDocs.includes(id) ? form.uploadedDocs.filter(x => x !== id) : [...form.uploadedDocs, id] })
  }

  const canProceedStep1 = form.instName && form.bizRegNo && form.repName && form.phone && form.email
  const canProceedStep2 = form.assetType.length > 0 && DOCS.filter(d => d.required).every(d => form.uploadedDocs.includes(d.id))
  const canSubmit = canProceedStep2 && form.agreeTerms && form.agreePrivacy

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/onboarding/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStep(3)
    } catch {
      toast.error("신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[#0A1628] to-[#2251FF] text-white">
        <div className={`${DS.page.container} py-12`}>
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-8 w-8 text-stone-900" />
            <span className="text-stone-900 text-sm font-semibold tracking-widest uppercase">금융기관 전용</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">기관 온보딩 프로그램</h1>
          <p className="text-white/80 text-lg max-w-xl">
            은행·캐피탈·자산관리사 등 금융기관 대상 특별 프로그램.<br />
            신청 후 <span className="text-stone-900 font-bold">6개월간 매도 수수료 100% 면제</span>가 즉시 적용됩니다.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            {[
              { label: "면제 기간", value: "6개월" },
              { label: "매도 수수료", value: "₩0" },
              { label: "전담 매니저", value: "1:1" },
              { label: "심사 기간", value: "1~2일" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-none px-5 py-3 text-center">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} py-10 space-y-10`}>

        {/* 혜택 그리드 */}
        <section>
          <h2 className={DS.text.sectionTitle + " mb-5"}>온보딩 혜택</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map(b => {
              const Icon = b.icon
              return (
                <div key={b.title} className={cn(DS.card.elevated, DS.card.padding, b.highlight && "border-stone-300/30 bg-stone-100/5")}>
                  <div className="flex items-start gap-3">
                    <div className={cn("shrink-0 rounded-lg p-2", b.highlight ? "bg-stone-100/20" : "bg-[var(--color-surface-overlay)]")}>
                      <Icon className={cn("h-5 w-5", b.highlight ? "text-stone-900" : "text-[var(--color-brand-mid)]")} />
                    </div>
                    <div>
                      <p className={cn("font-semibold text-[0.9375rem] mb-1", b.highlight ? "text-stone-900" : "text-[var(--color-text-primary)]")}>{b.title}</p>
                      <p className={DS.text.caption}>{b.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 신청 폼 */}
        <section>
          <h2 className={DS.text.sectionTitle + " mb-5"}>온보딩 신청</h2>

          {/* Step indicator */}
          {step < 3 && (
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    step === s ? "bg-[var(--color-brand-mid)] text-white" : step > s ? "bg-stone-100 text-white" : "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]"
                  )}>
                    {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                  </div>
                  <span className={cn("text-sm", step >= s ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
                    {s === 1 ? "기관 정보" : "서류 제출"}
                  </span>
                  {s < 2 && <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: 기관 정보 */}
          {step === 1 && (
            <div className={cn(DS.card.elevated, DS.card.padding, "space-y-5 max-w-2xl")}>
              <h3 className={DS.text.cardTitle}>기관 기본 정보</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "기관명 *", field: "instName", placeholder: "예: 한국자산관리공사", sm: 2 },
                  { label: "사업자등록번호 *", field: "bizRegNo", placeholder: "000-00-00000" },
                  { label: "대표자/담당자명 *", field: "repName", placeholder: "홍길동" },
                  { label: "직책", field: "repPosition", placeholder: "NPL본부 팀장" },
                  { label: "연락처 *", field: "phone", placeholder: "010-0000-0000" },
                  { label: "이메일 *", field: "email", placeholder: "npl@institution.co.kr" },
                ].map(({ label, field, placeholder, sm }) => (
                  <div key={field} className={sm === 2 ? "sm:col-span-2" : ""}>
                    <label className={DS.input.label}>{label}</label>
                    <input
                      value={(form as any)[field]}
                      onChange={e => update({ [field]: e.target.value } as any)}
                      placeholder={placeholder}
                      className={DS.input.base}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className={DS.input.label}>자산 유형 (복수 선택) *</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["NPL 채권", "담보 부동산", "공매 물건", "P-NPL", "기타"].map(v => (
                    <button
                      key={v}
                      onClick={() => toggleAssetType(v)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                        form.assetType.includes(v)
                          ? "bg-[var(--color-brand-mid)] text-white border-[var(--color-brand-mid)]"
                          : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:border-[var(--color-brand-mid)]"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={DS.input.label}>예상 연간 거래 규모</label>
                <select value={form.estimatedVolume} onChange={e => update({ estimatedVolume: e.target.value })} className={DS.input.base}>
                  <option value="">선택하세요</option>
                  <option value="~50억">~50억 원</option>
                  <option value="50~200억">50~200억 원</option>
                  <option value="200~500억">200~500억 원</option>
                  <option value="500~1000억">500~1,000억 원</option>
                  <option value="1000억+">1,000억 원 이상</option>
                </select>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className={cn(DS.button.primary, !canProceedStep1 && "opacity-50 cursor-not-allowed")}
              >
                다음 단계 <ChevronRight className="ml-1 h-4 w-4 inline" />
              </button>
            </div>
          )}

          {/* Step 2: 서류 제출 */}
          {step === 2 && (
            <div className={cn(DS.card.elevated, DS.card.padding, "space-y-5 max-w-2xl")}>
              <h3 className={DS.text.cardTitle}>서류 제출</h3>
              <p className={DS.text.caption}>아래 필수 서류를 업로드해주세요. 실제 파일 업로드는 승인 후 담당자가 별도 안내드립니다.</p>
              <div className="space-y-3">
                {DOCS.map(doc => (
                  <label key={doc.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    form.uploadedDocs.includes(doc.id)
                      ? "border-[var(--color-brand-mid)] bg-stone-100/5"
                      : "border-[var(--color-border-default)] hover:border-[var(--color-border-focused)]"
                  )}>
                    <input
                      type="checkbox"
                      checked={form.uploadedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="h-4 w-4 accent-[var(--color-brand-mid)]"
                    />
                    <span className="flex-1 text-sm text-[var(--color-text-primary)]">{doc.label}</span>
                    {doc.required
                      ? <span className="text-[0.6875rem] font-bold text-stone-900 bg-stone-100/10 px-2 py-0.5 rounded-full border border-stone-300/20">필수</span>
                      : <span className="text-[0.6875rem] text-[var(--color-text-muted)] bg-[var(--color-surface-overlay)] px-2 py-0.5 rounded-full border border-[var(--color-border-subtle)]">선택</span>
                    }
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { field: "agreeTerms", label: "[필수] 서비스 이용약관에 동의합니다." },
                  { field: "agreePrivacy", label: "[필수] 개인정보 처리방침에 동의합니다." },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form as any)[field]}
                      onChange={e => update({ [field]: e.target.checked } as any)}
                      className="h-4 w-4 accent-[var(--color-brand-mid)]"
                    />
                    <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className={DS.button.secondary}>← 이전</button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className={cn(DS.button.primary, (!canSubmit || submitting) && "opacity-50 cursor-not-allowed")}
                >
                  {submitting ? "신청 중..." : "온보딩 신청 완료"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 완료 */}
          {step === 3 && (
            <div className={cn(DS.card.elevated, DS.card.padding, "max-w-xl text-center space-y-4")}>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-stone-100/20 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9 text-stone-900" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">신청이 완료되었습니다!</h3>
              <p className={DS.text.body}>
                입력하신 이메일로 접수 확인 메일이 발송됩니다.<br />
                영업일 <strong>1~2일</strong> 이내 담당자가 연락드립니다.
              </p>
              <div className="bg-stone-100/10 rounded-none p-4 border border-stone-300/20">
                <p className="text-stone-900 text-sm font-semibold">🎉 승인 즉시 6개월 수수료 면제 자동 적용</p>
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => router.push("/exchange/institutions")} className={DS.button.secondary}>기관 목록 보기</button>
                <button onClick={() => router.push("/my/seller")} className={DS.button.primary}>매물 등록하기</button>
              </div>
            </div>
          )}
        </section>

        {/* FAQ */}
        <section>
          <h2 className={DS.text.sectionTitle + " mb-4"}>자주 묻는 질문</h2>
          <div className="space-y-2 max-w-2xl">
            {FAQ.map((faq, i) => (
              <div key={i} className={cn(DS.card.base, "overflow-hidden")}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-[var(--color-text-primary)] text-sm">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" /> : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className={DS.text.caption}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
