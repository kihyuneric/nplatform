'use client'

/**
 * /about — 서비스 소개 (2026-08-17 · 대표 확정 문안)
 *
 * 구조:
 *   1. 표준 페이지 헤더 (전 메뉴 공통 포맷)
 *   2. 핵심 선언 — "수천 건 중, 필요한 단 몇 건"
 *   3. 진행 프로세스 6단계 (매각 의뢰 → 매칭·협의)
 *   4. 매각사 / 매입사 각각에게
 *   5. CTA
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MckPageShell, MckPageHeader } from '@/components/mck'
import { ArrowRight, FileText, ShieldCheck, Handshake, Megaphone, Users, Target, Printer, ExternalLink, Newspaper } from 'lucide-react'

const INK = '#0A1628'
const ELECTRIC = '#2251FF'
const PAPER = '#FFFFFF'

const STEPS = [
  {
    n: '01',
    icon: FileText,
    title: '매각 의뢰 · 등록',
    desc: '매각사가 보유 부실채권·부동산 리스트를 파일로 첨부해 매각 자문·마케팅을 의뢰합니다. 엔플랫폼이 수수료 협의 후 등록을 대행하고, 민감정보는 비식별화 처리해 등재합니다.',
  },
  {
    n: '02',
    icon: Megaphone,
    title: '마케팅 · 매칭',
    desc: '매입사 Pool과 보유 플랫폼(엔플랫폼·땅집고옥션), 언론 채널로 마케팅을 진행하고, 검증된 매입사의 매입조건에 맞는 물건만 선별해 1:1 로 제시합니다.',
  },
  {
    n: '03',
    icon: Handshake,
    title: '미팅 · 거래 성사',
    desc: 'NDA·상담 요청 고객은 엔플랫폼이 1차 미팅을 진행하고, 금융기관과의 2차 미팅·협의로 연결해 거래를 완결합니다.',
  },
]

export default function AboutPage() {
  // ── 언론보도 — 운영 관리자(/admin/press) CRUD 연동, 제목 클릭 시 새창 ──
  const [press, setPress] = useState<Array<{ id: string; title: string; url: string; photo_url?: string }>>([])
  useEffect(() => {
    fetch('/api/v1/press')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d?.data)) setPress(d.data) })
      .catch(() => {})
  }, [])

  return (
    <MckPageShell variant="tint">
      {/* ── 인쇄/PDF 최적화 (사업설명회 원페이저 배포용) ── */}
      <style>{`
        @media print {
          header, footer, nav,
          [role="navigation"],
          .no-print,
          [class*="mobile-tab"], [class*="chat"], [class*="Toaster"] {
            display: none !important;
          }
          body { background: #FFFFFF !important; }
          .print-onepager { padding: 0 !important; }
          .print-onepager section { break-inside: avoid; margin-bottom: 24px !important; padding: 24px !important; }
          .print-onepager a[href]:after { content: '' !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <MckPageHeader
        eyebrow="About NPLatform · 엔플랫폼"
        title="NPLATFORM 소개"
        subtitle="대한민국 1%를 위한 프라이빗 NPL 플랫폼 — 매입조건에 매칭되는 딜만 선별하여 공개합니다."
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', fontSize: 12, fontWeight: 800,
              background: PAPER, color: INK, border: `1px solid ${INK}`,
              cursor: 'pointer',
            }}
          >
            <Printer size={14} /> 인쇄 / PDF 저장
          </button>
        }
      />

      <div className="max-w-[1080px] mx-auto print-onepager" style={{ padding: '48px 24px 80px' }}>

        {/* ── 핵심 선언 ── */}
        <section
          style={{
            background: INK,
            borderTop: `3px solid ${ELECTRIC}`,
            padding: '48px 40px',
            marginBottom: 56,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: '#00A9F4', textTransform: 'uppercase', marginBottom: 14 }}>
            Curation over Volume
          </div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)', fontWeight: 800, color: PAPER, lineHeight: 1.25, letterSpacing: '-0.02em', wordBreak: 'keep-all' }}>
            수천 건의 부실채권 중,<br />
            매입사에게 필요한 단 몇 건을 선별하고 제시하며 협의합니다.
          </h2>
          <p style={{ marginTop: 16, fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, maxWidth: 640, wordBreak: 'keep-all' }}>
            엔플랫폼은 정보의 비대칭 속에서 매칭을 만듭니다.
            <br />
            리스트를 쏟아내는 대신, 검증된 매입사의 매입조건에 맞는 물건만 1:1 로 연결합니다.
          </p>
        </section>

        {/* ── 프로세스 6단계 ── */}
        <section style={{ marginBottom: 56 }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ width: 18, height: 1.5, background: ELECTRIC, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: ELECTRIC, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              How It Works · 진행 프로세스
            </span>
          </div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: INK, letterSpacing: '-0.02em', marginBottom: 28 }}>
            매각 의뢰부터 거래 촉진까지
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map(s => (
              <article
                key={s.n}
                style={{
                  background: PAPER,
                  border: '1px solid rgba(5, 28, 44, 0.10)',
                  borderTop: `2px solid ${ELECTRIC}`,
                  padding: '22px 20px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 800, color: ELECTRIC, letterSpacing: '-0.02em' }}>
                    {s.n}
                  </span>
                  <s.icon size={18} style={{ color: 'rgba(5, 28, 44, 0.45)' }} />
                </div>
                <h4 style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 800, color: INK, letterSpacing: '-0.01em' }}>
                  {s.title}
                </h4>
                <p style={{ fontSize: 13, color: 'rgba(5, 28, 44, 0.65)', lineHeight: 1.6, fontWeight: 500, wordBreak: 'keep-all' }}>
                  {s.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 매각사 / 매입사 ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ marginBottom: 56 }}>
          <article style={{ background: PAPER, border: '1px solid rgba(5, 28, 44, 0.10)', borderTop: `2px solid ${ELECTRIC}`, padding: '28px 26px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#1A47CC', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
              매각사에게
            </div>
            <h4 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 800, color: INK, marginBottom: 10 }}>
              파일만 올리면, 나머지는 엔플랫폼이
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, color: INK, fontWeight: 600 }}>
              <li>✓ 등록 대행 + 민감정보 비식별화</li>
              <li>✓ 매입사 Pool · 플랫폼 · 언론 마케팅</li>
              <li>✓ 대시보드에서 마케팅 진행 · 관심 · NDA · 상담 현황 실시간 확인</li>
              <li>✓ 1차 미팅은 엔플랫폼이 대신 진행</li>
            </ul>
            <Link href="/exchange/sell" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 18, padding: '11px 18px', background: INK, color: PAPER, borderTop: `2px solid ${ELECTRIC}`, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              NPL 매각의뢰 <ArrowRight size={14} />
            </Link>
          </article>

          <article style={{ background: PAPER, border: '1px solid rgba(5, 28, 44, 0.10)', borderTop: `2px solid ${ELECTRIC}`, padding: '28px 26px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#1A47CC', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
              매입사 · 투자자에게
            </div>
            <h4 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 800, color: INK, marginBottom: 10 }}>
              조건만 등록하면, 맞는 물건만 온다
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, color: INK, fontWeight: 600 }}>
              <li>✓ 지역 · 유형 · 금액대 — 우선순위별 매입조건 등록</li>
              <li>✓ 조건에 맞는 물건만 1:1 로 소개 (나머지는 보이지 않음)</li>
              <li>✓ 관심 등록 → NDA 체결 후 상세 전체 공개</li>
              <li>✓ 엔플랫폼 1차 미팅 → 금융기관 2차 협의 동행</li>
            </ul>
            <Link href="/exchange/demands/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 18, padding: '11px 18px', background: PAPER, color: INK, border: `1px solid ${INK}`, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              매입조건 등록 <ArrowRight size={14} />
            </Link>
          </article>
        </section>

        {/* ── 운영사 소개 · 트랜스파머(주), 땅집고옥션 ── */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#1A47CC', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
            회사소개
          </div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.4rem, 2.8vw, 1.9rem)', fontWeight: 800, color: INK, letterSpacing: '-0.02em', marginBottom: 10 }}>
            NPLATFORM 운영사 트랜스파머(주) 소개
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(5, 28, 44, 0.70)', fontWeight: 500, lineHeight: 1.65, maxWidth: 760, marginBottom: 24 }}>
            트랜스파머(주)는 부동산과 금융을 융합한 핀테크 기업으로 부동산 담보부 경/공매 및
            부실채권(NPL) 분석에서 차별화된 기술 경쟁력을 갖고 있습니다.
          </p>

          {/* 연혁 · 수상 — 2열 리스트 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: 'rgba(5, 28, 44, 0.10)', border: '1px solid rgba(5, 28, 44, 0.10)', marginBottom: 28 }}>
            {/* 연월 오름차순 정렬 (2026-08-18 사용자 지시) */}
            {[
              ['2023.03', '트랜스파머(주) 설립'],
              ['2024.12', 'NH농협중앙회 65개 지점 부실채권 분석 및 딜소싱 PoC'],
              ['2025.05', '땅집고옥션 런칭'],
              ['2025.09', '금융위원회 KB국민은행 여신관리부 위탁테스트(NPL 평가 시스템) 기업 선정'],
              ['2025.09', '국토교통부 부동산서비스산업 창업경진대회 최우수상'],
              ['2025.10', '토스 우수파트너사(AI 경/공매 서비스) 선정'],
              ['2025.10', '한국언론진흥재단 미디어스타트업(부동산 뉴스 분석 서비스) 장려상'],
              ['2025.10', 'NPLATFORM 시범 서비스'],
              ['2025.11', '캠코 Startup TechBlaze 우수상'],
              ['2026.01', 'XRPL Korea 글로벌 NPL 거래 PoC 및 MOU'],
              ['2026.04', 'KB국민은행 위탁테스트 위수탁 계약'],
              ['2026.06', 'K뱅크 AI경/공매서비스 운영사 선정'],
              ['2026.07', 'KFIC 한국핀테크이노베이션 프로그램 우수상 선정'],
              ['2026.09', 'NPLATFORM 정식 런칭'],
            ].map(([ym, desc]) => (
              <div key={`${ym}-${desc}`} style={{ background: PAPER, padding: '14px 18px', display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14, alignItems: 'baseline' }}>
                {/* 날짜 고정폭 컬럼 — 내용 시작 라인 통일 */}
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 800, color: '#1A47CC', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{ym}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* 이미지 + 설명 카드 — /public/images/about/ 에 파일 배치 시 자동 표시 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { src: '/images/about/molit-award.jpg', title: '국토부 부동산 서비스산업 경진대회 최우수상', year: '2025' },
              { src: '/images/about/kb-fiu-test.jpg', title: '금융위 위탁테스트 기업 선정 (KB 국민은행)', year: '2025' },
              { src: '/images/about/ddangjipgo-mou.jpg', title: '조선일보 땅집고 공동사업 제휴 계약식', year: '2025' },
              { src: '/images/about/nh-mou.jpg', title: '농협중앙회 NPL 거래플랫폼 구축 MOU', year: '2024' },
            ].map(p => (
              <figure key={p.title} style={{ background: PAPER, border: '1px solid rgba(5, 28, 44, 0.10)', borderTop: `2px solid ${ELECTRIC}`, overflow: 'hidden', margin: 0 }}>
                <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'linear-gradient(135deg, #EEF1F6 0%, #E2E8F0 100%)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(5, 28, 44, 0.35)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700 }}>사진 준비중</span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }}
                    onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <figcaption style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: INK, lineHeight: 1.4 }}>{p.title}</div>
                  <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: 'rgba(5, 28, 44, 0.50)' }}>{p.year}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── 언론보도 — 제목 + URL (새창) · 관리자 /admin/press 에서 등록·수정·삭제 ── */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#1A47CC', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
            Press · 언론보도
          </div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.4rem, 2.8vw, 1.9rem)', fontWeight: 800, color: INK, letterSpacing: '-0.02em', marginBottom: 16 }}>
            언론보도
          </h3>
          {press.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', background: PAPER, border: '1px dashed rgba(5, 28, 44, 0.20)' }}>
              <Newspaper size={22} style={{ color: 'rgba(5, 28, 44, 0.35)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(5, 28, 44, 0.55)' }}>등록된 언론보도가 없습니다.</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(5, 28, 44, 0.10)', border: '1px solid rgba(5, 28, 44, 0.10)', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {press.map(a => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: PAPER, padding: '12px 18px', textDecoration: 'none',
                  }}
                >
                  {/* 좌측 썸네일 */}
                  <span style={{ width: 84, height: 56, flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #EEF1F6 0%, #E2E8F0 100%)', border: '1px solid rgba(5, 28, 44, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Newspaper size={16} style={{ color: 'rgba(5, 28, 44, 0.30)' }} />
                    {a.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.photo_url}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }}
                        onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: INK, lineHeight: 1.5 }}>{a.title || a.url}</span>
                  <ExternalLink size={14} style={{ color: '#1A47CC', flexShrink: 0 }} />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* ── CTA ── */}
        <section style={{ background: INK, borderTop: `3px solid ${ELECTRIC}`, padding: '36px 32px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.3rem, 2.6vw, 1.8rem)', fontWeight: 800, color: PAPER, letterSpacing: '-0.02em', marginBottom: 8 }}>
            그들만의 리그, NPL 딜이 열리는 곳
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>
            NDA 기반 · 최소 정보 · 1:1 매칭
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/exchange" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', background: ELECTRIC, color: PAPER, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              NPL 자동매칭 보기 <ArrowRight size={14} />
            </Link>
            <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', background: 'transparent', color: PAPER, border: '1px solid rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              회원가입
            </Link>
          </div>
        </section>
      </div>
    </MckPageShell>
  )
}
