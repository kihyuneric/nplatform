"use client"

/**
 * /guide — 이용 가이드 (역할별 워크플로우 v2 · McKinsey 2026-04-29)
 *
 * 디자인 원칙:
 *   1. Pyramid Principle — 결론부터 (각 역할의 핵심 가치 1줄 → 단계별 분해)
 *   2. MECE — 7개 역할 (금융기관 / 대부업체 / AMC / 개인 / 파트너 / 전문가 / 관리자)
 *   3. Action-oriented — "5 단계로 시작하기" 형식
 *   4. Visual scaffolding — 스크린 mockup 으로 어디를 클릭하는지 직관
 */

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight, ChevronDown, ChevronRight, CheckCircle2,
  Building2, Briefcase, Users, UserCircle, Handshake, GraduationCap, Shield,
  Compass, FileText, BarChart3, MessageCircle, CreditCard, Bell, Settings,
  Sparkles, Search, Upload, Eye, FileSignature, Target, TrendingUp,
  ShoppingCart, Calculator,
} from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

// ─── 역할 카탈로그 ──────────────────────────────────────────────────
interface Role {
  key: string
  label: string
  icon: typeof Building2
  tagline: string
  audience: string
  color: string
}

const ROLES: Role[] = [
  {
    key: "institution", label: "금융기관 (매도자)", icon: Building2,
    tagline: "NPL 매각 효율 3배 — 익명 마스킹 + AI 매칭",
    audience: "은행 · 저축은행 · 캐피탈 · 보험사 · 카드사",
    color: "#1B3A5C",
  },
  {
    key: "lender", label: "대부업체", icon: Briefcase,
    tagline: "양방향 거래 — 매수도, 매각도 한 곳에서",
    audience: "등록 대부업체",
    color: "#2E75B6",
  },
  {
    key: "amc", label: "AMC · 자산운용사", icon: BarChart3,
    tagline: "포트폴리오 단위 대량 처리 + 분석 자동화",
    audience: "한국자산관리공사 · 사모AMC · 투자운용사",
    color: "#10B981",
  },
  {
    key: "individual", label: "일반 회원 (개인 매수자)", icon: UserCircle,
    tagline: "10만원으로 시작하는 NPL 투자",
    audience: "개인 투자자 · 법인 투자자",
    color: "#F59E0B",
  },
  {
    key: "partner", label: "파트너 (자문사)", icon: Handshake,
    tagline: "사건 수임률 ↑ + 정산 자동화",
    audience: "법무법인 · 회계법인 · 부동산 자문사",
    color: "#8B5CF6",
  },
  {
    key: "professional", label: "전문가", icon: GraduationCap,
    tagline: "전문 자격 인증 → 의뢰 자동 라우팅",
    audience: "변호사 · 감정평가사 · 공인중개사 · 세무사",
    color: "#EC4899",
  },
  {
    key: "admin", label: "관리자", icon: Shield,
    tagline: "6-Zone 운영센터 — Pending 즉시 처리",
    audience: "운영팀 · 슈퍼관리자",
    color: "#EF4444",
  },
]

// ─── 단계 카탈로그 (역할별 워크플로우) ────────────────────────────
interface GuideStep {
  num: number
  title: string
  desc: string
  cta?: { label: string; href: string }
  /** 스크린 mockup 메타 — 화면의 어떤 영역을 어떻게 다루는지 시각화 */
  screen?: {
    page: string                    // "/exchange/sell" 등 표시
    location: string                // "상단 SubNav → 매도자 관리" 등
    highlight: string               // 강조할 UI 요소 (예: "[+ 신규 매물]" 버튼)
  }
}

interface GuideWorkflow {
  roleKey: string
  steps: GuideStep[]
  faqs: { q: string; a: string }[]
  quickActions: { label: string; href: string; icon: typeof ArrowRight }[]
}

const WORKFLOWS: GuideWorkflow[] = [
  // ── 금융기관 (매도자) ─────────────────────────────────
  {
    roleKey: "institution",
    steps: [
      {
        num: 1, title: "기관 인증",
        desc: "사업자등록증·법인 명함 업로드 1회 → 1~2 영업일 내 승인. 인증 후 매물 등록 권한 부여.",
        cta: { label: "사업자·투자자 인증 시작", href: "/my/settings?tab=kyc" },
        screen: { page: "/my/settings?tab=kyc", location: "마이 → 설정 → 사업자·투자자 인증", highlight: "[사업자등록증 업로드] 버튼" },
      },
      {
        num: 2, title: "매물 등록 — 3가지 방법",
        desc: "(A) Excel 템플릿 다운로드·기재·업로드 (B) 채권소개서·감정평가서 PDF 업로드 → OCR 자동 채움 (C) 폼 직접 입력. 모든 방법은 동일 결과 — 등기부·감정가·LTV·할인율 자동 산정.",
        cta: { label: "매물 등록 시작", href: "/my/seller" },
        screen: { page: "/my/seller", location: "마이 → 자산 → 내 매물", highlight: "[+ 매물 등록] 우상단 다크 버튼" },
      },
      {
        num: 3, title: "마스킹 검토 & 승인",
        desc: "관리자가 PII (개인정보) 자동 마스킹 → 승인 후 거래소 노출. 평균 검토 시간 4시간. 이름·주소 마지막 자리 *** 처리.",
        screen: { page: "/admin/masking-queue", location: "관리자 → 보안·컴플라이언스 → 마스킹 검토", highlight: "검토 큐의 매물 카드" },
      },
      {
        num: 4, title: "매수자 매칭 & NDA·LOI",
        desc: "AI 매칭으로 적합 매수자 자동 추천. 관심 매수자 → NDA 전자서명 → 실사 자료 공유 → LOI 수령.",
        cta: { label: "딜룸으로 이동", href: "/my/deals" },
        screen: { page: "/my/deals", location: "마이 → 거래 → 딜룸 탭", highlight: "딜룸 우측 NDA·LOI 진행 단계 카드" },
      },
      {
        num: 5, title: "본계약 → 정산",
        desc: "본계약 전자서명 → KB ESCROW 보증금 → 채권 양도 → 잔금 정산. 평균 마감 14일. 수수료 0.5%~0.9% (전속 시 0.3%).",
      },
    ],
    faqs: [
      { q: "매물 1건 등록에 얼마나 걸리나요?", a: "Excel 템플릿 사용 시 평균 8분, OCR 자동 채움 시 평균 3분, 폼 직접 입력 시 12~20분." },
      { q: "민감 정보는 어떻게 보호되나요?", a: "채무자 이름은 자동 마스킹 (마지막 글자만 노출), 주소는 시·구까지만, 등기부 원본은 NDA 체결 후만 공유." },
      { q: "수수료 구조는?", a: "기본 0.5~0.9% 자유 설정. 전속 등록 시 0.3% 할인 + 땅집고 보도 지원." },
    ],
    quickActions: [
      { label: "매물 일괄 등록", href: "/exchange/ocr-register", icon: Upload },
      { label: "Excel 템플릿 다운로드", href: "/templates/NPLatform_매물등록_템플릿.xlsx", icon: FileText },
      { label: "딜룸 진입", href: "/my/deals", icon: MessageCircle },
    ],
  },

  // ── 대부업체 ─────────────────────────────────────────
  {
    roleKey: "lender",
    steps: [
      {
        num: 1, title: "대부업체 인증",
        desc: "대부업 등록증 + 사업자등록증 업로드. 매수·매도 양방향 권한 자동 부여.",
        cta: { label: "인증 시작", href: "/my/settings?tab=kyc" },
        screen: { page: "/my/settings?tab=kyc", location: "마이 → 설정 → KYC", highlight: "기관유형 = '대부업체' 선택" },
      },
      {
        num: 2, title: "매도 — NPL 매각",
        desc: "보유 NPL 채권을 거래소에 등록. 수익권 비율 110~140% 직접 설정 가능. 매각 기준 (대출원금 vs 채권잔액) 선택.",
        cta: { label: "매물 등록", href: "/my/seller" },
      },
      {
        num: 3, title: "매수 — 매수 수요 등록 + AI 매칭",
        desc: "관심 조건 (지역·담보 유형·예산 범위·할인율) 등록 → AI 매칭이 매일 신규 매물 자동 추천. 알림센터로 즉시 통보.",
        cta: { label: "매수 수요 등록", href: "/my/demands" },
        screen: { page: "/my/demands", location: "마이 → 거래 → 매수 수요", highlight: "[+ 신규 매수 수요 등록] 버튼" },
      },
      {
        num: 4, title: "관심매물 + AI 분석 보고서",
        desc: "거래소에서 ❤ 즐겨찾기 → 자동으로 AI 분석 보고서 생성. 회수율 / ROI / 위험등급 / Monte Carlo 시뮬레이션 포함.",
        cta: { label: "관심매물", href: "/my/portfolio" },
      },
      {
        num: 5, title: "딜룸 협상 & 본계약",
        desc: "NDA → 실사 → LOI → 본계약 5단계. 전자서명 5년 보관 (전자서명법 준수).",
      },
    ],
    faqs: [
      { q: "매도자·매수자 모드는 동시에 가능한가요?", a: "네 — 단일 계정에서 양방향 거래 가능. 각 거래마다 분리된 딜룸." },
      { q: "수익권 금액은 어떻게 정하나요?", a: "최초 대출원금 × 110~140% 자유 설정. Excel 템플릿에서 직접 비율 입력 또는 직접 금액 입력 가능." },
    ],
    quickActions: [
      { label: "매수 수요 등록", href: "/my/demands", icon: ShoppingCart },
      { label: "AI 매칭 결과", href: "/my/portfolio?tab=matches", icon: Target },
      { label: "딜룸", href: "/my/deals", icon: MessageCircle },
    ],
  },

  // ── AMC ──────────────────────────────────────────────
  {
    roleKey: "amc",
    steps: [
      {
        num: 1, title: "기관 계정 + 멤버 초대",
        desc: "마스터 계정 생성 → 분석팀·운영팀 멤버 초대 → 역할별 권한 부여 (마스터·매니저·멤버).",
        cta: { label: "기관 계정 설정", href: "/my/settings?tab=organization" },
        screen: { page: "/my/settings?tab=organization", location: "마이 → 설정 → 기관 계정", highlight: "멤버 초대 탭 + 이메일 입력" },
      },
      {
        num: 2, title: "대량 매물 등록 (Bulk Upload)",
        desc: "Excel 템플릿 1장에 100건까지 한 번에 등록. 권리 분석·LTV·매각가 자동 산정.",
        cta: { label: "대량 등록 시작", href: "/exchange/bulk-upload" },
        screen: { page: "/exchange/bulk-upload", location: "거래소 → 대량 등록", highlight: "Excel 파일 드래그앤드롭 영역" },
      },
      {
        num: 3, title: "포트폴리오 분석 대시보드",
        desc: "매물군 단위 통계 — 평균 ROI · 회수율 · 지역 분포 · 위험 등급 분포. 차트 export 가능.",
        cta: { label: "분석 대시보드", href: "/my/portfolio?tab=analytics" },
      },
      {
        num: 4, title: "AI 매칭 + Pool Sale",
        desc: "여러 채권을 묶어 단일 거래로 매각 (Pool Sale). 매수자별 입찰가 비교.",
      },
      {
        num: 5, title: "정산 보고서 + API 연동",
        desc: "거래 정산 자동 인보이스 + 사내 ERP API 연동 가능 (별도 협의).",
      },
    ],
    faqs: [
      { q: "멤버 권한은 어떻게 나뉘나요?", a: "마스터 (전체) / 매니저 (매물·딜룸) / 멤버 (조회만). 각 멤버는 본인 작업 이력만 노출 — 다른 멤버 활동 분리." },
      { q: "포트폴리오 100건 등록 시간은?", a: "Excel 템플릿 1장으로 평균 25분 (검토 시간 별도)." },
    ],
    quickActions: [
      { label: "포트폴리오 분석", href: "/my/portfolio?tab=analytics", icon: BarChart3 },
      { label: "대량 등록", href: "/exchange/bulk-upload", icon: Upload },
      { label: "기관 멤버", href: "/my/settings?tab=organization", icon: Users },
    ],
  },

  // ── 일반 회원 (개인) ────────────────────────────────
  {
    roleKey: "individual",
    steps: [
      {
        num: 1, title: "본인 인증 + KYC",
        desc: "휴대폰 인증 → 사업자등록증 또는 명함 업로드 (개인 투자자도 가능). 1~2 영업일 내 승인.",
        cta: { label: "인증 시작", href: "/my/settings?tab=kyc" },
      },
      {
        num: 2, title: "거래소 둘러보기 + AI 코파일럿",
        desc: "현재 53건 활성 매물. 카드/리스트 뷰, 지도 뷰 지원. 'AI 코파일럿' 으로 자연어 검색 ('서울 강남 5억 이하 아파트 NPL').",
        cta: { label: "거래소 보기", href: "/exchange" },
        screen: { page: "/exchange", location: "TopBar → 거래소", highlight: "상단 검색바 + AI 매칭 토글" },
      },
      {
        num: 3, title: "관심매물 등록 + 분석 리포트",
        desc: "❤ 클릭 → 자동으로 NPL 분석 보고서 생성 (회수율·ROI·위험·Monte Carlo). PDF 다운로드 가능 (한·영·일 파일명).",
        cta: { label: "분석 시뮬레이터", href: "/analysis/simulator" },
      },
      {
        num: 4, title: "딜룸 진입 + NDA 전자서명",
        desc: "관심 매물 → 딜룸 진입 → NDA 체결 (전자서명 1분) → 권리분석·등기부 원본 열람.",
      },
      {
        num: 5, title: "LOI 제출 → 본계약 → 정산",
        desc: "매수 의향가 LOI 제출 → 매도자 승인 → ESCROW 보증금 → 본계약 → 채권 양도 + 잔금 정산.",
      },
    ],
    faqs: [
      { q: "최소 투자 금액은?", a: "NPL 1건 평균 채권액 5천만원 ~ 50억. 공동투자팀 (4~10명) 구성으로 최소 1천만원부터 참여 가능." },
      { q: "수익률은 어떻게 산정되나요?", a: "예측 회수율 × 매수가 = 예상 회수액. 평균 ROI 30~80% (3개월~24개월). 자세한 시나리오는 시뮬레이터에서 확인." },
      { q: "위험은 무엇인가요?", a: "①경매 지연 ②선순위 권리 정리 ③시세 하락. 모든 매물에 4팩터 위험 분석 (담보·권리·시장·유동성) 자동 제공." },
    ],
    quickActions: [
      { label: "AI 코파일럿", href: "/analysis", icon: Sparkles },
      { label: "시뮬레이터", href: "/analysis/simulator", icon: Calculator },
      { label: "포트폴리오", href: "/my/portfolio", icon: TrendingUp },
    ],
  },

  // ── 파트너 (자문사) ────────────────────────────────
  {
    roleKey: "partner",
    steps: [
      {
        num: 1, title: "자문사 등록",
        desc: "사업자등록증 + 자문 분야 (법무·회계·감정·중개) 선택. 전문 영역별 의뢰 자동 라우팅.",
        cta: { label: "파트너 등록", href: "/my/settings?tab=partner" },
      },
      {
        num: 2, title: "사건 의뢰 수신 + 응답",
        desc: "매도자/매수자가 자문 요청 → 알림센터로 통보 → 24시간 내 응답. 거절 시 자동으로 다음 자문사로 라우팅.",
        cta: { label: "자문 의뢰함", href: "/my/partner" },
        screen: { page: "/my/partner", location: "마이 → 설정 → 파트너 관리 → 의뢰함", highlight: "PENDING 상태 카드" },
      },
      {
        num: 3, title: "수임 + 자문 진행",
        desc: "수임 클릭 → 딜룸 자동 합류 → NDA 자동 처리 → 의뢰자와 채팅 + 문서 공유.",
      },
      {
        num: 4, title: "성과 보고서 + 정산",
        desc: "자문 완료 → 성과 보고서 작성 → 의뢰자 평가 → 정산 자동 발행 (수수료 부가세 포함).",
      },
      {
        num: 5, title: "별점 + 추천 알고리즘",
        desc: "평균 4.5+ 자문사는 추천 라우팅 우선순위 ↑ . 누적 의뢰 50건 이상 시 'NPLatform 인증 파트너' 배지.",
      },
    ],
    faqs: [
      { q: "수임률은 어떻게 올리나요?", a: "①프로필 완성도 ②응답 시간 ③별점 — 3가지 모두 영향. 24시간 내 응답 + 별점 4.5+ 가 가장 중요." },
      { q: "정산 주기는?", a: "월 2회 (매월 5일·20일) 자동 정산. 세금계산서 자동 발급." },
    ],
    quickActions: [
      { label: "의뢰함", href: "/my/partner", icon: Briefcase },
      { label: "딜룸", href: "/my/deals", icon: MessageCircle },
      { label: "정산 내역", href: "/my/settings?tab=billing", icon: CreditCard },
    ],
  },

  // ── 전문가 ────────────────────────────────────────
  {
    roleKey: "professional",
    steps: [
      {
        num: 1, title: "전문 자격 인증",
        desc: "변호사 등록증 / 감정평가사 자격증 / 공인중개사 면허 등 자격 서류 업로드. 자격증 인증 후 의뢰 라우팅 활성화.",
        cta: { label: "자격 인증", href: "/my/settings?tab=kyc" },
      },
      {
        num: 2, title: "전문 분야 + 활동 지역 설정",
        desc: "예: '경매 전문 변호사 · 서울·경기' → 해당 지역 NPL 의뢰 자동 매칭. 지역·분야 다중 선택 가능.",
      },
      {
        num: 3, title: "의뢰 응답 + 자문료 안내",
        desc: "의뢰자 자문 요청 → 알림 → 자문료 견적 응답 (시간당·건당·정액). 자문료는 의뢰자가 ESCROW 입금.",
      },
      {
        num: 4, title: "딜룸 합류 + 권리분석 보고서 작성",
        desc: "딜룸 채팅으로 의뢰자와 직접 소통. 권리분석 보고서 PDF 업로드 → 의뢰자 검토.",
      },
      {
        num: 5, title: "별점 + 후기 + 정산",
        desc: "자문 완료 → 의뢰자 별점·후기 → 정산. 평균 4.5+ 시 '인증 전문가' 배지 + 검색 우선순위 ↑.",
      },
    ],
    faqs: [
      { q: "의뢰는 어떻게 들어오나요?", a: "지역+분야 매칭으로 자동 라우팅. 일반적으로 전문가 1인당 월 5~15건 의뢰." },
      { q: "별점이 낮으면?", a: "평균 4.0 미만 시 라우팅 우선순위 하락. 3.5 미만이 3건 이상 누적되면 자격 재검토." },
    ],
    quickActions: [
      { label: "의뢰 응답", href: "/my/partner", icon: MessageCircle },
      { label: "전문가 프로필", href: "/services/experts", icon: GraduationCap },
    ],
  },

  // ── 관리자 ──────────────────────────────────────────
  {
    roleKey: "admin",
    steps: [
      {
        num: 1, title: "오늘의 처리 대기 확인",
        desc: "관리자 대시보드 진입 시 4개 카드: KYC 승인 / 매물 검토 / 보안·컴플라이언스 / 활성 딜룸. 60초마다 자동 새로고침.",
        cta: { label: "관리자 대시보드", href: "/admin" },
        screen: { page: "/admin", location: "Cmd+K (또는 Ctrl+K)", highlight: "오늘의 처리 대기 4개 카드" },
      },
      {
        num: 2, title: "Zone 별 처리 — 6개 운영 영역",
        desc: "거래 운영 (8) / 수익·실적 (4) / 콘텐츠 / 보안 (3) / 시스템 (5). Sidebar Zone 헤더에 빨간 펜딩 배지 자동 표시.",
        screen: { page: "/admin", location: "Sidebar 좌측", highlight: "Zone 헤더의 빨간 펜딩 배지" },
      },
      {
        num: 3, title: "KYC 승인 + 마스킹 검토",
        desc: "회원관리 → KYC 대기 → 사업자등록증 검토 → 승인/거절 (사유 입력). 마스킹 큐 → PII 자동 마스킹 결과 검수.",
      },
      {
        num: 4, title: "매물 심사 + 활성화",
        desc: "PENDING_REVIEW 매물 → 검토 → 활성화. 거절 시 사유 입력 → 매도자 알림.",
      },
      {
        num: 5, title: "콘텐츠·공지사항 발행",
        desc: "콘텐츠 관리 → 공지/배너/뉴스 등록 → 즉시 노출. 공지는 마이페이지 알림센터로도 자동 통보.",
      },
    ],
    faqs: [
      { q: "신규 매물이 자동으로 거래소에 노출되나요?", a: "아니요 — 항상 PENDING_REVIEW 로 시작. 관리자 검토 + 마스킹 검수 후 ACTIVE 로 전환." },
      { q: "긴급 보안 이슈 처리는?", a: "보안·컴플라이언스 Zone 의 빨간 배지 클릭 → 마스킹 큐/PII 감사 진입. 심각도 HIGH 는 SLA 4시간." },
    ],
    quickActions: [
      { label: "오늘의 대기", href: "/admin", icon: Bell },
      { label: "회원 KYC", href: "/admin/users?filter=pending", icon: Users },
      { label: "마스킹 큐", href: "/admin/masking-queue", icon: Shield },
      { label: "매물 검토", href: "/admin/listings?filter=review", icon: FileText },
    ],
  },
]

// ─── 화면 Mockup 컴포넌트 (스크린샷 대체 — McKinsey-style 시각화) ───
function ScreenMockup({ page, location, highlight }: { page: string; location: string; highlight: string }) {
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: `1px solid ${MCK.border}`,
        borderLeft: `3px solid ${MCK.electric}`,
        borderRadius: 4,
        padding: 14,
        marginTop: 12,
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Eye size={12} style={{ color: MCK.electric }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: MCK.electric, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          화면 위치
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", color: MCK.textSub }}>
        <span style={{ fontWeight: 700, color: MCK.ink }}>경로:</span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{page}</span>
        <span style={{ fontWeight: 700, color: MCK.ink }}>네비게이션:</span>
        <span>{location}</span>
        <span style={{ fontWeight: 700, color: MCK.ink }}>클릭 위치:</span>
        <span style={{ fontWeight: 700, color: MCK.electric }}>{highlight}</span>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ────────────────────────────────────────────────────
export default function GuidePage() {
  const [activeRole, setActiveRole] = useState<string>("institution")

  const currentRole = ROLES.find((r) => r.key === activeRole) ?? ROLES[0]
  const workflow = WORKFLOWS.find((w) => w.roleKey === activeRole) ?? WORKFLOWS[0]

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "이용 가이드" }]}
        eyebrow="USER GUIDE · 역할별 워크플로우"
        title="역할별 이용 가이드"
        subtitle="당신의 역할에 맞는 NPLatform 사용법 — 5단계 워크플로우 + 자주 묻는 질문 + 빠른 액션"
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px" }}>

        {/* ── McKinsey 1-line summary ── */}
        <section
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderLeft: `4px solid ${MCK.electric}`,
            padding: 24,
            marginBottom: 32,
          }}
        >
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>핵심 메시지</div>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, color: MCK.ink, lineHeight: 1.5, fontWeight: 600 }}>
            NPLatform 의 핵심은 <strong style={{ color: MCK.electric }}>5단계 워크플로우</strong> 입니다 —
            인증 → 등록/탐색 → 매칭 → 협상 (NDA·LOI) → 본계약·정산.
            <br />
            아래에서 <strong>당신의 역할</strong>을 선택하세요. 단계마다 정확한 화면 위치와 클릭 지점을 안내합니다.
          </p>
        </section>

        {/* ── Role Selector (탭) ── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.textMuted, marginBottom: 12 }}>
            STEP 1 — 역할 선택
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {ROLES.map((role) => {
              const Icon = role.icon
              const isActive = role.key === activeRole
              return (
                <button
                  key={role.key}
                  onClick={() => setActiveRole(role.key)}
                  style={{
                    background: isActive ? role.color : MCK.paper,
                    border: `1px solid ${isActive ? role.color : MCK.border}`,
                    borderRadius: 6,
                    padding: 16,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    color: isActive ? "white" : MCK.ink,
                    boxShadow: isActive ? `0 4px 14px ${role.color}40` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Icon size={16} style={{ color: isActive ? "white" : role.color }} />
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{role.label}</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.4 }}>
                    {role.audience}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── 선택한 역할의 워크플로우 ── */}
        <section
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `4px solid ${currentRole.color}`,
            padding: 32,
            marginBottom: 24,
          }}
        >
          {/* 역할 헤더 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${MCK.border}` }}>
            <div
              style={{
                width: 48, height: 48, background: `${currentRole.color}15`,
                borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <currentRole.icon size={24} style={{ color: currentRole.color }} />
            </div>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: currentRole.color, marginBottom: 4 }}>
                {currentRole.audience}
              </div>
              <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 24, fontWeight: 700, color: MCK.ink, marginBottom: 6 }}>
                {currentRole.label}
              </h2>
              <p style={{ fontSize: 14, color: MCK.textSub, lineHeight: 1.5 }}>
                <strong style={{ color: currentRole.color }}>한 줄 요약: </strong>
                {currentRole.tagline}
              </p>
            </div>
          </div>

          {/* 5단계 워크플로우 */}
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.textMuted, marginBottom: 16 }}>
            STEP 2 — 5단계 워크플로우
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {workflow.steps.map((step) => (
              <div
                key={step.num}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr",
                  gap: 16,
                  padding: 16,
                  background: MCK.paperTint,
                  border: `1px solid ${MCK.border}`,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, background: currentRole.color,
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, borderRadius: "50%",
                  }}
                >
                  {step.num}
                </div>
                <div>
                  <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 700, color: MCK.ink, marginBottom: 6 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.6, marginBottom: step.cta || step.screen ? 10 : 0 }}>
                    {step.desc}
                  </p>
                  {step.cta && (
                    <Link
                      href={step.cta.href}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", fontSize: 12, fontWeight: 700,
                        background: currentRole.color, color: "white",
                        textDecoration: "none", borderRadius: 4, marginRight: 8,
                      }}
                    >
                      {step.cta.label} <ArrowRight size={12} />
                    </Link>
                  )}
                  {step.screen && (
                    <ScreenMockup
                      page={step.screen.page}
                      location={step.screen.location}
                      highlight={step.screen.highlight}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${MCK.border}` }}>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.textMuted, marginBottom: 10 }}>
              STEP 3 — 자주 쓰는 빠른 액션
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {workflow.quickActions.map((qa) => {
                const Icon = qa.icon
                return (
                  <Link
                    key={qa.href}
                    href={qa.href}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", fontSize: 12, fontWeight: 600,
                      background: MCK.paper, color: MCK.ink,
                      border: `1px solid ${MCK.border}`, borderRadius: 99,
                      textDecoration: "none",
                    }}
                  >
                    <Icon size={12} />
                    {qa.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${MCK.border}` }}>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.textMuted, marginBottom: 12 }}>
              STEP 4 — 자주 묻는 질문
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {workflow.faqs.map((faq, idx) => (
                <details
                  key={idx}
                  style={{
                    padding: 14, background: MCK.paperTint, border: `1px solid ${MCK.border}`, borderRadius: 4,
                  }}
                >
                  <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: MCK.ink, listStyle: "none" }}>
                    <ChevronRight size={12} style={{ display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />
                    Q. {faq.q}
                  </summary>
                  <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.6, marginTop: 8, paddingLeft: 18 }}>
                    A. {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── McKinsey-style 종합 정리 ── */}
        <section
          style={{
            background: MCK.ink,
            color: MCK.paper,
            padding: 28,
            borderRadius: 4,
          }}
        >
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 10 }}>
            한 줄로 정리
          </div>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, lineHeight: 1.5, fontWeight: 500, marginBottom: 16 }}>
            "당신의 역할은 <strong style={{ color: MCK.electric }}>{currentRole.label}</strong> 입니다.
            먼저 <strong>인증</strong>으로 시작하고, <strong>5단계 워크플로우</strong>를 따라가세요.
            막히면 <strong>고객센터</strong> 또는 <strong>알림센터</strong>의 1:1 문의로 연락하세요."
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/support"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 18px", fontSize: 13, fontWeight: 700,
                background: MCK.electric, color: "white",
                textDecoration: "none", borderRadius: 4,
              }}
            >
              고객센터 <ArrowRight size={14} />
            </Link>
            <Link
              href="/about"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 18px", fontSize: 13, fontWeight: 700,
                background: "transparent", color: MCK.paper,
                border: `1px solid ${MCK.paper}40`,
                textDecoration: "none", borderRadius: 4,
              }}
            >
              플랫폼 소개
            </Link>
          </div>
        </section>
      </div>
    </MckPageShell>
  )
}
