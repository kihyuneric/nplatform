"use client"

/**
 * /terms/privacy — 엔플랫폼(NPLatform) 개인정보처리방침 (McKinsey editorial)
 *
 * 디자인:
 *   - White paper + ink black + electric blue accent
 *   - Georgia serif for 제목·조 번호
 *   - Sticky 좌측 목차 + 본문 우측
 *   - 11 sections + 부칙
 */

import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

const MCK_INK = "#0A1628"
const MCK_ELECTRIC = "#2251FF"
const MCK_PAPER = "#FFFFFF"
const MCK_INK_MID = "rgba(5, 28, 44, 0.65)"
const MCK_INK_MUTED = "rgba(5, 28, 44, 0.45)"
const MCK_PAPER_TINT = "#F8FAFC"
const MCK_BORDER = "rgba(5, 28, 44, 0.10)"
const MCK_BORDER_STRONG = "rgba(5, 28, 44, 0.20)"

type Section = {
  no: string
  title: string
  body: React.ReactNode
}

const SECTIONS: Section[] = [
  {
    no: "1",
    title: "개인정보 처리 목적",
    body: (
      <>
        <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>회원 가입 및 관리</strong> — 본인 확인, 계정 관리, 부정 이용 방지, 민원 처리</li>
          <li><strong>서비스 제공</strong> — 자산·권리·정보 등록, 거래 및 계약 지원, AI 분석, 데이터 리포트, 컨설팅, 마케팅 등 플랫폼 내 주요 기능 제공</li>
          <li><strong>고객 관리</strong> — 문의 대응, 공지 및 리포트 발송, 서비스 품질 관리, 거래 이력 관리</li>
          <li><strong>마케팅 활용</strong> — 이벤트 운영, 광고성 정보 발송, 맞춤형 콘텐츠 제공(이용자 선택 시)</li>
          <li><strong>통계 및 서비스 개선</strong> — 서비스 이용 데이터 기반의 통계 분석, AI 모델 학습, 기능 개선, 신규 서비스 개발</li>
        </ul>
      </>
    ),
  },
  {
    no: "2",
    title: "개인정보 수집 항목",
    body: (
      <CollectionTable />
    ),
  },
  {
    no: "3",
    title: "개인정보 보유·이용 기간",
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>회원 가입 및 관리 — 회원 탈퇴 또는 서비스 이용 종료 시까지 보유</li>
          <li>재화 또는 서비스 제공 — 회원 탈퇴 또는 서비스 이용 종료 시까지 보유</li>
          <li>민원 사무 처리 — 회원 탈퇴 또는 서비스 이용 종료 시까지 보유</li>
          <li>마케팅 및 광고 활용 — 회원 탈퇴 또는 서비스 이용 종료 시까지 보유</li>
        </ul>
        <p className="mt-3"><strong style={{ color: MCK_INK }}>※ 단, 관련 법령에 따라 아래와 같이 일정 기간 보관할 수 있습니다.</strong></p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>「전자상거래법」</strong> — 계약/결제 기록 5년, 분쟁처리 기록 3년, 표시광고 기록 6개월</li>
          <li><strong>「통신비밀보호법」</strong>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>가입자 전기통신일시, 개시·종료시간, 상대방 가입자번호, 사용도수, 발신기지국 위치 추적자료 — 1년</li>
              <li>컴퓨터통신, 인터넷 로그기록자료, 접속지 추적자료 — 3개월</li>
            </ul>
          </li>
          <li><strong>「부동산 거래신고 등에 관한 법률」</strong> 등 관계법령에 따른 보존 의무가 있는 경우 해당 기간 준수</li>
        </ul>
      </>
    ),
  },
  {
    no: "4",
    title: "개인정보의 제3자 제공",
    body: (
      <>
        <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에 한해 예외적으로 제공할 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>법령에 의한 제공 요청이 있는 경우 (수사기관, 관계기관 등)</li>
          <li>이용자가 사전 동의한 경우 (이벤트·프로모션 등 선택 동의 시)</li>
          <li>제휴 서비스 이용 시 필요한 범위 내에서 동의 후 제공하는 경우</li>
        </ul>
      </>
    ),
  },
  {
    no: "5",
    title: "개인정보 처리 위탁",
    body: (
      <>
        <p>회사는 원활한 서비스 운영을 위해 다음과 같이 위탁할 수 있습니다. (선택 동의)</p>
        <DelegationTable />
      </>
    ),
  },
  {
    no: "6",
    title: "이용자 권리",
    body: (
      <>
        <p>이용자는 언제든지 개인정보의 열람·정정·삭제·처리정지를 요청할 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>요청 방법 — 이메일 (
            <a href="mailto:sp.park@transfarmer.co.kr" style={{ color: MCK_ELECTRIC, fontWeight: 700 }}>sp.park@transfarmer.co.kr</a>
            ) 또는 고객센터 (
            <a href="tel:0255552822" style={{ color: MCK_ELECTRIC, fontWeight: 700 }}>02-555-2822</a>
            )
          </li>
        </ul>
      </>
    ),
  },
  {
    no: "7",
    title: "개인정보의 파기 절차 및 방법",
    body: (
      <>
        <p>트랜스파머는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</p>
        <div className="space-y-3 mt-3">
          <div>
            <p className="font-semibold mb-1.5" style={{ color: MCK_INK }}>① 파기절차</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의 경우 별도의 서류) 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.</li>
              <li>이 때, DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 다른 목적으로 이용되지 않습니다.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1.5" style={{ color: MCK_INK }}>② 파기방법</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
              <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    no: "8",
    title: "개인정보 자동 수집 장치 및 거부",
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>쿠키(cookie) 사용</strong> — 회원, 비회원의 접속 빈도 분석, 방문시간 등 사용자 맞춤형 콘텐츠 제공을 위한 제반 행위</li>
        <li><strong>쿠키 설정 거부 가능</strong> — 브라우저 설정 메뉴에서 조정</li>
      </ul>
    ),
  },
  {
    no: "9",
    title: "개인정보의 안전성 확보조치",
    body: (
      <>
        <p>트랜스파머는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>개인정보 보호를 위한 내부관리계획 수립 및 시행</li>
          <li>개인정보 접근권한의 차등 부여 및 관리</li>
          <li>정기적인 보안점검 및 교육 실시</li>
          <li>해킹 방지를 위한 방화벽 및 백신 프로그램 설치</li>
          <li>개인정보 암호화 저장 및 전송 시 보안 강화</li>
          <li>챗봇 서비스 대화 내용 암호화 저장·관리, 개인정보 입력 시 안내 문구를 통해 사전 고지</li>
        </ul>
      </>
    ),
  },
  {
    no: "10",
    title: "가명정보 처리에 관한 사항",
    body: (
      <p>트랜스파머는 회원 정보 관리, 통계작성, 과학적 연구, 공익적 기록보존 등을 위하여 필요한 경우 수집한 개인정보를 특정 개인을 알아볼 수 없도록 가명 처리할 수 있습니다.</p>
    ),
  },
  {
    no: "11",
    title: "개인정보보호책임자 및 권익침해 구제",
    body: (
      <>
        <p>트랜스파머는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <ContactCard />
        <p className="mt-4">이용자는 「개인정보 보호법」 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 트랜스파머는 이용자의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.</p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li>대표번호 — <a href="tel:0255552822" style={{ color: MCK_ELECTRIC, fontWeight: 700 }}>02-555-2822</a></li>
          <li>이메일 — <a href="mailto:ceo@transfarmer.co.kr" style={{ color: MCK_ELECTRIC, fontWeight: 700 }}>ceo@transfarmer.co.kr</a></li>
        </ul>
        <p className="mt-4 mb-2"><strong style={{ color: MCK_INK }}>※ 개인정보 관련 피해 구제는 아래 기관을 통해 신청할 수 있습니다.</strong></p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>개인정보침해신고센터 — <a href="https://privacy.kisa.or.kr" target="_blank" rel="noreferrer" style={{ color: MCK_ELECTRIC, fontWeight: 700 }}>privacy.kisa.or.kr</a> / 국번없이 118</li>
          <li>개인정보분쟁조정위원회 — <a href="https://kopico.go.kr" target="_blank" rel="noreferrer" style={{ color: MCK_ELECTRIC, fontWeight: 700 }}>kopico.go.kr</a> / 국번없이 1833-6972</li>
          <li>경찰청 사이버수사국 — <a href="https://cyber.go.kr" target="_blank" rel="noreferrer" style={{ color: MCK_ELECTRIC, fontWeight: 700 }}>cyber.go.kr</a> / 국번없이 182</li>
        </ul>
      </>
    ),
  },
]

function CollectionTable() {
  const rows: { kind: string; required: string; optional?: string; method: string }[] = [
    {
      kind: "회원가입",
      required: "성명, 생년월, 휴대폰 번호, 이메일 주소, 서비스 사용 목적과 관련된 정보(법인명, 직함), 통신사, 위치정보(별도 동의에 따름)",
      optional: "SNS(카카오, 네이버) 로그인 시, 로그인 정보 식별 값, SNS 프로필 사진",
      method: "회원가입 시",
    },
    {
      kind: "서비스 이용",
      required: "성명, 생년월, 휴대폰 번호, 이메일 주소, 등록 자산 정보(주소, 가격, 감정가 등), 접속IP, 기기정보, 쿠키, 이용이력, 로그데이터",
      optional: "이용자가 직접 입력하는 정보(경매·공매 분석, 투자 계획, NPL 분석 등), 위치정보",
      method: "서비스 이용 및 자동 수집",
    },
    {
      kind: "결제",
      required: "결제수단 정보(카드사, 승인번호 등), 결제이력, 세금계산서 발행정보",
      method: "결제 시",
    },
    {
      kind: "챗봇 서비스 이용",
      required: "대화 과정에서 이용자가 직접 입력하는 성명, 연락처, 이메일 등 (입력 시에 한함)",
      optional: "서비스 문의, 투자 관련 질문, 기타 이용자가 자발적으로 입력하는 정보",
      method: "챗봇 이용 시",
    },
    {
      kind: "마케팅",
      required: "성명, 생년월, 휴대폰 번호, 이메일 주소, 자동 수집되는 정보",
      optional: "마케팅 정보 제공 및 제휴 프로모션 동의 항목 (성명, 휴대폰 번호, 이메일 주소)",
      method: "이벤트 참여, 프로모션 등록 시",
    },
    {
      kind: "상담/문의",
      required: "성명, 연락처, 이메일, 문의내용",
      method: "고객센터 이용 시",
    },
  ]
  return (
    <div style={{
      border: `1px solid ${MCK_BORDER}`,
      borderTop: `2px solid ${MCK_ELECTRIC}`,
      background: MCK_PAPER,
      overflowX: "auto",
      marginTop: 8,
    }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: MCK_PAPER_TINT, borderBottom: `1px solid ${MCK_BORDER}` }}>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: MCK_INK_MID, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>구분</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: MCK_INK_MID, letterSpacing: "0.06em", textTransform: "uppercase" }}>수집항목</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: MCK_INK_MID, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>수집방법</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.kind} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${MCK_BORDER}` : "none" }}>
              <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: MCK_INK, verticalAlign: "top", whiteSpace: "nowrap" }}>{r.kind}</td>
              <td style={{ padding: "12px", fontSize: 12, color: MCK_INK_MID, verticalAlign: "top", lineHeight: 1.65 }}>
                <div><strong style={{ color: MCK_INK, fontWeight: 700 }}>● 필수</strong> — {r.required}</div>
                {r.optional && <div style={{ marginTop: 4 }}><strong style={{ color: MCK_INK_MID, fontWeight: 700 }}>○ 선택</strong> — {r.optional}</div>}
              </td>
              <td style={{ padding: "12px", fontSize: 11, color: MCK_INK_MID, verticalAlign: "top", whiteSpace: "nowrap", fontWeight: 600 }}>{r.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DelegationTable() {
  return (
    <div style={{
      border: `1px solid ${MCK_BORDER}`,
      borderTop: `2px solid ${MCK_ELECTRIC}`,
      background: MCK_PAPER,
      overflowX: "auto",
      marginTop: 8,
    }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: MCK_PAPER_TINT, borderBottom: `1px solid ${MCK_BORDER}` }}>
            {["수탁자", "제공 항목", "위탁업무", "보유기간"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: MCK_INK_MID, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: MCK_INK, whiteSpace: "nowrap" }}>㈜엠딕</td>
            <td style={{ padding: "12px", fontSize: 12, color: MCK_INK_MID, lineHeight: 1.6 }}>
              이름, 휴대폰 번호, 이메일 주소, 기타 마케팅에 필요한 개인정보 등
            </td>
            <td style={{ padding: "12px", fontSize: 12, color: MCK_INK_MID }}>마케팅 및 광고 운영 대행</td>
            <td style={{ padding: "12px", fontSize: 12, color: MCK_INK_MID, whiteSpace: "nowrap" }}>위탁 계약 종료 시까지</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ContactCard() {
  return (
    <div style={{
      background: "rgba(34, 81, 255, 0.04)",
      border: `1px solid ${MCK_BORDER}`,
      borderTop: `2px solid ${MCK_ELECTRIC}`,
      padding: "20px 24px", marginTop: 14,
      display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 18px",
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: MCK_INK_MUTED, letterSpacing: "0.10em", textTransform: "uppercase", alignSelf: "center" }}>성명</span>
      <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK_INK }}>박성필</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: MCK_INK_MUTED, letterSpacing: "0.10em", textTransform: "uppercase", alignSelf: "center" }}>직책</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: MCK_INK }}>CIO (개인정보보호책임자)</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: MCK_INK_MUTED, letterSpacing: "0.10em", textTransform: "uppercase", alignSelf: "center" }}>이메일</span>
      <a href="mailto:sp.park@transfarmer.co.kr" style={{ fontSize: 13, fontWeight: 700, color: MCK_ELECTRIC, fontVariantNumeric: "tabular-nums", textDecoration: "none" }}>
        sp.park@transfarmer.co.kr
      </a>
      <span style={{ fontSize: 10, fontWeight: 800, color: MCK_INK_MUTED, letterSpacing: "0.10em", textTransform: "uppercase", alignSelf: "center" }}>전화</span>
      <a href="tel:0255552822" style={{ fontSize: 13, fontWeight: 700, color: MCK_ELECTRIC, fontVariantNumeric: "tabular-nums", textDecoration: "none" }}>
        02-555-2822
      </a>
    </div>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[
          { label: "약관", href: "/terms/service" },
          { label: "개인정보처리방침" },
        ]}
        eyebrow="LEGAL · PRIVACY POLICY"
        title="개인정보처리방침"
        subtitle="엔플랫폼(NPLatform) — 트랜스파머 주식회사 · 시행일 2025-10-22"
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
            <Link href="/terms/service" className="mck-cta-dark" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", fontSize: 12, fontWeight: 800,
              background: MCK_INK, color: MCK_PAPER,
              borderTop: `2px solid ${MCK_ELECTRIC}`,
              textDecoration: "none",
            }}>
              <FileText size={13} style={{ color: MCK_PAPER }} />
              <span style={{ color: MCK_PAPER }}>서비스 이용약관</span>
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
                  {SECTIONS.map(s => (
                    <a key={s.no}
                      href={`#section-${s.no}`}
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
                        {s.no}
                      </span>
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Body */}
            <div style={{ maxWidth: 820 }}>
              {SECTIONS.map(s => (
                <article
                  key={s.no}
                  id={`section-${s.no}`}
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
                      {s.no}
                    </span>
                    <h2 style={{
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 22, fontWeight: 800, color: MCK_INK,
                      letterSpacing: "-0.015em", lineHeight: 1.25,
                    }}>
                      {s.title}
                    </h2>
                  </header>
                  <div style={{
                    fontSize: 14, color: MCK_INK_MID, lineHeight: 1.75, fontWeight: 500,
                  }}>
                    {s.body}
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
                  <li>이 개인정보처리방침은 <strong style={{ color: MCK_INK, fontWeight: 800 }}>2025년 10월 22일</strong>부터 시행합니다.</li>
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
