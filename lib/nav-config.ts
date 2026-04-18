// ─── Navigation Configuration System ─────────────────────────────────────────
// Admin can activate/deactivate items, rename labels.
// Changes propagate to: top nav, footer, main page service hub.
// Users can also have personal overrides.

export interface NavSubItem {
  key: string
  label: string
  href: string
  description?: string
  icon?: string
  active: boolean
  order: number
}

export interface NavCategory {
  key: string
  label: string
  href: string
  active: boolean
  order: number
  items: NavSubItem[]
}

export interface NavConfig {
  categories: NavCategory[]
  pageSubNavs?: Record<string, NavSubItem[]>  // page-key → sub-nav items (optional for backward compat)
  updatedAt: string
}

// Page sub-nav label map for display
export const PAGE_SUBNAV_LABELS: Record<string, string> = {
  exchange: 'NPL 매물 서브메뉴',
  deals: '거래 현황 서브메뉴',
  analysis: '투자 분석 서브메뉴',
  services: '전문가 서비스 서브메뉴',
}

// Default navigation configuration
export const DEFAULT_NAV_CONFIG: NavConfig = {
  updatedAt: new Date().toISOString(),
  pageSubNavs: {
    exchange: [
      { key: 'ex_all',          label: '거래소',     href: '/exchange',                description: 'NPL 거래소 메인',          icon: 'Store',        active: true, order: 1 },
      { key: 'ex_search',       label: '검색',       href: '/exchange/search',          description: '상세 필터 데이터 그리드',    icon: 'Search',       active: true, order: 2 },
      { key: 'ex_map',          label: '지도',       href: '/exchange/map',             description: '지도 기반 탐색',            icon: 'Map',          active: true, order: 3 },
      { key: 'ex_bidding',      label: '입찰',       href: '/exchange/auction',         description: '입찰 참여',                 icon: 'Gavel',        active: true, order: 4 },
      { key: 'ex_sell',         label: '매물 등록',  href: '/exchange/sell',            description: '내 채권 매각 등록',         icon: 'PlusCircle',   active: true, order: 5 },
      { key: 'ex_bulk',         label: '대량 등록',  href: '/exchange/bulk-upload',     description: 'AI OCR 대량 등록',          icon: 'Upload',       active: true, order: 6 },
      { key: 'ex_demands',      label: '매수 수요',  href: '/exchange/demands',         description: '원하는 조건 등록',          icon: 'ClipboardList', active: true, order: 7 },
      { key: 'ex_institutions', label: '참여 기관',  href: '/exchange/institutions',    description: '매각 기관 현황',            icon: 'Building2',    active: true, order: 8 },
      { key: 'ex_fund',         label: '팀투자',     href: '/deals/teams',              description: 'NPL 공동투자 팀',           icon: 'Users',        active: true, order: 9 },
      { key: 'ex_lender',       label: '대출',       href: '/exchange/lender',          description: '투자 자금 조달',            icon: 'Landmark',     active: true, order: 10 },
      { key: 'ex_guide',        label: '이용 가이드', href: '/guide',                   description: 'NPL 매물 이용 가이드',      icon: 'BookOpen',     active: true, order: 11 },
    ],
    deals: [
      { key: 'deals_list',      label: '딜룸',        href: '/deals',                description: '진행 중인 거래 현황',         icon: 'ClipboardList',  active: true, order: 1 },
      { key: 'deals_matching',  label: 'AI 매칭',     href: '/deals/matching',       description: 'AI 기반 매물-투자자 매칭',    icon: 'Brain',          active: true, order: 2 },
      { key: 'deals_contract',  label: '계약서 생성', href: '/deals/contract',       description: 'AI 자동 계약서 생성',         icon: 'FileSignature',  active: true, order: 3 },
      { key: 'deals_teams',     label: '팀 투자',     href: '/deals/teams',          description: '공동투자 팀 관리',            icon: 'Users',          active: true, order: 4 },
      { key: 'deals_archive',   label: '완료 거래',   href: '/deals/archive',        description: '과거 거래 기록',              icon: 'Archive',        active: true, order: 5 },
      { key: 'deals_community', label: '커뮤니티',    href: '/services/community',   description: 'NPL 투자자 커뮤니티',         icon: 'MessageSquare',  active: true, order: 6 },
    ],
    analysis: [
      { key: 'analysis_main',    label: '분석 대시보드',   href: '/analysis',                    description: '시장 통계 및 인텔리전스',  icon: 'BarChart3',   active: true, order: 1 },
      { key: 'analysis_new',     label: 'NPL 분석',        href: '/analysis/new',                description: 'AI 채권 가치 분석',        icon: 'FileSearch',  active: true, order: 2 },
      { key: 'analysis_nbi',     label: 'NPL 가격지수',    href: '/analysis/npl-index',          description: 'NBI 주간 낙찰가율 지수',   icon: 'TrendingUp',  active: true, order: 3 },
      { key: 'analysis_copilot', label: 'AI 컨설턴트',         href: '/analysis/copilot',            description: 'AI 투자 컨설팅 챗봇',      icon: 'Sparkles',    active: true, order: 4 },
      { key: 'analysis_sim',     label: '경매 수익률 분석기',  href: '/analysis/simulator',          description: '경매 수익률 분석',         icon: 'Calculator',  active: true, order: 5 },
      { key: 'analysis_ocr',     label: '계약서 생성',         href: '/analysis/ocr',                description: 'AI 자동 계약서 생성',      icon: 'ScanLine',    active: true, order: 6 },
    ],
    services: [
      { key: 'svc_experts',   label: '전문가 찾기',   href: '/services/experts',           description: '법률·세무·부동산 전문가',    icon: 'Users',        active: true, order: 1 },
      { key: 'svc_register',  label: '전문가 등록',   href: '/services/experts/register',  description: '전문가로 등록',              icon: 'PlusCircle',   active: true, order: 2 },
    ],
    community: [
      { key: 'com_community', label: '커뮤니티',      href: '/services/community',         description: 'NPL 투자자 커뮤니티',        icon: 'MessageSquare', active: true, order: 1 },
      { key: 'com_learn',     label: '교육 센터',     href: '/services/learn',             description: '강좌·용어사전·교육',         icon: 'GraduationCap', active: true, order: 2 },
      { key: 'com_news',      label: '뉴스',          href: '/news',                       description: '부동산·금융 최신 뉴스',      icon: 'Newspaper',     active: true, order: 3 },
      { key: 'com_notices',   label: '공지사항',      href: '/notices',                    description: '플랫폼 공지',                icon: 'Bell',          active: true, order: 4 },
    ],
  },
  categories: [
    {
      key: 'exchange',
      label: '거래소',
      href: '/exchange',
      active: true,
      order: 1,
      items: [
        { key: 'exchange_browse', label: '거래소', href: '/exchange', description: 'NPL 거래소 메인', icon: 'Store', active: true, order: 1 },
        { key: 'exchange_sell', label: '매물 등록', href: '/exchange/sell', description: '내 NPL 채권 매각 등록', icon: 'PlusCircle', active: true, order: 2 },
        { key: 'exchange_demands', label: '매수 수요', href: '/exchange/demands', description: '원하는 매물 조건 등록', icon: 'ClipboardList', active: true, order: 3 },
        { key: 'exchange_institutions', label: '참여 기관', href: '/exchange/institutions', description: '매각 기관 현황', icon: 'Building2', active: true, order: 4 },
        { key: 'exchange_fund', label: '팀투자', href: '/deals/teams', description: 'NPL 공동투자 팀', icon: 'Users', active: true, order: 5 },
        { key: 'exchange_lender', label: '대출 연계', href: '/exchange/lender', description: '투자 자금 조달', icon: 'Landmark', active: true, order: 6 },
      ],
    },
    {
      key: 'deals',
      label: '딜룸',
      href: '/deals',
      active: true,
      order: 2,
      items: [
        { key: 'deals_list',      label: '내 거래',     href: '/deals',              description: '진행 중인 거래 현황',      icon: 'ClipboardList',  active: true, order: 1 },
        { key: 'deals_matching',  label: 'AI 매칭',     href: '/deals/matching',     description: 'AI 기반 매물-투자자 매칭', icon: 'Brain',          active: true, order: 2 },
        { key: 'deals_contract',  label: '계약서 생성', href: '/deals/contract',     description: 'AI 자동 계약서 생성',      icon: 'FileSignature',  active: true, order: 3 },
        { key: 'deals_archive',   label: '완료 거래',   href: '/deals/archive',      description: '과거 거래 기록',           icon: 'Archive',        active: true, order: 4 },
        { key: 'deals_community', label: '커뮤니티',    href: '/services/community', description: 'NPL 투자자 커뮤니티',      icon: 'MessageSquare',  active: true, order: 5 },
      ],
    },
    {
      key: 'analysis',
      label: '분석',
      href: '/analysis',
      active: true,
      order: 3,
      items: [
        { key: 'analysis_dashboard', label: '분석 대시보드', href: '/analysis',            description: '시장 통계 및 인텔리전스', icon: 'BarChart3',  active: true, order: 1 },
        { key: 'analysis_new',       label: 'NPL 분석',        href: '/analysis/new',        description: 'AI 채권 가치 분석',       icon: 'FileSearch', active: true, order: 2 },
        { key: 'analysis_nbi',       label: 'NPL 가격지수',    href: '/analysis/npl-index',  description: 'NBI 주간 낙찰가율 지수',  icon: 'TrendingUp', active: true, order: 3 },
        { key: 'analysis_simulator', label: '경매 수익률 분석기', href: '/analysis/simulator',  description: '경매 수익률 분석',       icon: 'Calculator', active: true, order: 4 },
        { key: 'analysis_ocr',       label: '계약서 생성',         href: '/analysis/ocr',        description: 'AI 자동 계약서 생성',    icon: 'ScanLine',   active: true, order: 5 },
      ],
    },
    {
      key: 'services',
      label: '커뮤니티',
      href: '/services',
      active: true,
      order: 4,
      items: [
        { key: 'services_community', label: '커뮤니티', href: '/services/community', description: 'NPL 투자자 커뮤니티', icon: 'MessageSquare', active: true, order: 1 },
        { key: 'services_experts', label: '전문가', href: '/services/experts', description: '법률·세무·부동산 전문가', icon: 'Users', active: true, order: 2 },
        { key: 'services_learn', label: '지식센터', href: '/services/learn', description: '교육 과정 및 용어사전', icon: 'GraduationCap', active: true, order: 3 },
        { key: 'services_news', label: '뉴스', href: '/news', description: '부동산·금융 최신 뉴스', icon: 'Newspaper', active: true, order: 4 },
      ],
    },
    {
      key: 'analysis_tools',
      label: '분석도구',
      href: '/analysis',
      active: true,
      order: 5,
      items: [
        { key: 'tool_simulator', label: '경매 수익률 분석기', href: '/analysis/simulator', description: '경매 수익률 분석', icon: 'Calculator', active: true, order: 1 },
        { key: 'tool_ocr', label: '계약서 생성', href: '/analysis/ocr', description: 'AI 자동 계약서 생성', icon: 'ScanLine', active: true, order: 2 },
        { key: 'tool_map', label: '지도 검색', href: '/exchange', description: 'NPL 지도 탐색', icon: 'Map', active: true, order: 3 },
      ],
    },
    {
      key: 'my',
      label: '마이 페이지',
      href: '/my',
      active: true,
      order: 6,
      items: [
        { key: 'my_dashboard',    label: '내 대시보드',   href: '/my',               description: '개인화 대시보드',          icon: 'User',       active: true, order: 1 },
        { key: 'my_portfolio',    label: '포트폴리오',    href: '/my/portfolio',     description: '관심 매물 및 투자 현황',    icon: 'Heart',      active: true, order: 2 },
        { key: 'my_billing',      label: '구독·결제',    href: '/my/billing',       description: '요금제 및 크레딧 관리',     icon: 'CreditCard', active: true, order: 3 },
        { key: 'my_organization', label: '기관 계정',     href: '/my/organization',  description: '기관 멤버 관리 및 초대',    icon: 'Building2',  active: true, order: 4 },
        { key: 'my_notifications',label: '알림',          href: '/my/notifications', description: '알림 및 키워드 설정',       icon: 'Bell',       active: true, order: 5 },
        { key: 'my_settings',     label: '설정',          href: '/my/settings',      description: '프로필 및 보안 설정',       icon: 'Settings',   active: true, order: 6 },
      ],
    },
  ],
}
