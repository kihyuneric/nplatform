'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ChevronRight } from 'lucide-react'

const segmentLabels: Record<string, string> = {
  // 거래소
  market: '거래소',
  exchange: '거래소',
  search: '검색',
  map: '지도',
  bidding: '입찰',
  listings: '매물',
  new: '신규',
  // 분석
  'npl-analysis': 'NPL 분석',
  tools: '도구',
  'auction-simulator': '경매 분석',
  simulator: '경매 분석',
  copilot: 'AI 컨설턴트',
  ocr: '계약서 생성',
  compare: '비교',
  // 매수자·매도자
  buyer: '매수자',
  seller: '매도자',
  recommendations: 'AI 추천',
  watchlist: '관심목록',
  alerts: '알림',
  'saved-searches': '저장된 검색',
  portfolio: '포트폴리오',
  'due-diligence': '실사 자료',
  dashboard: '대시보드',
  analytics: '분석',
  settlement: '정산',
  // 딜룸
  marketplace: '거래소',
  deals: '딜룸',
  matching: '매칭',
  calendar: '캘린더',
  'co-invest': '공동투자',
  'portfolio-bid': '포트폴리오 입찰',
  // 인텔리전스
  'market-intelligence': '시장 인텔리전스',
  heatmap: '히트맵',
  reports: '리포트',
  signals: '시그널',
  statistics: '통계',
  trend: '트렌드',
  // 커뮤니티·학습
  community: '커뮤니티',
  expert: '전문가 칼럼',
  knowledge: '지식허브',
  courses: '학습 코스',
  glossary: '용어사전',
  // 전문서비스
  professional: '전문서비스',
  fund: '펀드',
  lender: '대출기관',
  teams: '팀투자',
  'deal-rooms': '딜룸',
  // 기타
  about: '서비스소개',
  admin: '관리자',
  users: '사용자 관리',
  kyc: 'KYC 심사',
  'audit-logs': '감사 로그',
  system: '시스템',
  'api-keys': 'API 관리',
  institution: '기관',
  'bulk-upload': '대량 업로드',
  investor: '투자자',
  'analysis-history': '분석 이력',
  favorites: '관심매물',
  comparisons: '매물비교',
  verification: '인증',
  partner: '파트너',
  mypage: '마이페이지',
  settings: '설정',
  notifications: '알림',
  notices: '공지사항',
  support: '고객센터',
  contract: '계약',
  demand: '수요',
  survey: '설문',
  surveys: '설문 목록',
  matches: '매칭결과',
  services: '전문가 서비스',
  analysis: '투자 분석',
  pricing: '요금제',
  my: '마이 페이지',
  guide: '이용 가이드',
}

export function BreadcrumbNav() {
  const pathname = usePathname()

  // Hide on home page
  if (pathname === '/') return null

  const segments = (pathname ?? '').split('/').filter(Boolean)

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = segmentLabels[segment] || segment
    const isLast = index === segments.length - 1

    return { href, label, isLast }
  })

  return (
    <nav aria-label="Breadcrumb" className="px-4 py-2 md:px-6">
      <ol className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
        <li>
          <Link
            href="/"
            aria-label="홈"
            className="flex items-center text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)] focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none rounded"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {breadcrumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-[var(--color-text-muted)]" />
            {crumb.isLast ? (
              <span aria-current="page" className="font-bold text-[var(--color-text-primary)]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none rounded"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
