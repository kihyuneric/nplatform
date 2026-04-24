'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Users, Scale, Handshake, Check, Loader2, ArrowLeft, ArrowRight,
  Landmark, Banknote, PieChart, Briefcase, Zap, Star,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Stage 1: 주 역할 ───────────────────────────────────
// 요금제(pricing)와 완전 동기화: 매각사 / 투자그룹 / 전문가 / 파트너
// 매각사·투자그룹은 서브타입 선택(Stage 2)을 통해 세분화합니다.
type PrimaryRoleId = 'SELLER' | 'INVESTOR_GROUP' | 'PROFESSIONAL' | 'PARTNER'

interface PrimaryRole {
  id: PrimaryRoleId
  label: string
  subtitle: string
  icon: typeof Building2
  desc: string
  needsSubtype: boolean
}

const PRIMARY_ROLES: PrimaryRole[] = [
  {
    id: 'SELLER',
    label: '매각사',
    subtitle: '매물을 올리는 공급자',
    icon: Building2,
    desc: '보유 NPL·부동산 포트폴리오를 플랫폼으로 매각합니다. 첫 6개월 수수료 무료.',
    needsSubtype: true,
  },
  {
    id: 'INVESTOR_GROUP',
    label: '투자그룹',
    subtitle: 'NPL·부동산 매수',
    icon: Users,
    desc: 'NPL 매수·경매 참여·부동산 매입을 집행합니다. 활동량에 따라 일반/전문으로 구분됩니다.',
    needsSubtype: true,
  },
  {
    id: 'PROFESSIONAL',
    label: '전문가',
    subtitle: '법무사 · 세무사 · 중개사',
    icon: Scale,
    desc: '딜룸에서 전문 서비스를 제공하고 수수료를 정산합니다.',
    needsSubtype: false,
  },
  {
    id: 'PARTNER',
    label: '파트너',
    subtitle: '추천 · 레퍼럴',
    icon: Handshake,
    desc: '플랫폼 소개로 추천 수수료를 창출합니다.',
    needsSubtype: false,
  },
]

// ── Stage 2: 서브타입 ──────────────────────────────────
interface SubtypeOption {
  id: string
  label: string
  sample: string
  icon: typeof Landmark
  // 서버 측 UserRole enum 으로 매핑되는 최종값
  backendRole: 'SELLER' | 'INSTITUTION' | 'INVESTOR' | 'BUYER'
  // subtype metadata (추후 /api/v1/roles 가 저장)
  subtype: string
}

const SELLER_SUBTYPES: SubtypeOption[] = [
  {
    id: 'bank',
    label: '금융기관',
    sample: '은행 · 저축은행 · 캐피탈 · 보험사',
    icon: Landmark,
    backendRole: 'SELLER',
    subtype: 'FINANCIAL_INSTITUTION',
  },
  {
    id: 'loan',
    label: '대부업체',
    sample: '등록대부업자 · NPL 매매업자',
    icon: Banknote,
    backendRole: 'SELLER',
    subtype: 'LOAN_COMPANY',
  },
  {
    id: 'am',
    label: '자산운용사',
    sample: 'AMC · 사모펀드 · REITs',
    icon: PieChart,
    backendRole: 'SELLER',
    subtype: 'ASSET_MANAGER',
  },
  {
    id: 'corp',
    label: '일반 법인',
    sample: '건설사 · 시행사 · 일반 기업',
    icon: Briefcase,
    backendRole: 'SELLER',
    subtype: 'GENERAL_CORP',
  },
]

const INVESTOR_SUBTYPES: SubtypeOption[] = [
  {
    id: 'general-corp',
    label: '일반 투자그룹 · 기업',
    sample: '법인 · 투자조합 · 가족법인 (월 1~5건)',
    icon: Zap,
    backendRole: 'INVESTOR',
    subtype: 'GENERAL_CORP',
  },
  {
    id: 'general-indiv',
    label: '일반 투자그룹 · 개인',
    sample: '활성 투자자 (월 1~5건)',
    icon: Zap,
    backendRole: 'BUYER',
    subtype: 'GENERAL_INDIVIDUAL',
  },
  {
    id: 'pro-corp',
    label: '전문 투자그룹 · 기업',
    sample: '자산운용사 · 사모펀드 · 전문법인',
    icon: Star,
    backendRole: 'INSTITUTION',
    subtype: 'PRO_CORP',
  },
  {
    id: 'pro-indiv',
    label: '전문 투자그룹 · 개인',
    sample: '자본시장법 상 전문투자자',
    icon: Star,
    backendRole: 'INSTITUTION',
    subtype: 'PRO_INDIVIDUAL',
  },
]

// 최종 UserRole enum 으로 매핑
const REDIRECT_MAP: Record<string, string> = {
  SELLER: '/seller/dashboard',
  INSTITUTION: '/institution/dashboard',
  INVESTOR: '/',
  BUYER: '/buyer/dashboard',
  PROFESSIONAL: '/professional/my/dashboard',
  PARTNER: '/partner/dashboard',
}

export default function SelectRolePage() {
  const router = useRouter()
  const [stage, setStage] = useState<1 | 2>(1)
  const [primary, setPrimary] = useState<PrimaryRole | null>(null)
  const [selectedSubtype, setSelectedSubtype] = useState<SubtypeOption | null>(null)
  const [loading, setLoading] = useState(false)

  const subtypeOptions: SubtypeOption[] =
    primary?.id === 'SELLER' ? SELLER_SUBTYPES :
    primary?.id === 'INVESTOR_GROUP' ? INVESTOR_SUBTYPES :
    []

  const handlePrimaryPick = (role: PrimaryRole) => {
    setPrimary(role)
    setSelectedSubtype(null)
    if (role.needsSubtype) {
      setStage(2)
    }
  }

  const handleBack = () => {
    setStage(1)
    setSelectedSubtype(null)
  }

  const handleSubmit = async () => {
    if (!primary) return
    // Determine backend role + subtype
    let backendRole: string
    let subtype: string | undefined
    if (primary.needsSubtype) {
      if (!selectedSubtype) return
      backendRole = selectedSubtype.backendRole
      subtype = selectedSubtype.subtype
    } else {
      backendRole = primary.id
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: backendRole, subtype }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error?.message || '오류가 발생했습니다')
        return
      }
      document.cookie = `active_role=${backendRole};path=/;max-age=${60 * 60 * 24 * 30}`
      if (subtype) {
        document.cookie = `role_subtype=${subtype};path=/;max-age=${60 * 60 * 24 * 30}`
      }
      toast.success('역할이 설정되었습니다')
      router.push(REDIRECT_MAP[backendRole] || '/')
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = primary && (!primary.needsSubtype || selectedSubtype !== null)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo — 클릭 시 홈 이동 */}
      <Link
        href="/"
        aria-label="NPLatform 홈으로"
        className="flex items-center gap-2.5 mb-10 hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand-dark)] rounded-lg"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-dark)] flex items-center justify-center shadow-md">
          <span className="text-white font-black text-base">N</span>
        </div>
        <span className="text-2xl font-black text-[var(--color-brand-deep)] tracking-tight">NPLatform</span>
      </Link>

      {/* Stage indicator */}
      <div className="flex items-center gap-2 mb-5 text-xs font-semibold tracking-normal">
        <span className={`px-2.5 py-1 rounded-full ${stage === 1 ? 'bg-[var(--color-brand-dark)] text-white' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
          1. 역할 선택
        </span>
        <span className="text-[#94A3B8]">·</span>
        <span className={`px-2.5 py-1 rounded-full ${stage === 2 ? 'bg-[var(--color-brand-dark)] text-white' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
          2. 세부 유형
        </span>
      </div>

      {/* Heading */}
      <div className="text-center mb-8 max-w-xl">
        <h1 className="text-3xl font-black text-[var(--color-brand-deep)] tracking-normal mb-3">
          {stage === 1 ? '어떤 목적으로 사용하실 건가요?' : '세부 유형을 선택해주세요'}
        </h1>
        <p className="text-[#64748B] text-base tracking-normal">
          {stage === 1
            ? '역할에 맞는 대시보드·요금제·권한이 적용됩니다.'
            : primary?.id === 'SELLER'
              ? '매각사 유형에 따라 인증 절차와 수수료 우대가 달라집니다.'
              : '활동량·자격 요건에 따라 일반/전문 투자그룹으로 구분됩니다.'}
        </p>
      </div>

      {/* Cards */}
      {stage === 1 && (
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRIMARY_ROLES.map((role) => {
            const Icon = role.icon
            const isSelected = primary?.id === role.id
            return (
              <button
                key={role.id}
                onClick={() => handlePrimaryPick(role)}
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
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${isSelected ? 'bg-[#DBEAFE]' : 'bg-[#F1F5F9]'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#2E75B6]' : 'text-[#94A3B8]'}`} />
                </div>
                <p className={`text-lg font-black tracking-normal mb-0.5 ${isSelected ? 'text-[var(--color-brand-dark)]' : 'text-[var(--color-brand-deep)]'}`}>
                  {role.label}
                </p>
                <p className={`text-xs font-semibold mb-3 tracking-normal ${isSelected ? 'text-[#2E75B6]' : 'text-[#94A3B8]'}`}>
                  {role.subtitle}
                </p>
                <p className="text-sm text-[#64748B] leading-relaxed tracking-normal">{role.desc}</p>
                {role.needsSubtype && (
                  <p className="mt-3 text-[11px] font-semibold text-[#2E75B6] tracking-normal inline-flex items-center gap-1">
                    세부 유형 선택 필요 <ArrowRight className="w-3 h-3" />
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {stage === 2 && primary && (
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subtypeOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = selectedSubtype?.id === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedSubtype(opt)}
                className={`relative text-left rounded-2xl p-5 border-2 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E75B6] ${
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isSelected ? 'bg-[#DBEAFE]' : 'bg-[#F1F5F9]'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#2E75B6]' : 'text-[#94A3B8]'}`} />
                </div>
                <p className={`text-base font-black tracking-normal mb-1 ${isSelected ? 'text-[var(--color-brand-dark)]' : 'text-[var(--color-brand-deep)]'}`}>
                  {opt.label}
                </p>
                <p className="text-sm text-[#64748B] leading-relaxed tracking-normal">{opt.sample}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* CTA */}
      <div className="w-full max-w-md mt-8 flex flex-col items-center gap-3">
        {stage === 2 && (
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[var(--color-brand-dark)] tracking-normal"
          >
            <ArrowLeft className="w-4 h-4" /> 역할 다시 선택
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full bg-[var(--color-brand-dark)] text-white py-4 rounded-xl text-lg font-bold tracking-normal transition-all hover:bg-[#2E75B6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> 설정 중...</>
            : '선택 완료'}
        </button>
        <Link href="/" className="text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors tracking-normal">
          나중에 설정하기
        </Link>
      </div>
    </div>
  )
}
