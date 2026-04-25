'use client'

import Link from 'next/link'
import { MessageCircle, BookOpen, Award, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const HIGHLIGHTS = [
  {
    category: '전문가 칼럼',
    title: '2026년 상반기 NPL 시장 전망과 투자 전략',
    author: '김투자 (NPL 전문 변호사)',
    date: '2026.03.18',
    icon: BookOpen,
    href: '/community/expert',
    color: 'text-stone-900',
    bg: 'bg-stone-100/10',
  },
  {
    category: '시장 분석',
    title: '수도권 아파트 NPL 낙찰가율 추이 분석',
    author: 'NPLatform 리서치팀',
    date: '2026.03.15',
    icon: Award,
    href: '/market-intelligence/reports',
    color: 'text-stone-900',
    bg: 'bg-stone-100/10',
  },
  {
    category: '커뮤니티',
    title: '신규 투자자를 위한 NPL 입문 가이드',
    author: '박매칭 (10년차 NPL 투자자)',
    date: '2026.03.12',
    icon: MessageCircle,
    href: '/community',
    color: 'text-stone-900',
    bg: 'bg-stone-100/10',
  },
]

export function CommunityHighlights() {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">커뮤니티 & 인사이트</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">전문가 분석과 커뮤니티 소식</p>
        </div>
        <Link href="/community" className="text-sm text-[#2E75B6] hover:underline flex items-center gap-1">
          더보기 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HIGHLIGHTS.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <Link
              href={item.href}
              className="block bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border-subtle)] p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${item.bg} ${item.color}`}>
                  <item.icon className="w-3 h-3" />
                  {item.category}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{item.date}</span>
              </div>
              <h3 className="font-semibold text-[var(--color-text-primary)] text-[15px] mb-2 line-clamp-2">{item.title}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">{item.author}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
