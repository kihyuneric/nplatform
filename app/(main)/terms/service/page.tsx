"use client"

/**
 * /terms/service — 서비스 이용약관 (McKinsey editorial)
 *
 * 디자인:
 *   - White paper + ink black + electric blue accent
 *   - Georgia serif for 제목·조 번호
 *   - Sticky 좌측 목차 (lg+) · 본문 우측
 *   - 18조 + 부칙
 */

import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

const MCK_INK = "#0A1628"
const MCK_ELECTRIC = "#2251FF"
const MCK_PAPER = "#FFFFFF"
const MCK_INK_MID = "rgba(5, 28, 44, 0.65)"
const MCK_BORDER = "rgba(5, 28, 44, 0.10)"
const MCK_BORDER_STRONG = "rgba(5, 28, 44, 0.20)"

type Article = {
  no: string
  title: string
  body: React.ReactNode
}

const ARTICLES: Article[] = [
  {
    no: "1",
    title: "목적",
    body: (
      <p>
        본 약관은 트랜스파머 주식회사(이하 &ldquo;회사&rdquo;)가 제공하는 엔플랫폼(NPLatform) 서비스의 이용과 관련하여,
        회원 또는 비회원의 권리·의무 및 서비스 이용 조건 등 필요한 사항을 규정함을 목적으로 합니다.
      </p>
    ),
  },
  {
    no: "2",
    title: "용어의 정의",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li><strong>&ldquo;서비스&rdquo;</strong>란 회사가 운영하는 플랫폼을 통해 제공되는 모든 정보, 거래, 분석, 마케팅, 컨설팅 및 기타 관련 제반 기능을 포함한 일체의 온라인·모바일 기반 서비스를 말합니다.</li>
        <li><strong>&ldquo;회원&rdquo;</strong>이란 본 약관에 동의하고 회사와 이용계약을 체결하여 서비스를 이용하는 개인 또는 법인을 말합니다.</li>
        <li><strong>&ldquo;이용자&rdquo;</strong>란 회원 및 비회원을 포함하여 회사가 제공하는 서비스를 이용하는 모든 자를 말합니다.</li>
        <li><strong>&ldquo;매각사&rdquo;</strong>란 자산, 권리, 정보 등을 서비스에 등록하거나 제공하는 개인 또는 법인, 기관을 말합니다.</li>
        <li><strong>&ldquo;매입사(시행사·시공사)&rdquo;</strong>란 서비스 내에서 제공되는 자산, 권리, 정보 등에 대해 열람, 입찰, 계약, 투자 등의 행위를 하는 개인 또는 법인, 단체를 말합니다.</li>
        <li><strong>&ldquo;투자자&rdquo;</strong>란 정보 열람 및 일부 입찰에 참여할 수 있는 일반 투자자를 말합니다.</li>
        <li><strong>&ldquo;유료서비스&rdquo;</strong>란 회사가 유상으로 제공하는 프리미엄 기능, 데이터 분석, 리포트, 광고, 마케팅, 입찰 지원, 컨설팅 등의 서비스를 말합니다.</li>
        <li><strong>&ldquo;콘텐츠&rdquo;</strong>란 서비스 내에서 제공되거나 이용자가 등록한 모든 데이터, 문서, 이미지, 영상, 음성, 리포트, 소프트웨어, 기타 자료 일체를 말합니다.</li>
        <li><strong>&ldquo;포인트&rdquo;</strong>란 회사가 정한 기준에 따라 적립·차감되어 서비스 내에서 사용 가능한 가상의 결제 수단 또는 가치 단위를 말합니다.</li>
      </ol>
    ),
  },
  {
    no: "3",
    title: "약관의 게시와 효력 및 개정",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>본 약관은 서비스에 가입한 이용자에게 적용되며, 이용자가 약관에 동의함으로써 효력이 발생합니다.</li>
        <li>회사는 관련 법령을 위반하지 않는 범위 내에서 본 약관을 개정할 수 있습니다.</li>
        <li>개정 약관은 공지사항 및 전자적 수단(이메일, 팝업 등)을 통해 최소 7일 전(회원에게 불리한 경우 30일 전) 고지합니다.</li>
        <li>회원이 고지일까지 별도 거부 의사를 표시하지 않고 서비스를 계속 이용하는 경우, 개정 약관에 동의한 것으로 간주합니다.</li>
      </ol>
    ),
  },
  {
    no: "4",
    title: "약관의 해석",
    body: <p>본 약관에서 정하지 아니한 사항은 관련 법령, 상관례 및 회사의 개별 정책에 따릅니다.</p>,
  },
  {
    no: "5",
    title: "이용계약의 체결",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>이용계약은 회원이 약관에 동의하고 회사가 정한 절차에 따라 가입을 완료함으로써 성립합니다.</li>
        <li>회사는 본인 인증, 사업자 등록 확인 등 절차를 요구할 수 있으며, 심사 결과에 따라 승인을 제한할 수 있습니다.</li>
      </ol>
    ),
  },
  {
    no: "6",
    title: "회원 구분 및 권한",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li><strong>매각사</strong> : 자산, 권리, 정보 등을 플랫폼에 등록하거나 매각·공급을 주관하며, 자료 작성, 공개 범위 설정, 마케팅 요청 등 등록 및 유통과 관련된 일체의 서비스 이용이 가능합니다.</li>
        <li><strong>매입사(시행사·시공사)</strong> : 등록된 자산 또는 정보에 대해 열람, 검토, 협의, 입찰, 계약 등 거래 또는 투자에 필요한 서비스 이용이 가능합니다.</li>
        <li><strong>투자자</strong> : 공개된 정보의 열람, 일부 거래 참여, 상담 요청, 분석 리포트 이용 등 일반적인 서비스 이용이 가능합니다.</li>
        <li>회원의 등급, 권한 및 이용 범위는 회사의 정책에 따라 신설·변경될 수 있습니다.</li>
      </ol>
    ),
  },
  {
    no: "7",
    title: "이용자의 권리와 의무",
    body: (
      <div className="space-y-4">
        <div>
          <p className="font-semibold mb-2" style={{ color: MCK_INK }}>① 이용자는 다음의 권리를 가집니다.</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>회사가 제공하는 서비스 및 콘텐츠를 약관과 정책이 정한 범위 내에서 이용할 권리</li>
            <li>유료서비스 이용 시 결제 내역 및 이용 기간에 대한 명확한 고지 및 관리 권리</li>
            <li>개인정보의 보호 및 관련 법령에 따른 권리 행사</li>
            <li>계약 해지 및 환불 요청(제15조에 따름)</li>
            <li>회사가 제공하는 데이터, 분석결과, 리포트 등의 열람 및 활용(단, 허용된 범위 내에서만 가능)</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-2" style={{ color: MCK_INK }}>② 이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>허위 정보 등록, 타인의 정보 도용 또는 부정 이용</li>
            <li>회사 또는 제3자의 지식재산권, 개인정보, 명예, 영업비밀 등 권리 침해 행위</li>
            <li>회사가 제공하는 자료, 데이터, 분석 결과를 무단 복제·배포·상업적 재이용하는 행위</li>
            <li>시스템 해킹, 크롤링, 자동화 프로그램 등을 통한 비정상적 접근</li>
            <li>AI 분석, 데이터베이스, 콘텐츠 등을 외부에 무단 공개하거나 기술적 보호조치를 회피하는 행위</li>
            <li>불법적·비윤리적 행위 또는 서비스의 안정적 운영을 방해하는 일체의 행위</li>
          </ul>
        </div>
        <p>③ 회사는 이용자의 위반 행위가 확인될 경우, 사전 통보 없이 서비스 이용 제한, 계정 정지 또는 계약 해지 등의 조치를 취할 수 있으며, 필요한 경우 법적 조치를 병행할 수 있습니다.</p>
      </div>
    ),
  },
  {
    no: "8",
    title: "서비스의 제공",
    body: (
      <div className="space-y-3">
        <p>① 회사는 다음 각 호의 서비스를 포함하여 플랫폼 운영 목적상 필요한 서비스를 제공합니다.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>자산, 권리, 정보 등의 등록 및 자동화 지원 서비스 (AI 인식, 데이터 변환 등 기술 기반)</li>
          <li>실시간 분석 및 리포트 제공 서비스 (시세, 가치평가, 거래 가능성, 수익률 등)</li>
          <li>거래 의사표시, 협의, 계약 체결 등 거래 과정 지원 서비스</li>
          <li>마케팅, 리드 수집, 데이터 기반 프로모션 등 비즈니스 지원 서비스</li>
          <li>외부 플랫폼, 제휴사, 광고 채널과의 연계 서비스</li>
        </ul>
        <p>② 회사는 서비스의 품질 향상과 기능 개선을 위하여 AI 알고리즘, 데이터 처리 방식, UI/UX, 콘텐츠 구성 등을 수시로 업데이트하거나 변경할 수 있습니다.</p>
      </div>
    ),
  },
  {
    no: "9",
    title: "서비스의 중단 및 변경",
    body: (
      <div className="space-y-3">
        <p>① 회사는 다음 사유가 발생한 경우 서비스 제공을 중단할 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>시스템 점검, 장애, 정기 보수</li>
          <li>천재지변, 전쟁, 통신장애 등 불가항력 사유</li>
          <li>법령·정책 변경으로 인한 서비스 중단 필요 시</li>
        </ul>
        <p>② 서비스 변경·중단 시 사전에 공지하며, 무료 서비스에 대해서는 보상하지 않습니다.</p>
      </div>
    ),
  },
  {
    no: "10",
    title: "AI 분석 및 데이터 제공에 대한 면책",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>AI 분석 결과, 리포트, 예측 수치 등은 참고용 자료로 제공되며, 실제 거래와 차이가 있을 수 있습니다.</li>
        <li>이용자는 반드시 법원 공고, 등기부등본, 감정평가서 등 공식 자료를 확인한 후 입찰·계약을 진행해야 하며, 이를 확인하지 않아 발생한 손해에 대해 회사는 책임을 지지 않습니다.</li>
        <li>AI가 자동 생성한 문서나 리포트의 오류로 인한 손해에 대해서도 회사는 법령상 고의·중과실이 없는 한 책임을 지지 않습니다.</li>
      </ol>
    ),
  },
  {
    no: "11",
    title: "수수료 및 결제",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>매각사 및 매입사는 회사와의 협의에 따라 매각 자문수수료, 매수 자문수수료, 마케팅 수수료 등을 부담합니다.</li>
        <li>투자자는 열람권·AI 리포트 등 유료서비스를 별도 결제 후 이용할 수 있습니다.</li>
        <li>결제금액에는 부가가치세가 포함됩니다.</li>
      </ol>
    ),
  },
  {
    no: "12",
    title: "환불 규정",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>유료서비스는 구매일 기준으로 이용기간 내 환불을 요청할 수 있습니다.</li>
        <li>이용 당일 미사용 시 전액 환불 가능하며, 이후에는 결제가에서 정상가 기준 환불 수수료(20%) 및 일할 사용금액을 공제합니다.</li>
        <li>무료 제공, 이벤트, 체험권은 환불 대상에 포함되지 않습니다.</li>
      </ol>
    ),
  },
  {
    no: "13",
    title: "지적재산권",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>서비스와 관련된 모든 프로그램, 콘텐츠, 디자인, 데이터 등의 권리는 회사에 귀속됩니다.</li>
        <li>이용자는 회사의 사전 허락 없이 이를 복제, 전송, 배포, 상업적 이용할 수 없습니다.</li>
      </ol>
    ),
  },
  {
    no: "14",
    title: "개인정보 보호",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>회사는 개인정보보호법 등 관련 법령을 준수합니다.</li>
        <li>이용자의 개인정보 수집·이용·보관·파기에 관한 사항은 <Link href="/terms/privacy" style={{ color: MCK_ELECTRIC, fontWeight: 700, textDecoration: "underline" }}>&ldquo;개인정보처리방침&rdquo;</Link>에 따릅니다.</li>
      </ol>
    ),
  },
  {
    no: "15",
    title: "서비스 이용계약의 해지",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>회원은 언제든지 탈퇴를 요청할 수 있으며, 회사는 즉시 처리합니다.</li>
        <li>회사는 이용자가 본 약관을 위반하거나 서비스 운영을 심각하게 방해하는 경우, 사전 통보 후 계약을 해지할 수 있습니다.</li>
      </ol>
    ),
  },
  {
    no: "16",
    title: "책임의 한계",
    body: (
      <div className="space-y-3">
        <p>① 회사는 다음의 경우 책임을 지지 않습니다.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>천재지변, 전쟁, 화재 등 불가항력적 사유</li>
          <li>이용자의 귀책으로 인한 장애</li>
          <li>AI 분석 또는 외부 데이터 기반 정보의 불일치</li>
          <li>이용자 간 거래, 계약, 분쟁 등</li>
        </ul>
        <p>② 회사는 무료 서비스에 대해 손해배상 의무를 지지 않습니다.</p>
      </div>
    ),
  },
  {
    no: "17",
    title: "손해배상",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>회사의 고의 또는 중대한 과실이 없는 한, 이용자의 손해에 대해 책임을 지지 않습니다.</li>
        <li>이용자가 약관 위반으로 회사에 손해를 입힌 경우, 그 손해를 배상할 책임이 있습니다.</li>
      </ol>
    ),
  },
  {
    no: "18",
    title: "분쟁 해결 및 관할",
    body: (
      <ol className="list-decimal pl-5 space-y-2">
        <li>회사는 이용자의 정당한 불만사항을 신속히 처리하기 위해 노력합니다.</li>
        <li>본 약관과 관련한 분쟁은 대한민국 법령을 준거법으로 하며, 회사 본사 소재지를 관할하는 법원을 전속 관할로 합니다.</li>
      </ol>
    ),
  },
]

export default function ServiceTermsPage() {
  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[
          { label: "약관", href: "/terms/service" },
          { label: "서비스 이용약관" },
        ]}
        eyebrow="LEGAL · TERMS OF SERVICE"
        title="서비스 이용약관"
        subtitle="트랜스파머 주식회사 — 엔플랫폼(NPLatform) · 시행일 2025-10-22"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", fontSize: 12, fontWeight: 700,
              background: MCK_PAPER, color: MCK_INK,
              border: `1px solid ${MCK_BORDER_STRONG}`,
              textDecoration: "none",
            }}>
              <ArrowLeft size={13} style={{ color: MCK_ELECTRIC }} />
              메인으로
            </Link>
            <Link href="/terms/privacy" className="mck-cta-dark" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", fontSize: 12, fontWeight: 800,
              background: MCK_INK, color: MCK_PAPER,
              borderTop: `2px solid ${MCK_ELECTRIC}`,
              textDecoration: "none",
            }}>
              <FileText size={13} style={{ color: MCK_PAPER }} />
              <span style={{ color: MCK_PAPER }}>개인정보처리방침</span>
            </Link>
          </div>
        }
      />

      <section style={{ background: MCK_PAPER, padding: "3rem 0 5rem", borderTop: `1px solid ${MCK_BORDER}` }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr]" style={{ gap: 48 }}>
            {/* TOC sidebar */}
            <aside className="hidden lg:block">
              <div style={{ position: "sticky", top: 24 }}>
                <div style={{ ...MCK_TYPE.eyebrow, color: MCK_ELECTRIC, marginBottom: 14 }}>
                  TABLE OF CONTENTS
                </div>
                <nav style={{ display: "flex", flexDirection: "column" }}>
                  {ARTICLES.map(a => (
                    <a key={a.no}
                      href={`#article-${a.no}`}
                      style={{
                        padding: "8px 0",
                        fontSize: 12, fontWeight: 600, color: MCK_INK_MID,
                        borderLeft: `2px solid ${MCK_BORDER}`,
                        paddingLeft: 12,
                        textDecoration: "none",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      <span style={{
                        fontFamily: MCK_FONTS.serif, fontWeight: 800,
                        color: MCK_ELECTRIC, marginRight: 6,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {a.no}
                      </span>
                      {a.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Body */}
            <div style={{ maxWidth: 760 }}>
              {ARTICLES.map(a => (
                <article
                  key={a.no}
                  id={`article-${a.no}`}
                  style={{
                    paddingBottom: 32,
                    marginBottom: 32,
                    borderBottom: `1px solid ${MCK_BORDER}`,
                  }}
                >
                  <header style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
                    <span style={{
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 36, fontWeight: 800, color: MCK_ELECTRIC,
                      letterSpacing: "-0.025em", lineHeight: 1,
                      fontVariantNumeric: "tabular-nums", flexShrink: 0,
                    }}>
                      {a.no}
                    </span>
                    <h2 style={{
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 22, fontWeight: 800, color: MCK_INK,
                      letterSpacing: "-0.015em", lineHeight: 1.25,
                    }}>
                      제{a.no}조 ({a.title})
                    </h2>
                  </header>
                  <div style={{
                    fontSize: 14, color: MCK_INK_MID, lineHeight: 1.75, fontWeight: 500,
                  }}>
                    {a.body}
                  </div>
                </article>
              ))}

              {/* 부칙 */}
              <article style={{
                background: "rgba(34, 81, 255, 0.04)",
                border: `1px solid ${MCK_BORDER}`,
                borderTop: `2px solid ${MCK_ELECTRIC}`,
                padding: "24px 28px", marginTop: 8,
              }}>
                <div style={{ ...MCK_TYPE.eyebrow, color: MCK_ELECTRIC, marginBottom: 8 }}>
                  부칙 · APPENDIX
                </div>
                <h3 style={{
                  fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK_INK,
                  letterSpacing: "-0.015em", marginBottom: 12,
                }}>
                  시행일 안내
                </h3>
                <ol className="list-decimal pl-5 space-y-2" style={{ fontSize: 13, color: MCK_INK_MID, lineHeight: 1.7 }}>
                  <li>본 이용약관은 <strong style={{ color: MCK_INK, fontWeight: 800 }}>2025년 10월 22일</strong>부터 시행됩니다.</li>
                  <li>시행일 이전 가입자 또한 본 약관의 적용을 받습니다.</li>
                </ol>
              </article>
            </div>
          </div>
        </div>
      </section>
    </MckPageShell>
  )
}
