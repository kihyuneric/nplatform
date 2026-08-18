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
  /** true = ADMIN / SUPER_ADMIN 만 표시. 일반 유저에게 hidden. */
  adminOnly?: boolean
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
  exchange: 'NPL 거래 서브메뉴',
  news: '공지/문의 서브메뉴',
}

// Default navigation configuration
// ─── B2B 프라이빗 딜 IA (2026-08) ───────────────────────────────
// 분석·딜룸·경매·팀투자·전문가 서비스는 active:false 로 숨김 (관리자에서 복구 가능)
export const DEFAULT_NAV_CONFIG: NavConfig = {
  updatedAt: new Date().toISOString(),
  pageSubNavs: {
    exchange: [
      { key: 'ex_all',     label: 'NPL 자동매칭',    href: '/exchange',          description: '마스킹 처리된 NPL 리스트',        icon: 'Store',         active: true, order: 1 },
      { key: 'ex_discover',label: '부동산 급매',   href: '/exchange/discover', description: '급매 부동산 (마스킹)',            icon: 'Newspaper',     active: true, order: 2 },
      { key: 'ex_sell',    label: 'NPL 매각의뢰',  href: '/exchange/sell',     description: '파일 업로드 → 운영진 대신 등록',  icon: 'PlusCircle',    active: true, order: 3 },
      { key: 'ex_demands', label: '매입조건 등록', href: '/exchange/demands/new', description: '우선순위별 매입 조건 등록',        icon: 'ClipboardList', active: true, order: 4 },
      { key: 'ex_guide',   label: '이용 가이드',   href: '/guide',             description: '이용 가이드',                     icon: 'BookOpen',      active: true, order: 5 },
      // ── 숨김 (프라이빗 딜 전환) ──
      { key: 'ex_search',       label: '검색',       href: '/exchange/search',       icon: 'Search',    active: false, order: 90 },
      { key: 'ex_bidding',      label: '자발적 경매', href: '/exchange/auction',      icon: 'Gavel',     active: false, order: 91 },
      { key: 'ex_institutions', label: '참여 기관',  href: '/exchange/institutions', icon: 'Building2', active: false, order: 92 },
      { key: 'ex_fund',         label: '팀투자',     href: '/deals/teams',           icon: 'Users',     active: false, order: 93 },
      { key: 'ex_lender',       label: '대출',       href: '/exchange/lender',       icon: 'Landmark',  active: false, order: 94 },
    ],
    community: [
      { key: 'com_notices', label: '공지사항', href: '/notices', description: '플랫폼 공지',         icon: 'Bell',     active: true, order: 1 },
      { key: 'com_support', label: '고객센터', href: '/support', description: 'FAQ · 문의 · 도움말', icon: 'LifeBuoy', active: true, order: 2 },
    ],
  },
  categories: [
    {
      key: 'exchange',
      label: 'NPL 거래',
      href: '/exchange',
      active: true,
      order: 1,
      items: [
        { key: 'exchange_browse',  label: 'NPL 자동매칭',   href: '/exchange',          description: '마스킹 처리된 NPL 리스트',       icon: 'Store',         active: true, order: 1 },
        { key: 'exchange_discover',label: '부동산 급매',  href: '/exchange/discover', description: '급매 부동산 (마스킹)',           icon: 'Newspaper',     active: true, order: 2 },
        { key: 'exchange_sell',    label: 'NPL 매각의뢰', href: '/exchange/sell',     description: '파일 업로드 → 운영진 대신 등록', icon: 'PlusCircle',    active: true, order: 3 },
        { key: 'exchange_demands', label: '매입조건 등록', href: '/exchange/demands/new', description: '우선순위별 매입 조건 등록',       icon: 'ClipboardList', active: true, order: 4 },
      ],
    },
    {
      key: 'news',
      label: '공지/문의',
      href: '/notices',
      active: true,
      order: 2,
      items: [
        { key: 'news_notices', label: '공지사항', href: '/notices', description: '플랫폼 공지',         icon: 'Bell',     active: true, order: 1 },
        { key: 'news_support', label: '고객센터', href: '/support', description: 'FAQ · 문의 · 도움말', icon: 'LifeBuoy', active: true, order: 2 },
      ],
    },
    {
      key: 'my',
      label: '마이 페이지',
      href: '/my',
      active: true,
      order: 3,
      items: [
        { key: 'my_dashboard',    label: '내 대시보드', href: '/my',               description: '개인화 대시보드',       icon: 'User',     active: true, order: 1 },
        { key: 'my_seller',       label: '내 매물',     href: '/my/seller',        description: '내 등록 매물 관리',     icon: 'Layers',   active: true, order: 2 },
        { key: 'my_demands',      label: '내 수요',     href: '/my/demands',       description: '내 매입 조건 관리',      icon: 'ClipboardList', active: true, order: 3 },
        { key: 'my_notifications',label: '알림',        href: '/my/notifications', description: '알림 및 키워드 설정',   icon: 'Bell',     active: true, order: 4 },
        { key: 'my_settings',     label: '설정',        href: '/my/settings',      description: '프로필 및 보안 설정',   icon: 'Settings', active: true, order: 5 },
      ],
    },
    // ── 숨김 카테고리 (프라이빗 딜 전환 — 관리자에서 재활성화 가능) ──
    {
      key: 'deals',
      label: '딜룸',
      href: '/deals',
      active: false,
      order: 90,
      items: [
        { key: 'deals_room',      label: '딜룸',     href: '/deals',           icon: 'MessageSquare',   active: false, order: 1 },
        { key: 'deals_dashboard', label: '대시보드', href: '/deals/dashboard', icon: 'LayoutDashboard', active: false, order: 2 },
        { key: 'deals_matching',  label: '매칭',     href: '/deals/matching',  icon: 'Brain',           active: false, order: 3 },
        { key: 'deals_teams',     label: '팀 투자',  href: '/deals/teams',     icon: 'Users',           active: false, order: 4 },
      ],
    },
    {
      key: 'analysis',
      label: '분석',
      href: '/analysis',
      active: false,
      order: 91,
      items: [
        { key: 'analysis_dashboard', label: '분석 대시보드', href: '/analysis',           icon: 'BarChart3',  active: false, order: 1 },
        { key: 'analysis_new',       label: 'NPL 분석',      href: '/analysis/new',       icon: 'FileSearch', active: false, order: 2 },
        { key: 'analysis_simulator', label: '경매 분석',     href: '/analysis/simulator', icon: 'Calculator', active: false, order: 3 },
        { key: 'analysis_copilot',   label: 'AI 컨설턴트',   href: '/analysis/copilot',   icon: 'Sparkles',   active: false, order: 4 },
      ],
    },
  ],
}
