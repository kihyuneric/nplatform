'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'

// ─── Static link config ───────────────────────────────────────
const SERVICE_LINKS = [
  { href: '/exchange', label: 'NPL 매물 탐색' },
  { href: '/exchange/sell', label: '매물 등록' },
  { href: '/deals', label: '딜룸' },
  { href: '/deals/matching', label: 'AI 매칭' },
  { href: '/analysis', label: 'NPL 분석' },
  { href: '/pricing', label: '요금제' },
]

const COMPANY_LINKS = [
  { href: '/about', label: '플랫폼 소개' },
  { href: '/notices', label: '공지사항' },
  { href: '/support', label: '고객센터' },
  { href: '/guide', label: '이용 가이드' },
]

// ─── Footer ───────────────────────────────────────────────────
export function Footer() {
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/admin/site-settings')
      .then(r => r.json())
      .then(d => setSettings(d.data))
      .catch(() => {})
  }, [])

  const companyName = settings?.companyName || '트랜스파머(주) | Transfarmer Inc.'
  const siteDescription = settings?.siteDescription || '금융기관과 투자자를 직접 연결하는 NPL 거래 플랫폼'
  const businessNumber = settings?.businessNumber || '507-87-02631'
  const ceoName = settings?.ceoName || '김기현'
  const companyAddress = settings?.companyAddress || '서울 마포구 백범로31길 21, 서울창업허브 별관 108호'
  const companyAddress2 = settings?.companyAddress2 || '서울 종로구 서린동 154-1, 스타트업빌리지 5층'
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
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 pt-14 pb-10">

        {/* ── Main grid ────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-3">

          {/* Column 1 — Brand */}
          <div className="flex flex-col gap-4">
            {/* Logo — Electric Blue 강조 (McKinsey cobalt) */}
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div
                className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  background: "#2251FF",
                  borderTop: "2px solid #00A9F4",
                  boxShadow: "0 4px 10px rgba(34, 81, 255, 0.40)",
                }}
              >
                <span className="text-white font-black text-base tracking-tighter">N</span>
              </div>
              <div>
                <span className="font-black text-white text-base tracking-tight">NPL</span>
                <span className="font-light text-[var(--color-text-muted)] text-base">atform</span>
              </div>
            </Link>

            {/* Tagline */}
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              {siteDescription}
            </p>

            {/* Company name */}
            <p className="text-sm text-[var(--color-text-muted)]">
              {companyName}
            </p>

            {/* Brief description */}
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-xs">
              정보의 비대칭 속에서 금융기관과 투자자를 직접 연결합니다. NPL 매물 탐색부터 거래 완결까지 — 국내 최초 AI 기반 NPL 거래 플랫폼입니다.
            </p>
          </div>

          {/* Column 2 — Links */}
          <div className="grid grid-cols-2 gap-8">
            {/* 서비스 */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
                서비스
              </h4>
              <ul className="space-y-2.5">
                {SERVICE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 회사 */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
                회사
              </h4>
              <ul className="space-y-2.5">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 3 — Legal & Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
              사업자 정보
            </h4>
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-muted)]">
                사업자등록번호: {businessNumber}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                대표: {ceoName}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {companyAddress}
              </p>
              {companyAddress2 && (
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {companyAddress2}
                </p>
              )}
              <p className="text-xs text-[var(--color-text-muted)]">
                Tel: <a href={`tel:${contactPhone.replace(/[^0-9]/g, '')}`} className="hover:text-white transition-colors">{contactPhone}</a>
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Email:{' '}
                <a
                  href={`mailto:${contactEmail}`}
                  className="hover:text-white transition-colors"
                >
                  {contactEmail}
                </a>
              </p>
            </div>

            {/* Legal notice */}
            <p className="mt-6 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              본 플랫폼은 투자 정보 제공을 목적으로 하며, 투자 결과에 대한 법적 책임을 지지 않습니다. 모든 투자 판단은 이용자 본인에게 있습니다.
            </p>

            {/* DPO / regulator contact */}
            <div className="mt-4 space-y-1">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                개인정보보호책임자 ({dpoName}):{' '}
                <a href={`mailto:${dpoEmail}`} className="hover:text-white transition-colors">
                  {dpoEmail}
                </a>
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                통신판매중개업 신고번호: 2026-강원춘천-0136
              </p>
            </div>
          </div>
        </div>

        {/* ── Regulatory compliance strip · McKinsey mono editorial ─────────── */}
        <div className="mt-10 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
          {/* warm brass thin divider — editorial signature */}
          <div className="mb-4" style={{ height: 1, width: 48, background: "var(--color-editorial-gold, #2251FF)" }} />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ComplianceBadge label="개인정보보호법 준수" />
            <ComplianceBadge label="신용정보법 준수" />
            <ComplianceBadge label="전자금융거래법 준수" />
            <ComplianceBadge label="ISMS-P 준비 중" />
            <ComplianceBadge label="에스크로 자금보호" />
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed max-w-4xl">
            NPLatform(엔플랫폼)은 금융감독원 · 금융위원회의 개인정보 · 채무자정보 보호 지침에 따라 모든 매물 데이터에 대해
            자동 마스킹 파이프라인을 운영하며, 담보 부동산 정보, 채권 정보는 4단계 접근 통제
            (공개 / 투자기관 인증 / NDA 체결 / LOI · 승인) 모델로 보호합니다.
            등기부등본 · 권리관계 요약 등 추가 자료는 금융기관 정보 제공 수준에 따라 다를 수 있습니다.
          </p>
          <p className="mt-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed max-w-4xl">
            ※ 본 서비스는 「전자상거래 등에서의 소비자보호에 관한 법률」상 통신판매중개자이며, 거래 당사자가 아닙니다.
            매매 · 권리 · 의무의 당사자는 매도자(금융기관 등)와 매수자이며, 플랫폼은 중개 · 정보 제공 · 에스크로 역할만 수행합니다.
          </p>
        </div>

        {/* ── Bottom bar ───────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-[var(--color-brand-deep)]/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
