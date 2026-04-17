'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Building2, PieChart, Scale, Handshake, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  {
    id: 'BUYER',
    label: '바이어',
    subtitle: '매수 투자자',
    icon: TrendingUp,
    desc: 'NPL 매물을 직접 분석하고 투자합니다',
  },
  {
    id: 'SELLER',
    label: '셀러',
    subtitle: '채권 보유 기관',
    icon: Building2,
    desc: '보유한 NPL 채권을 매각하고 싶습니다',
  },
  {
    id: 'INVESTOR',
    label: '투자자',
    subtitle: '개인/기관',
    icon: PieChart,
    desc: '공동투자 또는 펀드를 통해 투자합니다',
  },
  {
    id: 'PROFESSIONAL',
    label: '전문가',
    subtitle: '법무사/세무사/중개사',
    icon: Scale,
    desc: '전문 서비스를 제공하고 싶습니다',
  },
  {
    id: 'PARTNER',
    label: '파트너',
    subtitle: '추천인',
    icon: Handshake,
    desc: '플랫폼 소개로 수익을 창출합니다',
  },
]

export default function SelectRolePage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selected }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error?.message || '오류가 발생했습니다')
        return
      }

      document.cookie = `active_role=${selected};path=/;max-age=${60 * 60 * 24 * 30}`
      toast.success('역할이 설정되었습니다')

      const redirectMap: Record<string, string> = {
        BUYER: '/buyer/dashboard',
        SELLER: '/seller/dashboard',
        INVESTOR: '/',
        PROFESSIONAL: '/professional/my/dashboard',
        PARTNER: '/partner/dashboard',
      }
      router.push(redirectMap[selected] || '/')
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-dark)] flex items-center justify-center shadow-md">
          <span className="text-white font-black text-base">N</span>
        </div>
        <span className="text-2xl font-black text-[var(--color-brand-deep)] tracking-tight">NPLatform</span>
      </div>

      {/* Heading */}
      <div className="text-center mb-10 max-w-lg">
        <h1 className="text-3xl font-black text-[var(--color-brand-deep)] tracking-normal mb-3">
          어떤 목적으로 사용하실 건가요?
        </h1>
        <p className="text-[#64748B] text-base tracking-normal">역할에 맞는 최적화된 서비스를 제공합니다</p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const Icon = role.icon
          const isSelected = selected === role.id
          return (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className={`relative text-left rounded-2xl p-6 border-2 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E75B6] ${
                isSelected
                  ? 'border-[#2E75B6] bg-[#EFF6FF]'
                  : 'border-[#E2E8F0] bg-white hover:border-[#2E75B6] hover:bg-[#EFF6FF]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#2E75B6] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </div>
              )}

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all ${
                isSelected ? 'bg-[#DBEAFE]' : 'bg-[#F1F5F9]'
              }`}>
                <Icon className={`w-5 h-5 transition-colors ${isSelected ? 'text-[#2E75B6]' : 'text-[#94A3B8]'}`} />
              </div>

              <p className={`text-lg font-black tracking-normal mb-0.5 ${isSelected ? 'text-[var(--color-brand-dark)]' : 'text-[var(--color-brand-deep)]'}`}>
                {role.label}
              </p>
              <p className={`text-xs font-semibold mb-3 tracking-normal ${isSelected ? 'text-[#2E75B6]' : 'text-[#94A3B8]'}`}>
                {role.subtitle}
              </p>
              <p className="text-sm text-[#64748B] leading-relaxed tracking-normal">{role.desc}</p>
            </button>
          )
        })}
      </div>

      {/* CTA */}
      <div className="w-full max-w-md mt-8 flex flex-col items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!selected || loading}
          className="w-full bg-[var(--color-brand-dark)] text-white py-4 rounded-xl text-lg font-bold tracking-normal transition-all hover:bg-[#2E75B6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 설정 중...</>
          ) : (
            '선택 완료'
          )}
        </button>
        <Link href="/" className="text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors tracking-normal">
          나중에 설정하기
        </Link>
      </div>
    </div>
  )
}
