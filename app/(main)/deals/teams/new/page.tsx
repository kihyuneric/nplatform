"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, ArrowLeft, ArrowRight, Lock, Globe, CheckCircle2, Loader2, ChevronRight } from "lucide-react"
import Link from "next/link"

interface TeamForm {
  name: string
  description: string
  investment_type: string
  target_amount: string
  max_members: string
  is_private: boolean
  leader_role: string
}

const STEPS = ["기본 설정", "투자 계획", "멤버 초대", "완료"]
const INVEST_TYPES = ["아파트", "상가", "토지", "혼합"]

export default function NewTeamPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<TeamForm>({
    name: "", description: "", investment_type: "아파트",
    target_amount: "", max_members: "5",
    is_private: false, leader_role: "",
  })

  const update = (key: keyof TeamForm, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const canNext = () => {
    if (step === 0) return form.name.trim().length >= 3
    if (step === 1) return Number(form.target_amount) >= 10000000
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, target_amount: Number(form.target_amount), max_members: Number(form.max_members) }),
      })
      const data = await res.json()
      router.push(`/deals/teams/${data.id || "t1"}`)
    } catch {
      router.push("/deals/teams")
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/40 focus:border-[#2E75B6]/50 transition-all"
  const labelCls = "block text-xs font-semibold text-[#8BAFD1] mb-1.5 tracking-normal"

  return (
    <div className="min-h-screen bg-[#060E1A]">

      {/* Header */}
      <div className="bg-[#0D1F38] px-6 py-7">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/deals/teams" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="section-eyebrow text-xs font-semibold text-[#4FC3F7] uppercase tracking-normal mb-0.5">
              공동투자 플랫폼
            </p>
            <h1 className="text-xl font-extrabold text-white tracking-tight">공동투자팀 만들기</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-7">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  i < step ? "bg-emerald-500 text-white"
                  : i === step ? "bg-[#2E75B6] text-white shadow-[0_0_10px_rgba(46,117,182,0.4)]"
                  : "bg-white/10 text-white/30"
                }`}>
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block whitespace-nowrap ${
                  i === step ? "font-semibold text-white" : i < step ? "text-emerald-400" : "text-white/25"
                }`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < step ? "bg-emerald-500/50" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="card-interactive-dark bg-white/[0.03] rounded-2xl border border-white/[0.07] p-6">

          {/* Step 0: 기본 설정 */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-sm font-bold text-white mb-1">기본 설정</h2>
              <div>
                <label className={labelCls}>팀 이름 *</label>
                <input
                  placeholder="예: 강남 아파트 공동투자팀"
                  value={form.name}
                  onChange={e => update("name", e.target.value)}
                  className={inputCls}
                />
                <p className="text-[11px] text-white/25 mt-1">최소 3자 이상 입력하세요</p>
              </div>
              <div>
                <label className={labelCls}>팀 소개</label>
                <textarea
                  placeholder="투자 목적, 전략, 기대 수익률 등을 간략히 설명하세요"
                  value={form.description}
                  onChange={e => update("description", e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>리더 역할 정의</label>
                <input
                  placeholder="예: 물건 분석 및 협상 담당"
                  value={form.leader_role}
                  onChange={e => update("leader_role", e.target.value)}
                  className={inputCls}
                />
              </div>
              {/* Public / private toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer"
                onClick={() => update("is_private", !form.is_private)}
              >
                <div className="flex items-center gap-3">
                  {form.is_private
                    ? <Lock className="w-4 h-4 text-white/40" />
                    : <Globe className="w-4 h-4 text-emerald-400" />
                  }
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {form.is_private ? "비공개 팀" : "공개 팀"}
                    </p>
                    <p className="text-xs text-white/35">
                      {form.is_private ? "초대된 멤버만 참여 가능" : "누구든 참여 신청 가능"}
                    </p>
                  </div>
                </div>
                <div className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${form.is_private ? "bg-[#2E75B6]" : "bg-white/15"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${form.is_private ? "translate-x-6" : "translate-x-1"}`} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: 투자 계획 */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-sm font-bold text-white mb-1">투자 계획</h2>
              <div>
                <label className={labelCls}>투자 유형</label>
                <div className="grid grid-cols-4 gap-2">
                  {INVEST_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => update("investment_type", t)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        form.investment_type === t
                          ? "bg-[#1B3A5C] border-[#2E75B6]/50 text-white"
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>목표 투자금 (원) *</label>
                <input
                  type="number"
                  placeholder="예: 500000000"
                  value={form.target_amount}
                  onChange={e => update("target_amount", e.target.value)}
                  className={inputCls}
                />
                <p className="text-[11px] text-white/35 mt-1">
                  {Number(form.target_amount) > 0
                    ? `= ${(Number(form.target_amount) / 100000000).toFixed(2)}억원`
                    : "최소 1,000만원 이상"}
                </p>
              </div>
              <div>
                <label className={labelCls}>최대 팀원 수 (2~10명)</label>
                <input
                  type="number"
                  min="2" max="10"
                  value={form.max_members}
                  onChange={e => update("max_members", e.target.value)}
                  className={`${inputCls} max-w-xs`}
                />
              </div>
            </div>
          )}

          {/* Step 2: 멤버 초대 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-1">멤버 초대</h2>
              <p className="text-xs text-[#8BAFD1]">팀 생성 후 멤버를 초대하거나 공개 모집할 수 있습니다.</p>
              <div className="bg-[#0D1F38] rounded-xl border border-white/[0.06] p-4 space-y-2">
                <p className="text-xs font-semibold text-white/50 tracking-normal uppercase">팀 미리보기</p>
                <p className="text-sm font-bold text-white">{form.name || "(팀 이름 미입력)"}</p>
                <p className="text-xs text-[#8BAFD1]">{form.investment_type} · 최대 {form.max_members}명</p>
                <p className="text-xs text-white/30">{form.is_private ? "비공개" : "공개 모집"}</p>
              </div>
              <p className="text-xs text-white/25 text-center">팀 생성 후 초대 링크를 공유하거나, 공개 팀으로 설정하면 자동 모집됩니다.</p>
            </div>
          )}

          {/* Step 3: 완료 확인 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-1">팀 설정 확인</h2>
              <div className="bg-[#0D1F38] rounded-xl border border-white/[0.06] p-5 space-y-3">
                {[
                  { label: "팀 이름", value: form.name || "—" },
                  { label: "투자 유형", value: form.investment_type },
                  { label: "목표 금액", value: Number(form.target_amount) > 0 ? `${(Number(form.target_amount) / 100000000).toFixed(2)}억원` : "—" },
                  { label: "최대 팀원", value: `${form.max_members}명` },
                  { label: "공개 설정", value: form.is_private ? "비공개" : "공개" },
                  { label: "리더 역할", value: form.leader_role || "미정" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                    <span className="text-white/40">{row.label}</span>
                    <span className="font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
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
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2E75B6] hover:bg-[#1B5FA0] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
              >
                다음 단계 <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                팀 생성하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
