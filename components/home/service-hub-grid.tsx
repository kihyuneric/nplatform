'use client'

import { Search, ShoppingBag, Store, ArrowRightLeft, Globe, MessageCircle, Briefcase, Brain } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const SERVICE_HUBS = [
  {
    title: 'NPL 마켓',
    description: '전국 NPL 매물 검색·지도·입찰',
    icon: Search,
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    links: [
      { label: '매물 검색', href: '/exchange/search' },
      { label: '지도', href: '/market/map' },
      { label: '입찰', href: '/exchange/bidding' },
    ],
    stat: { label: '등록 매물', value: '87+' },
  },
  {
    title: '매수자 포털',
    description: 'AI 추천·워치리스트·포트폴리오',
    icon: ShoppingBag,
    color: 'from-pink-500 to-rose-500',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
    links: [
      { label: 'AI 추천', href: '/my/portfolio' },
      { label: '관심목록', href: '/my/portfolio' },
      { label: '포트폴리오', href: '/my/portfolio' },
    ],
    stat: { label: '활성 매수자', value: '24+' },
  },
  {
    title: '매도자 포털',
    description: '매물등록·분석·정산관리',
    icon: Store,
    color: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
    links: [
      { label: '대시보드', href: '/my/seller' },
      { label: '매물 등록', href: '/seller/listings/new' },
      { label: '분석', href: '/seller/analytics' },
    ],
    stat: { label: '등록 기관', value: '12+' },
  },
  {
    title: '거래 매칭',
    description: '양면매칭·거래소·공동투자',
    icon: ArrowRightLeft,
    color: 'from-orange-500 to-red-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
    links: [
      { label: '매칭', href: '/marketplace/matching' },
      { label: '거래소', href: '/exchange' },
      { label: '공동투자', href: '/marketplace/co-invest' },
    ],
    stat: { label: '매칭 완료', value: '156+' },
  },
  {
    title: '시장 인텔리전스',
    description: '시장분석·히트맵·리포트·시그널',
    icon: Globe,
    color: 'from-cyan-500 to-teal-500',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    links: [
      { label: '시장 개요', href: '/market-intelligence' },
      { label: '히트맵', href: '/market-intelligence/heatmap' },
      { label: '통계', href: '/statistics' },
    ],
    stat: { label: '데이터 포인트', value: '50K+' },
  },
  {
    title: '커뮤니티',
    description: '토론·전문가칼럼·지식허브',
    icon: MessageCircle,
    color: 'from-indigo-500 to-violet-500',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    links: [
      { label: '커뮤니티', href: '/community' },
      { label: '전문가 칼럼', href: '/community/expert' },
      { label: '학습 코스', href: '/knowledge/courses' },
    ],
    stat: { label: '게시글', value: '340+' },
  },
  {
    title: '전문 서비스',
    description: '법률·감정·세무 전문가 마켓',
    icon: Briefcase,
    color: 'from-purple-500 to-fuchsia-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
    links: [
      { label: '전문가 찾기', href: '/professional' },
      { label: '팀 투자', href: '/teams' },
      { label: '딜룸', href: '/deals' },
    ],
    stat: { label: '전문가', value: '45+' },
  },
  {
    title: '분석 도구',
    description: 'AI 분석·수익률 시뮬레이션',
    icon: Brain,
    color: 'from-emerald-500 to-green-500',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    links: [
      { label: 'NPL 분석', href: '/analysis' },
      { label: '경매 시뮬레이터', href: '/tools/auction-simulator' },
      { label: '분석 이력', href: '/analysis' },
    ],
    stat: { label: 'AI 분석', value: '350+' },
  },
]

export function ServiceHubGrid() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">플랫폼 서비스</h2>
        <p className="mt-2 text-gray-500">NPLatform의 모든 서비스를 한 곳에서</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVICE_HUBS.map((hub, i) => (
          <motion.div
            key={hub.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${hub.bgLight} flex items-center justify-center`}>
                <hub.icon className={`w-5 h-5 ${hub.textColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-[15px]">{hub.title}</h3>
                <p className="text-xs text-gray-500">{hub.description}</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {hub.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs px-2.5 py-1 rounded-full ${hub.bgLight} ${hub.textColor} hover:opacity-80 transition-opacity font-medium`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mini Stat */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-400">{hub.stat.label}</span>
              <span className={`text-sm font-bold ${hub.textColor}`}>{hub.stat.value}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
