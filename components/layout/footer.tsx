'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'

// ─── Footer ───────────────────────────────────────────────────
// 2026-08-18: 서비스·회사 링크 컬럼 삭제 (메인 네비와 중복) · 사업자 정보 가로형
export function Footer() {
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/admin/site-settings')
      .then(r => r.json())
      .then(d => setSettings(d.data))
      .catch(() => {})
  }, [])

  const companyName = settings?.companyName || '트랜스파머(주) | Transfarmer Inc.'
  const siteDescription = settings?.siteDescription || '대한민국 1%를 위한 프라이빗 NPL 플랫폼'
  const businessNumber = settings?.businessNumber || '507-87-02631'
  const ceoName = settings?.ceoName || '김기현'
  const companyAddress = settings?.companyAddress || '서울시 서초구 서초대로77길 55, 에이프로스퀘어 7층 KB이노베이션허브'
  const contactPhone = settings?.contactPhone || '02-555-2822'
  const contactEmail = settings?.contactEmail || 'ceo@transfarmer.co.kr'
  const dpoName = settings?.dpoName || '박성필'
  const dpoEmail = settings?.dpoEmail || 'sp.park@transfarmer.co.kr'

  return (
    <footer
      // Phase H1 · 의도적 다크 톤 유지 (라이트 모드에서도 다크 푸터는 핀테크 표준 패턴)
      // 단, 하드코딩 → 브랜드 토큰으로 교체하여 향후 색상 변경 시 일괄 적용 가능
      className="mt-auto border-t border-[var(--color-brand-deep)]/40 bg-[var(--color-brand-deepest)]"
      aria-label="사이트 하단 정보"
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 pt-8 pb-6">

        {/* ── Brand — 로고 + 태그라인 한 줄 (타이트) ────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-2 group w-fit shrink-0">
            <div
              className="w-7 h-7 flex items-center justify-center flex-shrink-0"
              style={{ background: "#0A1220", border: "1px solid rgba(191, 164, 118, 0.45)" }}
            >
              <span style={{ color: "#BFA476", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 15, lineHeight: 1 }}>N</span>
            </div>
            <span
              className="text-white"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}
            >
              nplatform
            </span>
          </Link>
          <p className="text-xs text-[var(--color-text-muted)]">
            {siteDescription} · 매입조건에 매칭되는 딜만 선별하여 공개합니다.
          </p>
        </div>

        {/* ── 사업자 정보 — 가로형 (회사별 1줄, 타이트) ── */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            사업자 정보
          </h4>
          <div className="space-y-1">
            {/* 운영사 — 1줄 가로 나열 (모바일에서 자동 줄바꿈) */}
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              <span className="font-bold text-white/70">엔플랫폼 운영사</span>
              <span className="mx-2 opacity-40">|</span>
              트랜스파머(주)
              <span className="mx-2 opacity-40">·</span>
              대표: {ceoName}
              <span className="mx-2 opacity-40">·</span>
              사업자등록번호: {businessNumber}
              <span className="mx-2 opacity-40">·</span>
              {companyAddress}
            </p>
            {/* 공동운영사 — 1줄 가로 나열 */}
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              <span className="font-bold text-white/70">엔플랫폼 공동운영사</span>
              <span className="mx-2 opacity-40">|</span>
              (주)바른엔피엘대부
              <span className="mx-2 opacity-40">·</span>
              대표: 안영훈
              <span className="mx-2 opacity-40">·</span>
              사업자등록번호: 899-87-01356
              <span className="mx-2 opacity-40">·</span>
              서울특별시 강남구 영동대로 725 4층 E-04호
            </p>
            {/* 공동운영사 2 — 조선일보 땅집고 */}
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              <span className="font-bold text-white/70">엔플랫폼 공동운영사</span>
              <span className="mx-2 opacity-40">|</span>
              조선일보 땅집고(주식회사 엠딕)
              <span className="mx-2 opacity-40">·</span>
              대표: 유하용
              <span className="mx-2 opacity-40">·</span>
              사업자등록번호: 478-88-01291
              <span className="mx-2 opacity-40">·</span>
              서울특별시 중구 세종대로 21길 22, 2층
            </p>
            {/* 공동운영사 3 — 어썸공인중개사사무소 */}
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              <span className="font-bold text-white/70">엔플랫폼 공동운영사</span>
              <span className="mx-2 opacity-40">|</span>
              어썸공인중개사사무소
              <span className="mx-2 opacity-40">·</span>
              대표: 신지안
              <span className="mx-2 opacity-40">·</span>
              개업 등록: 11680-2022-00030
              <span className="mx-2 opacity-40">·</span>
              서울시 강남구 영동대로 721, 1303호
              <span className="mx-2 opacity-40">·</span>
              <a href="tel:050713886031" className="hover:text-white transition-colors">0507-1388-6031</a>
            </p>
            {/* 연락처 · 책임자 — 1줄 가로 나열 */}
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              엔플랫폼 문의: <a href={`tel:${contactPhone.replace(/[^0-9]/g, '')}`} className="hover:text-white transition-colors">{contactPhone}</a>
              <span className="mx-2 opacity-40">·</span>
              Email: <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">{contactEmail}</a>
              <span className="mx-2 opacity-40">·</span>
              개인정보보호책임자 ({dpoName}): <a href={`mailto:${dpoEmail}`} className="hover:text-white transition-colors">{dpoEmail}</a>
              <span className="mx-2 opacity-40">·</span>
              통신판매중개업 신고번호: 2026-강원춘천-0136
            </p>
          </div>

          {/* Legal notice — 면책 + 통신판매중개자 통합 1문단 (타이트) */}
          <p className="mt-3 text-[10.5px] text-[var(--color-text-muted)] leading-relaxed max-w-5xl" style={{ opacity: 0.85 }}>
            본 플랫폼은 NPL 정보 제공을 목적으로 하며, 투자 결과에 대한 법적 책임을 지지 않습니다. 모든 투자 판단은 이용자 본인에게 있습니다.
            ※ 본 서비스는 「전자상거래 등에서의 소비자보호에 관한 법률」상 통신판매중개자이며, 거래 당사자가 아닙니다.
          </p>
        </div>

        {/* ── Compliance badges — 1줄 (타이트) ──────────── */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <ComplianceBadge label="개인정보보호법 준수" />
          <ComplianceBadge label="신용정보법 준수" />
          <ComplianceBadge label="전자금융거래법 준수" />
          <ComplianceBadge label="ISMS-P 준비 중" />
        </div>

        {/* ── Bottom bar ───────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-[var(--color-brand-deep)]/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              &copy; 2026 트랜스파머(주) Transfarmer Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/terms/service"
                className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                서비스 이용약관
              </Link>
              <span className="text-[var(--color-border-subtle)] text-xs">|</span>
              <Link
                href="/terms/privacy"
                className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                개인정보처리방침
              </Link>
              <span className="text-[var(--color-border-subtle)] text-xs">|</span>
              <Link
                href="/terms/email-policy"
                className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                이메일 무단수집거부
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono tracking-wide">
              NPLatform v12.0
            </span>
            {/* 서비스 상태 — mono editorial: brass dot + 흰톤 글씨 */}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <span className="w-1.5 h-1.5 inline-block" style={{ background: "var(--color-editorial-gold, #2251FF)" }} />
              서비스 정상
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Compliance badge · McKinsey Sky Blue editorial ──────────────────────────
// 모든 뱃지 sky blue 컬러로 통일 — 가독성 ↑ + 컴플라이언스 시그니처
function ComplianceBadge({ label }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold"
      style={{
        background: "rgba(168, 205, 232, 0.18)",
        color: "#A8CDE8",
        border: "1px solid rgba(168, 205, 232, 0.45)",
        borderRadius: 0,
        letterSpacing: "0.02em",
      }}
    >
      <span
        className="w-1 h-1 inline-block"
        style={{ background: "#A8CDE8" }}
      />
      {label}
    </span>
  )
}
