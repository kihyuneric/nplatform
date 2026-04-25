"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown, Minus, MapPin, FileText,
  ChevronRight, ArrowUpRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

interface RegionStat {
  name: string
  nplCount: number
  avgDiscount: number
  trend: "up" | "down" | "flat"
  trendValue: string
  color: string
}

const REGIONS: RegionStat[] = [
  { name: "서울", nplCount: 142, avgDiscount: 32, trend: "up",   trendValue: "+8%",  color: "bg-stone-100" },
  { name: "경기", nplCount: 118, avgDiscount: 38, trend: "up",   trendValue: "+12%", color: "bg-stone-100" },
  { name: "부산", nplCount: 65,  avgDiscount: 41, trend: "down", trendValue: "-3%",  color: "bg-stone-100" },
  { name: "인천", nplCount: 48,  avgDiscount: 35, trend: "up",   trendValue: "+5%",  color: "bg-stone-100" },
  { name: "대구", nplCount: 38,  avgDiscount: 44, trend: "flat", trendValue: "0%",   color: "bg-stone-100" },
  { name: "대전", nplCount: 27,  avgDiscount: 39, trend: "down", trendValue: "-2%",  color: "bg-stone-100" },
]

const WEEKLY_REPORTS = [
  {
    title: "2026년 3월 3주차 NPL 시장 리포트",
    summary: "서울·경기권 아파트 NPL 매물 전주 대비 15% 증가, 평균 할인율 소폭 하락",
    date: "2026-03-20",
    tag: "주간 리포트",
    href: "/market-intelligence/reports",
  },
  {
    title: "금융기관별 NPL 매각 동향 분석",
    summary: "KB·하나 등 시중은행 일괄매각 물량 확대, 저축은행 소형 물건 개별매각 증가",
    date: "2026-03-18",
    tag: "기관 분석",
    href: "/market-intelligence/reports",
  },
  {
    title: "경공매 낙찰가율 변동 트렌드",
    summary: "수도권 경매 낙찰가율 85% 돌파, 지방 광역시는 72~78% 유지",
    date: "2026-03-15",
    tag: "트렌드",
    href: "/market-intelligence/signals",
  },
]

const TrendIcon = ({ trend }: { trend: "up" | "down" | "flat" }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-stone-900" />
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-stone-900" />
  return <Minus className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
}

export function MarketInsightPanel() {
  const maxCount = Math.max(...REGIONS.map((r) => r.nplCount))

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl font-bold text-[var(--color-brand-dark)] sm:text-3xl"
          >
            시장 인사이트
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-muted-foreground">
            NPL 시장의 핵심 지표와 최신 리포트를 한눈에 확인하세요
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mt-12 grid gap-6 lg:grid-cols-2"
        >
          {/* Left: Region Mini Heatmap */}
          <motion.div variants={fadeUp}>
            <Card className="border-0 bg-[var(--color-surface-elevated)] shadow-md h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-dark)]/10">
                      <MapPin className="h-5 w-5 text-[var(--color-brand-dark)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-brand-dark)]">지역별 NPL 현황</h3>
                      <p className="text-xs text-muted-foreground">전주 대비 매물 변동</p>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-xs text-[#2E75B6]">
                    <Link href="/market-intelligence/heatmap">
                      히트맵 <ChevronRight className="ml-0.5 h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                <div className="space-y-3">
                  {REGIONS.map((region) => (
                    <Link
                      key={region.name}
                      href={`/market/search?region=${encodeURIComponent(region.name)}`}
                      className="group flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-[var(--color-surface-base)] transition-colors"
                    >
                      <div className={`h-8 w-8 rounded-lg ${region.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {region.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--color-text-secondary)]">{region.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">할인율 {region.avgDiscount}%</span>
                            <div className="flex items-center gap-0.5">
                              <TrendIcon trend={region.trend} />
                              <span className={`text-xs font-medium ${
                                region.trend === "up" ? "text-stone-900" :
                                region.trend === "down" ? "text-stone-900" : "text-[var(--color-text-muted)]"
                              }`}>
                                {region.trendValue}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--color-surface-base)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${region.color} transition-all`}
                            style={{ width: `${(region.nplCount / maxCount) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{region.nplCount}건</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: Weekly Reports */}
          <motion.div variants={fadeUp}>
            <Card className="border-0 bg-[var(--color-surface-elevated)] shadow-md h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-positive)]/10">
                      <FileText className="h-5 w-5 text-[var(--color-positive)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-brand-dark)]">최신 리포트</h3>
                      <p className="text-xs text-muted-foreground">시장 분석 & 투자 인사이트</p>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-xs text-[#2E75B6]">
                    <Link href="/market-intelligence/reports">
                      전체보기 <ChevronRight className="ml-0.5 h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                <div className="space-y-4">
                  {WEEKLY_REPORTS.map((report, idx) => (
                    <Link
                      key={idx}
                      href={report.href}
                      className="group block rounded-xl border border-[var(--color-border-subtle)] p-4 hover:border-[#2E75B6]/30 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] border-[var(--color-brand-dark)]/20 text-[var(--color-brand-dark)]">
                          {report.tag}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{report.date}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-brand-dark)] transition-colors mb-1">
                        {report.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {report.summary}
                      </p>
                      <div className="mt-2 flex items-center text-xs font-medium text-[#2E75B6] opacity-0 group-hover:opacity-100 transition-opacity">
                        자세히 보기 <ArrowUpRight className="ml-0.5 h-3 w-3" />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "총 매물", value: "438건", change: "+23", changeType: "up" as const },
                    { label: "평균 할인율", value: "36.5%", change: "-0.8%p", changeType: "down" as const },
                    { label: "주간 거래", value: "52건", change: "+8", changeType: "up" as const },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg bg-[var(--color-surface-base)] p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-bold text-[var(--color-brand-dark)] mt-0.5">{stat.value}</p>
                      <p className={`text-[10px] font-medium mt-0.5 ${
                        stat.changeType === "up" ? "text-stone-900" : "text-stone-900"
                      }`}>
                        {stat.change}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
