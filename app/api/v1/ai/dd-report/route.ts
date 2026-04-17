import { NextRequest, NextResponse } from "next/server"
import { generateDDReport, generateDDReportWithAI, type DDReportInput } from "@/lib/report/dd-report-generator"
import { generateInvestmentPDF } from "@/lib/report/investment-pdf"

/**
 * POST /api/v1/ai/dd-report
 *
 * v2: Claude AI가 전문가 수준의 서술을 자동 생성하는 DD 보고서
 *
 * query params:
 *   ?format=pdf      → 투자급 PDF 바이너리 반환
 *   ?recipient=이름  → PDF 워터마크 수신자
 *   ?engine=ai       → Claude AI 서술 생성 (기본값)
 *   ?engine=template → 기존 템플릿 기반 (빠른 응답)
 */
export async function POST(req: NextRequest) {
  try {
    const body: DDReportInput = await req.json()

    if (!body.listingId || !body.propertyType || !body.region) {
      return NextResponse.json(
        { error: "listingId, propertyType, region 필수" },
        { status: 400 },
      )
    }

    const engine = req.nextUrl.searchParams.get("engine") ?? "ai"
    const wantPdf = req.nextUrl.searchParams.get("format") === "pdf"

    // 보고서 생성
    const report = engine === "ai"
      ? await generateDDReportWithAI(body)
      : generateDDReport(body)

    // PDF 출력
    if (wantPdf) {
      const recipientName = req.nextUrl.searchParams.get("recipient") ?? "수신자"
      const pdfBytes = await generateInvestmentPDF(report, {
        recipientName,
        confidentiality: report.confidentiality,
        language: "ko",
      })

      const buf = Buffer.from(pdfBytes)
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="DD_Report_${body.listingId}.pdf"`,
        },
      })
    }

    // JSON 출력 — v3: 프론트엔드 차트/테이블에 필요한 전체 데이터 포함
    const isAI = "aiNarratives" in report

    return NextResponse.json({
      ok: true,
      engine: isAI ? "ai" : "template",
      data: {
        investmentGrade: report.executive.investmentGrade,
        overallScore: report.executive.gradeScore,
        headline: report.executive.headline,
        keySummary: report.executive.keySummary,
        riskSummary: report.executive.keyRisks,
        roiRange: report.executive.expectedROI,
        recommendedAction: report.executive.recommendedAction,
        sections: {
          collateral: {
            basicInfo: report.collateral.basicInfo,
            valuation: report.collateral.valuation,
            physicalInspection: report.collateral.physicalInspection,
            environmentalRisk: report.collateral.environmentalRisk,
          },
          legal: {
            ownershipChain: report.legal.ownershipChain,
            mortgageStructure: report.legal.mortgageStructure,
            tenantRisk: report.legal.tenantRisk,
            seizures: report.legal.seizures,
            dividendSimulation: report.legal.dividendSimulation,
          },
          financial: {
            dcf: report.financial.dcf,
            monteCarlo: report.financial.monteCarlo,
            scenarios: report.financial.scenarios,
            sensitivity: report.financial.sensitivity,
            metrics: report.financial.metrics,
          },
          market: {
            nbiTrend: report.market.nbiTrend,
            bidRateTrend: report.market.regionBidRateTrend,
            recentTransactions: report.market.recentTransactions,
            supplyDemand: report.market.supplyDemand,
          },
          opinion: report.opinion,
        },
        // v2: AI 서술 포함
        ...(isAI ? {
          aiNarratives: (report as any).aiNarratives,
          aiDiscoveredRisks: (report as any).aiDiscoveredRisks,
        } : {}),
        metadata: report.metadata,
        generatedAt: report.generatedAt,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "DD 보고서 생성 실패" },
      { status: 500 },
    )
  }
}
