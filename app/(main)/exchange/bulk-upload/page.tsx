"use client"

/**
 * /exchange/bulk-upload
 *
 * CSV 대량 등록 기능은 일시 중단되었습니다.
 * 대량 등록은 NPLATFORM 고객센터(02-555-2822)로 직접 문의 바랍니다.
 *
 * 종전 구현: CSV 업로드 + 검증 + 일괄 등록 (~600 lines).
 * 사유: 데이터 정제·실사 품질 통제를 위해 운영 직접 수기 검수 단계로 회귀.
 */

import Link from "next/link"
import { Phone, ArrowLeft, FileSpreadsheet, Sparkles } from "lucide-react"
import DS from "@/lib/design-system"

export default function BulkUploadClosedPage() {
  return (
    <div className={DS.page.wrapper}>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div
          className="rounded-2xl border-2 p-8 sm:p-10"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            borderColor: "rgba(10,22,40,0.15)",
          }}
        >
          <div className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-wider mb-3" style={{ color: "#0A1628" }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#0A1628" }} />
            기능 일시 중단
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "#0A1628" }}>
            CSV 대량 등록은 운영 직접 처리로 전환되었습니다
          </h1>

          <p className="text-[0.9375rem] leading-relaxed text-[var(--color-text-secondary)] mb-6">
            데이터 정제·실사 품질 통제 강화를 위해 셀프 CSV 업로드는 일시 중단합니다.
            대량 등록(20건 이상)이 필요하신 경우 아래 고객센터로 직접 문의 주세요 — 매도자
            매니저가 1:1 상담 후 일괄 등록을 처리해드립니다.
          </p>

          {/* 고객센터 CTA */}
          <div
            className="rounded-xl p-5 mb-6"
            style={{ backgroundColor: "#0A1628" }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5" style={{ color: "#FFFFFF" }} />
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
                NPLATFORM 고객센터
              </span>
            </div>
            <a
              href="tel:02-555-2822"
              className="block text-3xl sm:text-4xl font-black tabular-nums hover:underline"
              style={{ color: "#FFFFFF", letterSpacing: "0.04em" }}
            >
              02-555-2822
            </a>
            <p className="text-[0.8125rem] mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>
              평일 09:00 ~ 18:00 · 매도자 등록 전담
            </p>
          </div>

          {/* 대안 경로 */}
          <div className="space-y-3">
            <p className="text-[0.75rem] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              개별 등록 (1~5건)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/exchange/sell"
                className="rounded-xl border-2 p-4 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.15)", color: "#0A1628" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="font-bold text-sm">단건 상세 등록</span>
                </div>
                <p className="text-[0.75rem]" style={{ color: "rgba(10,22,40,0.65)" }}>
                  6단계 위저드 + 엑셀 템플릿·OCR 자동 채움 지원
                </p>
              </Link>
              <Link
                href="/exchange/ocr-register"
                className="rounded-xl border-2 p-4 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.15)", color: "#0A1628" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-bold text-sm">OCR 일괄 등록 (1~5건)</span>
                </div>
                <p className="text-[0.75rem]" style={{ color: "rgba(10,22,40,0.65)" }}>
                  PDF·이미지 업로드 → AI 자동 필드 추출
                </p>
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)]">
            <Link
              href="/exchange"
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold hover:underline"
              style={{ color: "#0A1628" }}
            >
              <ArrowLeft className="w-4 h-4" /> 매물 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
