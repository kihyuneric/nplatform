"use client"

import { useState } from "react"
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Brain,
  Loader2,
  ClipboardPaste,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Coins,
} from "lucide-react"
import { GuideButton } from "@/components/guide/guide-button"
import { toast } from "sonner"
import DS from "@/lib/design-system"

/* ── Types ───────────────────────────────────────────── */
interface ClauseAnalysis {
  clauseNumber: number
  content: string
  risk: "high" | "medium" | "low"
  suggestion: string
}

interface ReviewResult {
  riskLevel: string
  riskScore: number
  clauses: ClauseAnalysis[]
  missingItems: string[]
  overallGrade: string
  suggestions: string[]
}

/* ── Sample contract ─────────────────────────────────── */
const SAMPLE_CONTRACT = `부실채권(NPL) 매매계약서

제1조 (목적)
본 계약은 매도인이 보유한 부실채권을 매수인에게 양도하고, 매수인은 이에 대한 대금을 지급하는 것을 목적으로 한다.

제2조 (채권의 표시)
1. 채무자: 홍길동
2. 채권원금: 금 520,000,000원 (오억이천만원)
3. 담보물: 서울특별시 강남구 역삼동 123-45 아파트 제101동 제1501호
4. 근저당권 설정금액: 금 624,000,000원
5. 연체이자율: 연 15%

제3조 (매매대금 및 지급방법)
1. 매매대금: 금 350,000,000원 (삼억오천만원)
2. 계약금: 매매대금의 10%인 금 35,000,000원은 계약 체결 시 지급한다.
3. 잔금: 금 315,000,000원은 채권양도통지 완료 후 7일 이내에 지급한다.

제4조 (채권양도)
1. 매도인은 잔금 수령과 동시에 채권양도에 필요한 모든 서류를 매수인에게 교부한다.
2. 매도인은 채무자에게 확정일자 있는 내용증명으로 채권양도통지를 한다.

제5조 (담보권 이전)
1. 매도인은 근저당권 이전등기에 필요한 서류를 매수인에게 교부한다.
2. 근저당권 이전등기 비용은 매수인이 부담한다.

제6조 (매도인의 보증)
1. 매도인은 양도채권이 적법하게 존재함을 보증한다.
2. 매도인은 양도채권에 대하여 제3자의 권리가 없음을 보증한다.

제7조 (계약의 해제)
1. 매수인이 잔금을 기일 내에 지급하지 않을 경우, 매도인은 계약을 해제할 수 있다.
2. 계약 해제 시 계약금은 위약벌로서 매도인에게 귀속된다.

제8조 (분쟁해결)
본 계약에 관한 분쟁은 서울중앙지방법원을 관할법원으로 한다.

제9조 (특약사항)
1. 매수인은 현 상태 그대로(AS-IS) 조건으로 매수하며, 향후 하자에 대해 매도인에게 이의를 제기하지 않는다.
2. 매도인의 채권회수 관련 자료는 계약 체결 후 3일 이내에 인수인계한다.

2024년 3월 18일

매도인: ○○자산관리 주식회사
매수인: △△투자 주식회사`

/* ── Grade helpers ────────────────────────────────────── */
function gradeColor(grade: string) {
  switch (grade) {
    case "A":
    case "A+":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", bar: "bg-[var(--color-positive)]" }
    case "B":
    case "B+":
      return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", bar: "bg-blue-500" }
    case "C":
    case "C+":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", bar: "bg-amber-500" }
    case "D":
      return { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", bar: "bg-orange-500" }
    default:
      return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", bar: "bg-[var(--color-negative)]" }
  }
}

function riskBadge(risk: "high" | "medium" | "low") {
  switch (risk) {
    case "high":
      return { label: "고위험", cls: "bg-red-500/10 text-red-400 border-red-500/20" }
    case "medium":
      return { label: "중위험", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
    case "low":
      return { label: "저위험", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
  }
}

/* ── Mock API (simulates POST /api/v1/ai/contract-review) ── */
async function reviewContract(contractText: string): Promise<ReviewResult> {
  const res = await fetch("/api/v1/ai/contract-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractText }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || "계약서 검토에 실패했습니다.")
  }

  return res.json()
}

/* ================================================================
   PAGE
   ================================================================ */
export default function ContractReviewPage() {
  const [contractText, setContractText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set())

  const toggleClause = (idx: number) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const handleReview = async () => {
    if (!contractText.trim()) {
      toast.error("계약서 내용을 입력해주세요.")
      return
    }
    if (contractText.trim().length < 50) {
      toast.error("계약서 내용이 너무 짧습니다. 최소 50자 이상 입력해주세요.")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const data = await reviewContract(contractText)
      setResult(data)
      toast.success("AI 계약서 검토가 완료되었습니다.")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "계약서 검토 중 오류가 발생했습니다."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSample = () => {
    setContractText(SAMPLE_CONTRACT)
    setResult(null)
    toast.info("샘플 NPL 매매계약서가 입력되었습니다.")
  }

  const gc = result ? gradeColor(result.overallGrade) : null

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-16`}>
        {/* ── Header ─────────────────────────────────── */}
        <div className={DS.header.wrapper}>
          <div className="flex items-start justify-between">
            <div>
              <p className={DS.header.eyebrow}>AI Analysis</p>
              <h1 className={DS.header.title}>AI 계약서 검토</h1>
              <p className={DS.header.subtitle}>
                AI가 계약서를 조항별로 분석하여 위험 요소, 누락 항목, 개선 사항을 자동으로 검토합니다.
                리뷰 1회당 <strong>8 크레딧</strong>이 차감됩니다.
              </p>
            </div>
            <GuideButton serviceKey="contract-review" theme="light" />
          </div>
        </div>

        <div className={DS.page.sectionGap}>
          {/* ── Input Section ────────────────────────── */}
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-mid)]/10 flex items-center justify-center">
                <ClipboardPaste className="w-5 h-5 text-[var(--color-brand-mid)]" />
              </div>
              <div>
                <h2 className={DS.text.cardTitle}>계약서 입력</h2>
                <p className={DS.text.caption}>검토할 계약서 전문을 아래에 붙여넣으세요.</p>
              </div>
            </div>

            <textarea
              className={`${DS.input.base} min-h-[320px] resize-y font-mono text-[0.875rem] leading-relaxed`}
              placeholder="계약서 전문을 붙여넣으세요..."
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              disabled={loading}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <button className={DS.button.secondary} onClick={handleSample} disabled={loading}>
                  <FileCheck className="w-4 h-4" />
                  샘플 계약서 불러오기
                </button>
                <span className={DS.text.captionLight}>
                  {contractText.length.toLocaleString()}자 입력됨
                </span>
              </div>

              <button
                className={`${DS.button.primary} ${DS.button.lg}`}
                onClick={handleReview}
                disabled={loading || !contractText.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    AI 검토 시작
                    <span className="flex items-center gap-1 ml-1 opacity-70">
                      <Coins className="w-3.5 h-3.5" />8
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Results ──────────────────────────────── */}
          {result && gc && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Overall Grade */}
                <div className={`${DS.card.base} ${DS.card.padding} flex flex-col items-center justify-center text-center`}>
                  <p className={DS.text.label}>종합 등급</p>
                  <div className={`mt-3 w-20 h-20 rounded-2xl ${gc.bg} border ${gc.border} flex items-center justify-center`}>
                    <span className={`text-[2.5rem] font-extrabold ${gc.text}`}>{result.overallGrade}</span>
                  </div>
                  <p className={`mt-2 ${DS.text.caption}`}>{result.riskLevel}</p>
                </div>

                {/* Risk Score */}
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <p className={DS.text.label}>위험 점수</p>
                  <p className={`mt-2 ${DS.text.metricHero} ${gc.text}`}>{result.riskScore}<span className="text-[1rem] font-medium text-[var(--color-text-muted)]">/100</span></p>
                  <div className="mt-3 w-full h-3 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${gc.bar}`}
                      style={{ width: `${result.riskScore}%` }}
                    />
                  </div>
                  <p className={`mt-2 ${DS.text.captionLight}`}>점수가 높을수록 위험도가 높습니다</p>
                </div>

                {/* Stats */}
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <p className={DS.text.label}>분석 요약</p>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={DS.text.body}>검토 조항</span>
                      <span className={DS.text.metricSmall}>{result.clauses.length}개</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={DS.text.body}>누락 항목</span>
                      <span className={`${DS.text.metricSmall} ${result.missingItems.length > 0 ? "text-[var(--color-negative)]" : "text-[var(--color-positive)]"}`}>
                        {result.missingItems.length}개
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={DS.text.body}>고위험 조항</span>
                      <span className={`${DS.text.metricSmall} text-[var(--color-negative)]`}>
                        {result.clauses.filter((c) => c.risk === "high").length}개
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={DS.text.body}>개선 제안</span>
                      <span className={DS.text.metricSmall}>{result.suggestions.length}건</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clause-by-Clause Analysis */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-mid)]/10 flex items-center justify-center">
                    <ListChecks className="w-5 h-5 text-[var(--color-brand-mid)]" />
                  </div>
                  <div>
                    <h2 className={DS.text.cardTitle}>조항별 분석</h2>
                    <p className={DS.text.caption}>각 조항의 위험도와 개선 제안을 확인하세요.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.clauses.map((clause, idx) => {
                    const badge = riskBadge(clause.risk)
                    const isOpen = expandedClauses.has(idx)

                    return (
                      <div
                        key={idx}
                        className={`border border-[var(--color-border-subtle)] rounded-xl overflow-hidden transition-colors ${
                          clause.risk === "high" ? "border-l-4 border-l-red-400" : clause.risk === "medium" ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-emerald-400"
                        }`}
                      >
                        <button
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-surface-sunken)] transition-colors"
                          onClick={() => toggleClause(idx)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={DS.text.bodyBold}>제{clause.clauseNumber}조</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-5 pb-4 space-y-3 border-t border-[var(--color-border-subtle)]">
                            <div className="pt-3">
                              <p className={DS.text.label}>조항 내용</p>
                              <p className={`mt-1 ${DS.text.body} whitespace-pre-wrap`}>{clause.content}</p>
                            </div>
                            <div>
                              <p className={DS.text.label}>AI 개선 제안</p>
                              <div className="mt-1 flex items-start gap-2 p-3 rounded-lg bg-[var(--color-surface-sunken)]">
                                <Sparkles className="w-4 h-4 text-[var(--color-brand-mid)] mt-0.5 shrink-0" />
                                <p className={DS.text.body}>{clause.suggestion}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Missing Items */}
              {result.missingItems.length > 0 && (
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className={DS.text.cardTitle}>누락 항목</h2>
                      <p className={DS.text.caption}>계약서에 포함되지 않은 중요 항목들입니다.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.missingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <span className={DS.text.body}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall AI Suggestions */}
              {result.suggestions.length > 0 && (
                <div className={`${DS.card.base} ${DS.card.padding}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className={DS.text.cardTitle}>AI 종합 제안</h2>
                      <p className={DS.text.caption}>계약서 전체에 대한 AI의 개선 권고사항입니다.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {result.suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface-sunken)]"
                      >
                        <CheckCircle2 className="w-5 h-5 text-[var(--color-positive)] mt-0.5 shrink-0" />
                        <span className={DS.text.body}>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
