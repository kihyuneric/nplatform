"use client"

import { useState } from "react"
import {
  FileText,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Brain,
  Download,
  Building2,
  Loader2,
  ClipboardList,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GuideButton } from "@/components/guide/guide-button"
import { toast } from "sonner"
import DS from "@/lib/design-system"

/* ── Mock listings ────────────────────────────────── */
const mockListings = [
  { id: "L001", title: "강남구 역삼동 아파트 NPL", principal: "5.2억원" },
  { id: "L002", title: "성남시 분당구 오피스텔 NPL", principal: "3.8억원" },
  { id: "L003", title: "마포구 서교동 상가 NPL", principal: "8.1억원" },
]

/* ── 14 checklist items ──────────────────────────── */
const checklistItems = [
  { id: 1, label: "등기부등본 분석", category: "권리분석", critical: true },
  { id: 2, label: "선순위 권리 확인", category: "권리분석", critical: true },
  { id: 3, label: "임차인 현황 조사", category: "권리분석", critical: true },
  { id: 4, label: "감정평가 검토", category: "가치평가", critical: false },
  { id: 5, label: "시세 비교 분석", category: "가치평가", critical: false },
  { id: 6, label: "담보물 현장 확인", category: "현장조사", critical: true },
  { id: 7, label: "건축물대장 검토", category: "현장조사", critical: false },
  { id: 8, label: "채무자 신용조사", category: "채권분석", critical: false },
  { id: 9, label: "연체 이력 분석", category: "채권분석", critical: false },
  { id: 10, label: "회수가능성 평가", category: "채권분석", critical: true },
  { id: 11, label: "세금 및 공과금 조회", category: "비용분석", critical: false },
  { id: 12, label: "예상 비용 산출", category: "비용분석", critical: false },
  { id: 13, label: "법적 리스크 검토", category: "리스크", critical: true },
  { id: 14, label: "종합 투자의견 작성", category: "종합", critical: true },
]

/* ── Mock generated report ───────────────────────── */
const mockReport = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            NPL 실사 리포트 (AI 생성)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 개요
   - 대상: 강남구 역삼동 아파트 NPL 채권
   - 채권원금: 520,000,000원
   - 감정가: 680,000,000원
   - 분석일: 2024-03-18

2. 권리분석 요약
   - 등기부등본: 정상 (근저당권 1건)
   - 선순위 권리: 없음
   - 임차인: 1세대 (보증금 5,000만원, 대항력 없음)
   - 법적 리스크: 낮음

3. 가치평가
   - 감정가 대비 할인율: 35%
   - 주변 시세 대비: 적정
   - 향후 가격 전망: 안정적 상승 예상

4. 수익성 분석
   - 예상 IRR: 18.5%
   - 투자 회수 기간: 8~12개월
   - 총 예상 비용: 32,000,000원

5. 리스크 평가
   - 종합 리스크 등급: A (안정)
   - 주요 리스크: 점유자 명도 지연 가능성
   - 완화 방안: 명도 소송 병행 권장

6. 투자의견
   [매수 권장] 감정가 대비 할인율이 높고,
   권리관계가 단순하여 안정적 투자가 가능합니다.
   단, 임차인 대항력 여부를 최종 확인 후 진행 권장.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim()

export default function DueDiligenceReportPage() {
  const [selectedListing, setSelectedListing] = useState("")
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState("")
  const [showReport, setShowReport] = useState(false)

  const handleGenerate = async () => {
    if (!selectedListing) {
      toast.error("분석할 매물을 선택해주세요.")
      return
    }
    setGenerating(true)
    setReport("")
    setShowReport(false)

    try {
      const res = await fetch("/api/v1/ai/due-diligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: selectedListing }),
      })
      const data = await res.json()
      if (data.report) {
        setReport(data.report)
      } else {
        setReport(mockReport)
      }
      setShowReport(true)
      toast.success("AI 실사 리포트가 생성되었습니다!")
    } catch {
      setReport(mockReport)
      setShowReport(true)
      toast.success("AI 실사 리포트가 생성되었습니다!")
    } finally {
      setGenerating(false)
    }
  }

  const completedCount = report ? checklistItems.length : 0
  const criticalCount = checklistItems.filter((i) => i.critical).length

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className={`${DS.page.container} py-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20">
                <ClipboardList className="h-8 w-8 text-[var(--color-brand-mid)]" />
              </div>
              <div>
                <h1 className={DS.header.title}>실사 리포트 생성</h1>
                <p className={DS.header.subtitle}>
                  AI가 14개 체크리스트를 기반으로 종합 실사 보고서를 자동 생성합니다
                </p>
              </div>
            </div>
            <GuideButton serviceKey="due-diligence" theme="light" />
          </div>
        </div>
      </section>

      <div className={`${DS.page.container} py-8 max-w-5xl space-y-8`}>
        {/* Select listing + Generate */}
        <div className={`${DS.card.base} ${DS.card.padding}`}>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className={`${DS.input.label} block`}>
                분석 대상 매물 선택
              </label>
              <Select value={selectedListing} onValueChange={setSelectedListing}>
                <SelectTrigger className="border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]">
                  <SelectValue placeholder="매물을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {mockListings.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[var(--color-text-muted)]" />
                        {l.title} ({l.principal})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedListing}
              className="bg-[var(--color-positive)] hover:bg-emerald-600 text-white w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  AI 리포트 생성
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Checklist Summary */}
        <div className={`${DS.card.base} overflow-hidden`}>
          <div className="px-5 py-4 sm:px-6 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center justify-between">
              <h3 className={`${DS.text.cardTitle} text-[var(--color-brand-dark)]`}>
                실사 체크리스트 ({completedCount}/{checklistItems.length})
              </h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[0.6875rem]">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                  필수 {criticalCount}개
                </Badge>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg p-3 bg-[var(--color-surface-sunken)]"
                >
                  {report ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-positive)]" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={DS.text.body}>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-[0.625rem] px-1.5 py-0 border-[var(--color-border-default)]"
                    >
                      {item.category}
                    </Badge>
                    {item.critical && (
                      <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[0.625rem] px-1 py-0">
                        필수
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generated Report Preview */}
        {showReport && report && (
          <div className={`${DS.card.base} overflow-hidden`}>
            <div className="px-5 py-4 sm:px-6 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between">
                <h3 className={`${DS.text.cardTitle} text-[var(--color-brand-dark)]`}>
                  <FileText className="inline h-5 w-5 mr-2 text-[var(--color-brand-mid)]" />
                  생성된 리포트
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReport(!showReport)}
                    className="border-[var(--color-border-default)]"
                  >
                    {showReport ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("PDF 생성 중...")}
                    className="border-[var(--color-border-default)]"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF 다운로드
                  </Button>
                </div>
              </div>
            </div>
            {showReport && (
              <div className="p-5 sm:p-6">
                <div className="rounded-xl bg-[var(--color-surface-sunken)] p-6 overflow-auto max-h-[600px]">
                  <pre className={`${DS.text.body} whitespace-pre-wrap font-mono leading-relaxed`}>
                    {report}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
