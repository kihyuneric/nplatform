/**
 * POST /api/v1/ai/dd-report/stream
 *
 * Phase 3-A: DD Report SSE 스트리밍 엔드포인트
 *
 * 흐름:
 *   1) 수학적 분석 (template)은 즉시 계산 → `template_ready` 이벤트로 1회 전송
 *   2) 6개 서술 섹션을 순차 스트리밍 (executive → collateral → legal → financial → market → conclusion)
 *      각 섹션마다 `stage_start` → `text_delta`* → `stage_end`
 *   3) AI가 발견한 추가 리스크 → `risks` 이벤트
 *   4) `done` 이벤트로 종료 (전체 페이로드 포함)
 *
 * 사용자가 중간에 abort 하면 서버 측 for-await 가 자동 종료.
 *
 * SSE 이벤트 형식:
 *   event: <eventName>
 *   data: <JSON>\n\n
 */

import { NextRequest } from "next/server"
import {
  generateDDReport,
  type DDReportInput,
  type DDReport,
} from "@/lib/report/dd-report-generator"
import { getAIService } from "@/lib/ai/core/llm-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── SSE Event helpers ─────────────────────────────────────────

function sseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

// ─── Section Definitions ────────────────────────────────────────

type SectionKey =
  | "executive"
  | "collateral"
  | "legal"
  | "financial"
  | "market"
  | "conclusion"

interface SectionPrompt {
  key: SectionKey
  label: string
  instruction: string
}

function buildSectionPrompts(input: DDReportInput, report: DDReport): SectionPrompt[] {
  const roi = report.executive.expectedROI
  const mc = report.financial.monteCarlo
  const ctx = `
[매물 정보]
- 매물 ID: ${input.listingId}
- 물건 유형: ${input.propertyType}
- 지역: ${input.region}
- 주소: ${input.address}
- 감정가: ${input.appraisalValue?.toLocaleString() ?? "n/a"} 원
- 채권 원금: ${input.principal?.toLocaleString() ?? "n/a"} 원
- 건물 면적: ${input.buildingArea ?? "n/a"} ㎡
- 토지 면적: ${input.landArea ?? "n/a"} ㎡

[수학적 분석 결과]
- 투자 등급: ${report.executive.investmentGrade}
- 종합 점수: ${report.executive.gradeScore}/100
- 예상 ROI (보수/중립/공격): ${roi?.conservative ?? "n/a"}% / ${roi?.moderate ?? "n/a"}% / ${roi?.aggressive ?? "n/a"}%
- 권고: ${report.executive.recommendedAction}
- Key Risks: ${(report.executive.keyRisks ?? []).join(", ")}
- DCF NPV: ${report.financial.dcf?.npv?.toLocaleString() ?? "n/a"}
- Monte Carlo 중앙값(P50): ${mc?.results?.median?.toLocaleString() ?? "n/a"}
- Monte Carlo P5~P95: ${mc?.results?.p5?.toLocaleString() ?? "n/a"} ~ ${mc?.results?.p95?.toLocaleString() ?? "n/a"}
`.trim()

  return [
    {
      key: "executive",
      label: "경영진 요약",
      instruction: `위 수치를 기반으로 **경영진 요약(Executive Summary)** 을 3~5문단으로 작성하세요.
- 투자 등급과 핵심 수치를 첫 문단에 명시
- 주요 강점/약점을 간결하게 대비
- 의사결정자가 30초 안에 파악할 수 있게
- 한국어, 전문적 톤
${ctx}`,
    },
    {
      key: "collateral",
      label: "담보물 분석",
      instruction: `위 수치를 기반으로 **담보물 분석 의견**을 2~3문단으로 작성하세요.
- 감정가 대비 낙찰 가능성
- 물리적·환경적 리스크
- 유동성 평가
${ctx}`,
    },
    {
      key: "legal",
      label: "법률 리스크",
      instruction: `위 수치를 기반으로 **법률 의견**을 2~3문단으로 작성하세요.
- 권리관계 주요 리스크
- 임차인·선순위 채권 영향
- 배당 시뮬레이션 해석
- 대응 방안
${ctx}`,
    },
    {
      key: "financial",
      label: "재무 분석",
      instruction: `위 수치를 기반으로 **재무 분석 의견**을 2~3문단으로 작성하세요.
- DCF NPV 해석
- Monte Carlo 분포 해석
- 시나리오별 민감도
- IRR 평가
${ctx}`,
    },
    {
      key: "market",
      label: "시장 분석",
      instruction: `위 수치를 기반으로 **시장 분석 의견**을 2~3문단으로 작성하세요.
- 지역 시장 동향
- 최근 낙찰가율 추이
- 공급·수요 밸런스
- 매각 타이밍
${ctx}`,
    },
    {
      key: "conclusion",
      label: "투자 결론",
      instruction: `위 수치 전체를 종합하여 **투자 결론 및 권고**를 2~3문단으로 작성하세요.
- 최종 투자 의견 (BUY/HOLD/PASS 중 하나)
- 권장 매입가 범위
- 실행 시 핵심 체크포인트 3가지
- 면책 조항 1문장
${ctx}`,
    },
  ]
}

// ─── Route Handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let input: DDReportInput
  try {
    input = (await req.json()) as DDReportInput
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  if (!input.listingId || !input.propertyType || !input.region) {
    return new Response(
      JSON.stringify({ error: "listingId, propertyType, region 필수" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  const encoder = new TextEncoder()
  const ai = getAIService()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (name: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(name, data)))
        } catch {
          // controller 닫힘 — 무시
        }
      }

      // 클라이언트 abort 감지
      let aborted = false
      req.signal.addEventListener("abort", () => {
        aborted = true
      })

      try {
        // ─── Stage 1: 수학적 분석 (동기, 즉시 전송) ─────────────
        send("stage_start", { stage: "template", label: "수학적 분석" })
        const report = generateDDReport(input)
        send("template_ready", {
          investmentGrade: report.executive.investmentGrade,
          overallScore: report.executive.gradeScore,
          headline: report.executive.headline,
          keySummary: report.executive.keySummary,
          keyRisks: report.executive.keyRisks,
          expectedROI: report.executive.expectedROI,
          recommendedAction: report.executive.recommendedAction,
          sections: {
            collateral: report.collateral,
            legal: report.legal,
            financial: report.financial,
            market: report.market,
            opinion: report.opinion,
          },
          metadata: report.metadata,
          generatedAt: report.generatedAt,
        })
        send("stage_end", { stage: "template" })

        // ─── Stage 2~7: AI 서술 6개 섹션 순차 스트리밍 ──────────
        const narratives: Record<SectionKey, string> = {
          executive: "",
          collateral: "",
          legal: "",
          financial: "",
          market: "",
          conclusion: "",
        }

        if (!ai.isConfigured()) {
          send("warn", {
            message: "ANTHROPIC_API_KEY 미설정 — AI 서술을 생략하고 수학적 분석만 반환합니다.",
          })
        } else {
          const sections = buildSectionPrompts(input, report)
          const system = `당신은 글로벌 투자은행(Goldman Sachs, Morgan Stanley 수준)의 부동산 NPL 실사 보고서 작성 전문가입니다.
모든 서술은 수치 근거를 동반하며, 리스크를 과소평가하지 않고, 한국어로 작성합니다.`

          for (const sec of sections) {
            if (aborted) break

            send("stage_start", { stage: sec.key, label: sec.label })

            try {
              const chunkGen = ai.stream({
                messages: [{ role: "user", content: sec.instruction }],
                system,
                maxTokens: 1024,
              })

              for await (const chunk of chunkGen) {
                if (aborted) break
                if (chunk.type === "text" && chunk.text) {
                  narratives[sec.key] += chunk.text
                  send("text_delta", { stage: sec.key, text: chunk.text })
                } else if (chunk.type === "error") {
                  send("warn", { stage: sec.key, error: chunk.error ?? "섹션 스트리밍 오류" })
                  break
                }
              }
            } catch (err: any) {
              send("warn", { stage: sec.key, error: err?.message ?? "섹션 생성 실패" })
            }

            send("stage_end", { stage: sec.key })
          }
        }

        // ─── Stage 8: 최종 완료 ──────────────────────────────
        send("done", {
          narratives,
          modelVersion: "dd-report-sse-v1.0.0-2026-04",
        })
        controller.close()
      } catch (err: any) {
        send("error", { message: err?.message ?? "DD Report SSE 실패" })
        controller.close()
      }
    },

    cancel() {
      // 클라이언트 연결 끊김
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx proxy buffer 비활성
    },
  })
}
