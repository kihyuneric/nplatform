'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'

// ─── Static link config ───────────────────────────────────────
const SERVICE_LINKS = [
  { href: '/exchange', label: 'NPL 매물 탐색' },
  { href: '/exchange/sell', label: '매물 등록' },
  { href: '/deals', label: '거래 현황' },
  { href: '/analysis', label: '투자 분석' },
  { href: '/services', label: '전문가 서비스' },
  { href: '/pricing', label: '요금제' },
]

const COMPANY_LINKS = [
  { href: '/about', label: '플랫폼 소개' },
  { href: '/notices', label: '공지사항' },
  { href: '/support', label: '고객센터' },
  { href: '/partner', label: '파트너 신청' },
  { href: '/developer', label: '개발자 API' },
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

  const companyName = settings?.companyName || '(주)트랜스파머 | TransFarmer Inc.'
  const siteDescription = settings?.siteDescription || '금융기관과 투자자를 직접 연결하는 NPL 거래 플랫폼'
  const businessNumber = settings?.businessNumber || ''
  const ceoName = settings?.ceoName || ''
  const companyAddress = settings?.companyAddress || ''
  const contactPhone = settings?.contactPhone || ''
  const contactEmail = settings?.contactEmail || ''

  return (
    <footer
      className="mt-auto border-t border-[#1A2E4A] bg-[#060E1C]"
      aria-label="사이트 하단 정보"
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 pt-14 pb-10">

        {/* ── Main grid ────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-3">

          {/* Column 1 — Brand */}
          <div className="flex flex-col gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="w-8 h-8 bg-[#1B3A5C] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#0D1F38] transition-colors">
                <span className="text-white font-black text-sm tracking-tighter">N</span>
              </div>
              <div>
                <span className="font-black text-white text-base tracking-tight">NPL</span>
                <span className="font-light text-slate-400 text-base">atform</span>
              </div>
            </Link>

            {/* Tagline */}
            <p className="text-sm text-slate-400 leading-relaxed">
              {siteDescription}
            </p>

            {/* Company name */}
            <p className="text-sm text-slate-500">
              {companyName}
            </p>

            {/* Brief description */}
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              정보의 비대칭 속에서 금융기관과 투자자를 직접 연결합니다. NPL 매물 탐색부터 거래 완결까지 — AI가 지원하는 국내 최초 NPL 거래 플랫폼입니다.
            </p>
          </div>

          {/* Column 2 — Links */}
          <div className="grid grid-cols-2 gap-8">
            {/* 서비스 */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
                서비스
              </h4>
              <ul className="space-y-2.5">
                {SERVICE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 회사 */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
                회사
              </h4>
              <ul className="space-y-2.5">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
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
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
              사업자 정보
            </h4>
            <div className="space-y-2">
              {(businessNumber || !settings) && (
                <p className="text-xs text-slate-500">
                  사업자등록번호: {businessNumber || '000-00-00000'}
                </p>
              )}
              {(ceoName || !settings) && (
                <p className="text-xs text-slate-500">
                  대표: {ceoName || '—'}
                </p>
              )}
              {(companyAddress || !settings) && (
                <p className="text-xs text-slate-500 leading-relaxed">
                  {companyAddress || '서울특별시'}
                </p>
              )}
              {(contactPhone || !settings) && (
                <p className="text-xs text-slate-500">
                  Tel: {contactPhone || '—'}
                </p>
              )}
              {(contactEmail || !settings) && (
                <p className="text-xs text-slate-500">
                  Email:{' '}
                  <a
                    href={`mailto:${contactEmail || 'contact@nplatform.kr'}`}
                    className="hover:text-slate-300 transition-colors"
                  >
                    {contactEmail || 'contact@nplatform.kr'}
                  </a>
                </p>
              )}
            </div>

            {/* Legal notice */}
            <p className="mt-6 text-[11px] text-slate-600 leading-relaxed">
              본 플랫폼은 투자 정보 제공을 목적으로 하며, 투자 결과에 대한 법적 책임을 지지 않습니다. 모든 투자 판단은 이용자 본인에게 있습니다.
            </p>
          </div>
        </div>

        {/* ── Bottom bar ───────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-[#1A2E4A] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs text-slate-500">
              &copy; 2026 TransFarmer Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/terms/service"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                이용약관
              </Link>
              <span className="text-slate-700 text-xs">|</span>
              <Link
                href="/terms/privacy"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                개인정보처리방침
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-700 font-mono tracking-wide">
              NPLatform v12.0
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1A2E4A] text-[10px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              서비스 정상
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
