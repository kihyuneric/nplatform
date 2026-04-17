"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import DS from "@/lib/design-system"

const SECTIONS = [
  { id: "section-1", title: "제1조 (목적)" },
  { id: "section-2", title: "제2조 (정의)" },
  { id: "section-3", title: "제3조 (약관의 효력 및 변경)" },
  { id: "section-4", title: "제4조 (회원가입 및 탈퇴)" },
  { id: "section-5", title: "제5조 (서비스의 제공)" },
  { id: "section-6", title: "제6조 (서비스 변경 및 중단)" },
  { id: "section-7", title: "제7조 (이용자의 의무)" },
  { id: "section-8", title: "제8조 (금지행위)" },
  { id: "section-9", title: "제9조 (지적재산권)" },
  { id: "section-10", title: "제10조 (면책조항)" },
  { id: "section-11", title: "제11조 (이용요금)" },
  { id: "section-12", title: "제12조 (분쟁 해결)" },
  { id: "section-13", title: "제13조 (기타)" },
]

export default function TermsOfServicePage() {
  const [active, setActive] = useState("")
  const obs = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    obs.current = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) { setActive(e.target.id); break } } },
      { rootMargin: "-20% 0px -75% 0px" }
    )
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.current?.observe(el) })
    return () => obs.current?.disconnect()
  }, [])

  return (
    <div className={DS.page.wrapper}>
      {/* Light header */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <p className={DS.header.eyebrow}>NPLatform Legal</p>
          <h1 className={DS.header.title}>서비스 이용약관</h1>
          <p className={`${DS.text.caption} mt-2`}>시행일: 2024년 1월 1일 &nbsp;·&nbsp; 최종 수정: 2026년 3월 1일 &nbsp;·&nbsp; v2.0</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className={`inline-flex items-center gap-1 ${DS.text.captionLight} hover:text-[var(--color-text-primary)] transition-colors mb-6`}>
          ← 홈으로 돌아가기
        </Link>

        <div className="flex gap-10">
          {/* Sticky sidebar TOC */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-20">
              <p className={`${DS.text.label} mb-3 px-2`}>목차</p>
              <nav className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.75rem] transition-all ${
                      active === s.id
                        ? "bg-[var(--color-brand-dark)] text-white font-semibold"
                        : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]"
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full bg-current shrink-0 transition-opacity ${active === s.id ? "opacity-100" : "opacity-0"}`} />
                    {s.title}
                  </button>
                ))}
              </nav>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`mt-6 px-2 ${DS.text.captionLight} hover:text-[var(--color-text-primary)] transition-colors`}>
                ↑ 맨 위로
              </button>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 max-w-3xl">
            <div className={`${DS.card.base} ${DS.card.padding} mb-8`}>
              <h2 className={`${DS.text.cardTitle} mb-1`}>서비스 이용약관</h2>
              <p className={DS.text.body}>
                본 약관은 주식회사 트랜스파머(이하 &quot;회사&quot;)가 운영하는 NPLatform 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.
              </p>
            </div>

            <div className="space-y-10">
              {[
                { id: "section-1", title: "제1조 (목적)", content: <p>본 약관은 주식회사 트랜스파머(이하 &quot;회사&quot;)가 운영하는 NPLatform 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다. 본 서비스는 NPL(부실채권) 투자 분석, 시장 데이터 제공, 거래 중개, AI 기반 투자 지원 등을 포함합니다.</p> },
                { id: "section-2", title: "제2조 (정의)", content: <ol className="list-decimal pl-5 space-y-2"><li>&quot;서비스&quot;란 회사가 제공하는 NPL 투자 분석, 거래 중개, 시장 데이터, AI 분석 및 관련 정보 제공 서비스 일체를 말합니다.</li><li>&quot;이용자&quot;란 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 말합니다.</li><li>&quot;회원&quot;이란 서비스에 회원등록을 한 자로서, 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li><li>&quot;NPL&quot;이란 Non-Performing Loan의 약자로 금융기관에서 정상적인 회수가 어려운 부실채권을 말합니다.</li><li>&quot;딜룸&quot;이란 매수자와 매도자 간 안전한 거래를 위해 회사가 제공하는 가상의 거래 공간을 말합니다.</li></ol> },
                { id: "section-3", title: "제3조 (약관의 효력 및 변경)", content: <ol className="list-decimal pl-5 space-y-2"><li>본 약관은 서비스 화면 게시 또는 이메일 등 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li><li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일 7일 전부터 공지합니다. 이용자에게 불리한 변경의 경우 30일 전 공지합니다.</li></ol> },
                { id: "section-4", title: "제4조 (회원가입 및 탈퇴)", content: <ol className="list-decimal pl-5 space-y-2"><li>이용자는 회사가 정한 양식에 따라 회원 정보를 기입 후 약관 동의 의사표시를 함으로써 회원가입을 신청합니다.</li><li>허위 기재, 만 19세 미만(전문투자자 인증 시), 서비스 운영에 현저히 지장을 주는 경우 가입이 제한될 수 있습니다.</li><li>회원은 언제든지 설정 또는 고객센터를 통해 탈퇴할 수 있으며, 관련 법령에 따른 보유 정보를 제외하고는 즉시 삭제됩니다.</li></ol> },
                { id: "section-5", title: "제5조 (서비스의 제공)", content: <ol className="list-decimal pl-5 space-y-2"><li><strong className="text-[var(--color-text-primary)]">NPL 매물 검색 및 분석:</strong> 전국 NPL 매물 데이터 검색, 필터링, AI 기반 등급 평가 및 수익률 분석</li><li><strong className="text-[var(--color-text-primary)]">시장 데이터 및 통계:</strong> NPL 시장 동향, 지역별 할인율, 낙찰가율 등 통계 정보 제공</li><li><strong className="text-[var(--color-text-primary)]">딜룸 기반 거래 중개:</strong> NDA 서명, 실사 자료 공유, 계약 체결 등 안전한 거래 환경 제공</li><li><strong className="text-[var(--color-text-primary)]">AI 매칭 서비스:</strong> 매수자-매도자 간 조건 기반 자동 매칭</li></ol> },
                { id: "section-6", title: "제6조 (서비스 변경 및 중단)", content: <ol className="list-decimal pl-5 space-y-2"><li>회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경할 수 있습니다.</li><li>서비스 내용, 이용방법, 시간에 변경이 있는 경우 사전에 공지합니다.</li><li>정기점검(매월 넷째 주 토요일 02:00~06:00) 또는 긴급점검 시 서비스 이용이 일시 제한될 수 있습니다.</li></ol> },
                { id: "section-7", title: "제7조 (이용자의 의무)", content: <ol className="list-decimal pl-5 space-y-2"><li>이용자는 관계 법령, 본 약관, 이용안내 및 공지사항을 준수하여야 합니다.</li><li>이용자는 회원 정보에 변경이 있는 경우 상당한 기간 이내에 수정하여야 합니다.</li><li>이용자는 자신의 계정 정보를 타인에게 양도·대여할 수 없습니다.</li></ol> },
                { id: "section-8", title: "제8조 (금지행위)", content: <>
                  <div className="bg-amber-500/10 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
                    <p className={`${DS.text.label} text-amber-300 mb-1`}>중요 조항</p>
                    <p className={`${DS.text.body} text-amber-400`}>다음 행위 위반 시 서비스 이용이 즉시 제한될 수 있으며, 법적 책임이 발생할 수 있습니다.</p>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1"><li>타인의 정보를 도용하는 행위</li><li>회사의 사전 승낙 없이 서비스 정보를 복제·유통하는 행위</li><li>저작권 등 지적재산권 침해 행위</li><li>허가 없는 영리 목적 활동</li><li>서비스 안정적 운영을 방해하는 행위 (크롤링·스크래핑 등 포함)</li></ol>
                </> },
                { id: "section-9", title: "제9조 (지적재산권)", content: <ol className="list-decimal pl-5 space-y-2"><li>서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다. 이용자가 등록한 게시물의 저작권은 해당 이용자에게 귀속됩니다.</li><li>AI 분석 결과물의 저작권은 회사에 귀속되며, 이용자는 개인 용도로만 사용할 수 있습니다.</li></ol> },
                { id: "section-10", title: "제10조 (면책조항)", content: <>
                  <div className="bg-amber-500/10 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
                    <p className={`${DS.text.label} text-amber-300 mb-1`}>투자 위험 고지</p>
                    <p className={`${DS.text.body} text-amber-400`}>서비스에서 제공되는 모든 분석 및 통계 데이터는 참고용이며, 투자 판단의 최종 책임은 이용자에게 있습니다.</p>
                  </div>
                  <ol className="list-decimal pl-5 space-y-2"><li>회사는 제공되는 NPL 분석 결과, 수익률 예측, 시장 데이터 등의 정확성·완전성·적시성을 보장하지 않습니다.</li><li>천재지변 등 불가항력으로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li></ol>
                </> },
                { id: "section-11", title: "제11조 (이용요금)", content: <ol className="list-decimal pl-5 space-y-2"><li>기본 서비스(매물 검색, 시장 데이터 조회, 경매 시뮬레이터 등)는 무료로 제공됩니다.</li><li>프리미엄 서비스(AI 심층 분석, 딜룸 이용, 프리미엄 리포트 등)의 이용요금 및 결제방법은 별도로 정하는 바에 따릅니다.</li></ol> },
                { id: "section-12", title: "제12조 (분쟁 해결)", content: <ol className="list-decimal pl-5 space-y-2"><li>회사와 이용자 간 분쟁에 관한 소송은 서울중앙지방법원을 제1심 전속관할 법원으로 합니다.</li><li>대한민국 법을 적용하며, 한국소비자원 또는 전자거래분쟁조정위원회에 조정을 신청할 수 있습니다.</li></ol> },
                { id: "section-13", title: "제13조 (기타)", content: <ol className="list-decimal pl-5 space-y-2"><li>본 약관은 2026년 1월 1일부터 시행합니다.</li><li>약관에서 정하지 아니한 사항은 관련 법령 또는 상관례에 따릅니다.</li><li>고객센터: support@nplatform.kr / 02-1234-5678 (평일 09:00~18:00)</li></ol> },
              ].map(({ id, title, content }) => (
                <section key={id} id={id} className="scroll-mt-24">
                  <h2 className={`${DS.text.cardSubtitle} mb-3 pb-2 border-b border-[var(--color-border-subtle)]`}>{title}</h2>
                  <div className={DS.text.body}>{content}</div>
                </section>
              ))}

              <div className="border-t-2 border-[var(--color-border-subtle)] pt-8 mt-8">
                <div className={`${DS.card.base} ${DS.card.padding} grid grid-cols-1 sm:grid-cols-3 gap-6 text-center`}>
                  <div><p className={DS.text.label}>시행일</p><p className={DS.text.bodyBold}>2026년 1월 1일</p></div>
                  <div><p className={DS.text.label}>회사명</p><p className={DS.text.bodyBold}>주식회사 트랜스파머</p></div>
                  <div><p className={DS.text.label}>문의</p><p className={DS.text.bodyBold}>support@nplatform.kr</p></div>
                </div>
                <div className={`mt-6 flex items-center justify-between ${DS.text.captionLight}`}>
                  <div className="flex gap-4">
                    <Link href="/terms/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">개인정보처리방침</Link>
                    <Link href="/terms/disclaimer" className="hover:text-[var(--color-text-primary)] transition-colors">투자 면책 조항</Link>
                  </div>
                  <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="hover:text-[var(--color-text-primary)] transition-colors">↑ 맨 위로</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
