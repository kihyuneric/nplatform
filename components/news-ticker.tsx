"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Gavel, TrendingUp, MessageCircle, Bell, Package,
  ArrowRight, Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TickerItem {
  id: string
  type: "TRADE" | "NEW_LISTING" | "COMMUNITY" | "SIGNAL" | "BIDDING"
  message: string
  time: string
  href: string
}

const TICKER_META: Record<TickerItem["type"], { icon: any; color: string; label: string }> = {
  TRADE:       { icon: TrendingUp,    color: "text-emerald-600 bg-emerald-50", label: "거래" },
  NEW_LISTING: { icon: Package,       color: "text-blue-600 bg-blue-50",       label: "신규매물" },
  COMMUNITY:   { icon: MessageCircle, color: "text-violet-600 bg-violet-50",   label: "커뮤니티" },
  SIGNAL:      { icon: Bell,          color: "text-amber-600 bg-amber-50",     label: "시그널" },
  BIDDING:     { icon: Gavel,         color: "text-red-600 bg-red-50",         label: "입찰" },
}

const MOCK_TICKER: TickerItem[] = [
  { id: "t1", type: "TRADE",       message: "서울 강남구 아파트 NPL — 28억원 거래 체결",          time: "3분 전",   href: "/exchange" },
  { id: "t2", type: "NEW_LISTING", message: "KB국민은행 — 경기 성남시 오피스 45억원 신규 등록",    time: "12분 전",  href: "/exchange/search" },
  { id: "t3", type: "BIDDING",     message: "인천 서구 공장 경공매 — 입찰 마감 D-2",              time: "18분 전",  href: "/marketplace/calendar" },
  { id: "t4", type: "SIGNAL",      message: "AI 시그널: 서울 송파구 NPL 낙찰가율 상승 추세",      time: "25분 전",  href: "/market-intelligence/signals" },
  { id: "t5", type: "COMMUNITY",   message: "전문가 칼럼: 2026년 상반기 NPL 시장 전망",           time: "1시간 전", href: "/community/expert" },
  { id: "t6", type: "TRADE",       message: "부산 해운대 리조트 NPL — 120억원 포트폴리오 체결",   time: "2시간 전", href: "/exchange" },
  { id: "t7", type: "NEW_LISTING", message: "하나캐피탈 — 부산 사하구 창고 7.5억원 신규 등록",    time: "2시간 전", href: "/exchange/search" },
  { id: "t8", type: "BIDDING",     message: "대구 수성구 아파트 NPL — 입찰 진행중 (5.8억원)",     time: "3시간 전", href: "/exchange/bidding" },
  { id: "t9", type: "SIGNAL",      message: "AI 시그널: 경기도 물류창고 NPL 매물 증가 감지",      time: "4시간 전", href: "/market-intelligence/signals" },
  { id: "t10", type: "COMMUNITY",  message: "실시간 토론: NPL 세금 절세 전략 공유",               time: "5시간 전", href: "/community" },
]

export function NewsTicker() {
  const [paused, setPaused] = useState(false)
  const items = [...MOCK_TICKER, ...MOCK_TICKER]

  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 shrink-0 pr-4 py-3 border-r border-slate-200">
            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-[#1B3A5C] whitespace-nowrap">실시간</span>
          </div>

          <div
            className="relative flex-1 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <motion.div
              className="flex gap-8 py-3 pl-4"
              animate={{ x: paused ? undefined : ["0%", "-50%"] }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 40,
                  ease: "linear",
                },
              }}
              style={{ width: "max-content" }}
            >
              {items.map((item, idx) => {
                const meta = TICKER_META[item.type]
                const Icon = meta.icon
                return (
                  <Link
                    key={`${item.id}-${idx}`}
                    href={item.href}
                    className="flex items-center gap-2 shrink-0 group"
                  >
                    <Badge className={`${meta.color} border-0 text-[10px] px-1.5 py-0.5 gap-0.5`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                    <span className="text-xs text-slate-700 group-hover:text-[#1B3A5C] transition-colors whitespace-nowrap">
                      {item.message}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {item.time}
                    </span>
                  </Link>
                )
              })}
            </motion.div>
          </div>

          <Link
            href="/market-intelligence"
            className="hidden sm:flex items-center gap-1 shrink-0 pl-4 border-l border-slate-200 text-xs text-[#2E75B6] hover:text-[#1B3A5C] font-medium transition-colors whitespace-nowrap"
          >
            전체 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  )
}
