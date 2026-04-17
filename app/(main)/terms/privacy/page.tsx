"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import DS from "@/lib/design-system"

const SECTIONS = [
  { id: "section-1", title: "1. 수집하는 개인정보 항목" },
  { id: "section-2", title: "2. 수집 및 이용 목적" },
  { id: "section-3", title: "3. 보유 기간" },
  { id: "section-4", title: "4. 제3자 제공" },
  { id: "section-5", title: "5. 처리 위탁" },
  { id: "section-6", title: "6. 파기절차 및 방법" },
  { id: "section-7", title: "7. 이용자의 권리" },
  { id: "section-8", title: "8. 쿠키 운용 및 거부" },
  { id: "section-9", title: "9. 안전성 확보 조치" },
  { id: "section-10", title: "10. 개인정보 보호책임자" },
  { id: "section-11", title: "11. 고지의 의무" },
]

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className={`${DS.text.cardSubtitle} mb-3 pb-2 border-b border-[var(--color-border-subtle)]`}>{title}</h2>
    <div className={DS.text.body}>{children}</div>
  </section>
)

export default function PrivacyPolicyPage() {
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
          <h1 className={DS.header.title}>개인정보 처리방침</h1>
          <p className={`${DS.text.caption} mt-2`}>시행일: 2024년 1월 1일 · 최종 수정: 2026년 3월 1일 · v2.0</p>
          <div className="flex gap-2 mt-4">
            <span className={`${DS.text.label} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1`}>정보통신망법 준수</span>
            <span className={`${DS.text.label} bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-3 py-1`}>개인정보보호법 준수</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className={`inline-flex items-center gap-1 ${DS.text.captionLight} hover:text-[var(--color-text-primary)] transition-colors mb-6`}>← 홈으로 돌아가기</Link>

        <div className="flex gap-10">
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-20">
              <p className={`${DS.text.label} mb-3 px-2`}>목차</p>
              <nav className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.75rem] transition-all ${active === s.id ? "bg-[var(--color-brand-dark)] text-white font-semibold" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]"}`}>
                    <span className={`w-1 h-1 rounded-full bg-current shrink-0 ${active === s.id ? "opacity-100" : "opacity-0"}`} />
                    {s.title}
                  </button>
                ))}
              </nav>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`mt-6 px-2 ${DS.text.captionLight} hover:text-[var(--color-text-primary)] transition-colors`}>↑ 맨 위로</button>
            </div>
          </aside>

          <div className="flex-1 min-w-0 max-w-3xl">
            <div className={`${DS.card.base} ${DS.card.padding} mb-6`}>
              <h2 className={`${DS.text.cardTitle} mb-1`}>개인정보 처리방침</h2>
              <p className={DS.text.body}>주식회사 트랜스파머(이하 &quot;회사&quot;)는 NPLatform 서비스 제공을 위해 필요한 최소한의 개인정보를 수집합니다.</p>
            </div>
            <div className="bg-amber-500/10 border-l-4 border-amber-400 p-4 rounded-r-lg mb-8">
              <p className={`${DS.text.bodyBold} text-amber-300`}>변경 안내 (2026.03.01 시행)</p>
              <p className={`${DS.text.caption} text-amber-400 mt-1`}>주요 변경: AI 분석 데이터 처리 항목 추가, 쿠키 정책 세분화.</p>
            </div>

            <div className="space-y-10">
              <Section id="section-1" title="1. 수집하는 개인정보의 항목">
                <div className="space-y-3">
                  <div><p className={`${DS.text.bodyBold} mb-1`}>필수 수집</p><ul className="list-disc pl-5 space-y-1"><li>회원가입: 이름, 이메일, 비밀번호, 휴대전화번호</li><li>투자자 인증(KYC): 실명, 생년월일, 신분증 사본, 사업자등록번호(기관)</li><li>거래 이용: 계좌 정보, 투자 내역</li></ul></div>
                  <div><p className={`${DS.text.bodyBold} mb-1`}>선택 수집</p><p>회사명, 직책, 관심 투자 분야, 투자 경력, 프로필 사진</p></div>
                  <div><p className={`${DS.text.bodyBold} mb-1`}>자동 수집</p><p>IP 주소, 쿠키, 방문 일시, 이용 기록, 기기 정보, AI 분석 요청 기록</p></div>
                </div>
              </Section>
              <Section id="section-2" title="2. 수집 및 이용 목적">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-[var(--color-text-primary)]">서비스 제공:</strong> NPL 매물 검색, AI 분석, 딜룸 거래, 경매 시뮬레이션</li>
                  <li><strong className="text-[var(--color-text-primary)]">회원 관리:</strong> 본인 확인, KYC 인증, 불만처리, 고지사항 전달</li>
                  <li><strong className="text-[var(--color-text-primary)]">서비스 개선:</strong> 접속 빈도 분석, 이용 통계, AI 모델 개선</li>
                  <li><strong className="text-[var(--color-text-primary)]">마케팅:</strong> 이벤트·신규 서비스 안내 (수신 동의 시)</li>
                </ul>
              </Section>
              <Section id="section-3" title="3. 보유 기간">
                <p className="mb-3">목적 달성 후 지체 없이 파기합니다. 법령에 따른 보존 필요 시 예외 적용:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>계약·청약철회 기록: 5년 (전자상거래법)</li>
                  <li>소비자 불만·분쟁처리 기록: 3년 (전자상거래법)</li>
                  <li>접속 기록(로그): 3개월 이상 (통신비밀보호법)</li>
                  <li>본인확인 기록: 6개월 (정보통신망법)</li>
                </ul>
              </Section>
              <Section id="section-4" title="4. 제3자 제공">
                <p>원칙적으로 외부에 제공하지 않습니다. 예외: 이용자 사전 동의, 법령에 의한 수사기관 요구, 딜룸 거래 상대방에게 최소 정보 제공 (이용자 동의 하에).</p>
              </Section>
              <Section id="section-5" title="5. 처리 위탁">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-[var(--color-text-primary)]">Supabase Inc.</strong> — 클라우드 데이터베이스 및 인증</li>
                  <li><strong className="text-[var(--color-text-primary)]">Vercel Inc.</strong> — 웹 서비스 호스팅 및 CDN</li>
                  <li><strong className="text-[var(--color-text-primary)]">Anthropic PBC</strong> — AI 분석 엔진 (NPL 분석 처리)</li>
                </ul>
              </Section>
              <Section id="section-6" title="6. 파기절차 및 방법">
                <p>목적 달성 후 별도 DB에 이관하여 법령에 따라 파기합니다. 전자적 파일은 복구 불가 방법으로 삭제, 종이 문서는 분쇄·소각합니다.</p>
              </Section>
              <Section id="section-7" title="7. 이용자의 권리">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-[var(--color-text-primary)]">열람 요구:</strong> 설정 메뉴 또는 고객센터</li>
                  <li><strong className="text-[var(--color-text-primary)]">정정·삭제 요구:</strong> 프로필 설정에서 직접 수정</li>
                  <li><strong className="text-[var(--color-text-primary)]">처리정지 요구:</strong> support@nplatform.kr</li>
                  <li><strong className="text-[var(--color-text-primary)]">동의 철회:</strong> 서비스 내 알림 설정에서 마케팅 수신 동의 철회</li>
                </ul>
              </Section>
              <Section id="section-8" title="8. 쿠키 운용 및 거부">
                <ul className="list-disc pl-5 space-y-1"><li><strong className="text-[var(--color-text-primary)]">필수 쿠키:</strong> 로그인 유지, 보안 토큰</li><li><strong className="text-[var(--color-text-primary)]">기능 쿠키:</strong> 다크모드·언어 설정, 최근 검색</li><li><strong className="text-[var(--color-text-primary)]">분석 쿠키:</strong> 익명 이용 통계</li><li><strong className="text-[var(--color-text-primary)]">거부:</strong> 브라우저 설정에서 조정 가능. 필수 쿠키 차단 시 일부 기능 제한됩니다.</li></ul>
              </Section>
              <Section id="section-9" title="9. 안전성 확보 조치">
                <div className="bg-amber-500/10 border-l-4 border-amber-400 p-4 rounded-r-lg mb-3">
                  <p className={`${DS.text.bodyBold} text-amber-300`}>AES-256 암호화 및 SSL/TLS 적용으로 개인정보를 안전하게 보호합니다.</p>
                </div>
                <ul className="list-disc pl-5 space-y-1"><li><strong className="text-[var(--color-text-primary)]">기술적:</strong> AES-256, SSL/TLS, Supabase RLS 적용</li><li><strong className="text-[var(--color-text-primary)]">관리적:</strong> 내부관리계획 수립, 취급 직원 최소화·교육</li><li><strong className="text-[var(--color-text-primary)]">물리적:</strong> AWS/Supabase 인프라 보안 준수</li></ul>
              </Section>
              <Section id="section-10" title="10. 개인정보 보호책임자">
                <div className={`${DS.card.flat} p-4`}>
                  <p className={`${DS.text.bodyBold} mb-2`}>개인정보 보호책임자 (경영지원팀 팀장)</p>
                  <p className={DS.text.caption}>privacy@nplatform.kr &nbsp;|&nbsp; 02-1234-5678</p>
                </div>
                <p className={`${DS.text.captionLight} mt-3`}>기타 신고·상담: 개인정보침해신고센터 (118) · 대검찰청 사이버범죄수사단 (02-3480-3573) · 경찰청 사이버안전국 (182)</p>
              </Section>
              <Section id="section-11" title="11. 고지의 의무">
                <p className="mb-3">방침 변경 시 7일 전 공지사항 고지. 권리 중대 변경 시 최소 30일 전 고지합니다.</p>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 space-y-1">
                  <p className={`${DS.text.bodyBold} text-blue-300 mb-1`}>개정 이력</p>
                  <p className={`${DS.text.caption} text-blue-400`}>2026.03.01 — v2.0: AI 분석 항목 추가, 쿠키 정책 세분화</p>
                  <p className={`${DS.text.caption} text-blue-400`}>2026.01.01 — v1.1: 처리위탁 업체 목록 갱신</p>
                  <p className={`${DS.text.caption} text-blue-400`}>2025.01.01 — v1.0: 최초 제정</p>
                </div>
              </Section>

              <div className="border-t-2 border-[var(--color-border-subtle)] pt-8 mt-8">
                <div className={`${DS.card.base} ${DS.card.padding} grid grid-cols-1 sm:grid-cols-3 gap-6 text-center`}>
                  <div><p className={DS.text.label}>시행일</p><p className={DS.text.bodyBold}>2026년 1월 1일</p></div>
                  <div><p className={DS.text.label}>회사명</p><p className={DS.text.bodyBold}>주식회사 트랜스파머</p></div>
                  <div><p className={DS.text.label}>문의</p><p className={DS.text.bodyBold}>privacy@nplatform.kr</p></div>
                </div>
                <div className={`mt-6 flex items-center justify-between ${DS.text.captionLight}`}>
                  <div className="flex gap-4">
                    <Link href="/terms/service" className="hover:text-[var(--color-text-primary)] transition-colors">이용약관</Link>
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
