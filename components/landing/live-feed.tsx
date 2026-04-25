"use client"
import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"

const MOCK_DEALS = [
  { institution: "하나AMC", type: "오피스", region: "서울 강남", amount: "52억", time: "방금 전" },
  { institution: "신한은행", type: "아파트", region: "경기 판교", amount: "18억", time: "3분 전" },
  { institution: "KB국민은행", type: "상가", region: "부산 해운대", amount: "9.5억", time: "7분 전" },
  { institution: "우리은행", type: "토지", region: "제주", amount: "32억", time: "12분 전" },
  { institution: "연합자산관리", type: "오피스텔", region: "서울 마포", amount: "6.8억", time: "15분 전" },
]

export function LiveFeed() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(v => (v + 1) % MOCK_DEALS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const deal = MOCK_DEALS[visible]

  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm animate-in fade-in duration-500">
      <CheckCircle2 className="h-4 w-4 text-[#14161A] shrink-0" />
      <span className="text-white/90">
        <strong className="text-white font-semibold">{deal.institution}</strong>
        {' '}{deal.region} {deal.type} {deal.amount} 거래 완료
      </span>
      <span className="text-xs text-white/50 shrink-0">{deal.time}</span>
    </div>
  )
}
