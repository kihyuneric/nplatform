"use client"
import { AlertTriangle, Shield, Scale, Info } from "lucide-react"
import { t } from "@/lib/i18n"

interface DisclaimerProps {
  type: 'exchange' | 'analysis' | 'matching' | 'professional' | 'investment' | 'data' | 'ai'
  compact?: boolean
}

const DISCLAIMERS: Record<string, { icon: any; title: string; content: string }> = {
  exchange: {
    icon: Scale,
    title: '거래 면책',
    content: '본 플랫폼은 부실채권 거래 정보를 중개하는 서비스이며, 거래의 당사자가 아닙니다. 모든 거래의 책임은 매수자와 매도자에게 있으며, 플랫폼은 거래의 성사, 실패, 하자에 대해 법적 책임을 지지 않습니다.',
  },
  analysis: {
    icon: AlertTriangle,
    title: 'AI 분석 면책',
    content: 'AI 분석 결과는 알고리즘 기반 참고 자료이며, 투자 권유가 아닙니다. 분석 결과의 정확성을 보증하지 않으며, 이를 근거로 한 투자 손실에 대해 책임지지 않습니다. 투자 결정은 반드시 전문가 자문을 받으시기 바랍니다.',
  },
  matching: {
    icon: Info,
    title: 'AI 매칭 면책',
    content: 'AI 매칭은 알고리즘 기반 추천이며, 매칭 결과에 대한 법적 구속력이 없습니다. 최종 거래 판단은 이용자 본인의 책임입니다.',
  },
  professional: {
    icon: Shield,
    title: '전문가 서비스 면책',
    content: '플랫폼은 전문가와 이용자 간 연결을 제공하며, 전문가의 자문 내용 및 서비스 품질에 대한 책임은 해당 전문가에게 있습니다. 플랫폼은 전문가의 자격, 경력, 자문 내용의 적정성을 보증하지 않습니다.',
  },
  investment: {
    icon: AlertTriangle,
    title: '투자 위험 고지',
    content: '부실채권(NPL) 투자에는 원금 손실의 위험이 있습니다. 과거 수익률이 미래 수익을 보장하지 않으며, 시장 상황에 따라 예상과 다른 결과가 발생할 수 있습니다. 본 플랫폼에서 제공하는 수익률 정보는 시뮬레이션 결과이며 실제와 다를 수 있습니다.',
  },
  data: {
    icon: Info,
    title: '정보 면책',
    content: '게재된 매물 정보, 시세, 통계 등은 참고용이며, 정확성과 최신성을 보증하지 않습니다. 중요한 투자 판단 시에는 반드시 원본 자료를 직접 확인하시기 바랍니다.',
  },
  ai: {
    icon: AlertTriangle,
    title: 'AI 서비스 안내',
    content: '본 서비스의 AI 기능(분석, 매칭, OCR, 챗봇)은 인공지능 알고리즘에 기반하며, 결과의 완전성과 정확성을 보증하지 않습니다. AI 결과는 참고용이며, 최종 판단은 이용자 본인의 책임입니다.',
  },
}

export function Disclaimer({ type, compact = false }: DisclaimerProps) {
  const d = DISCLAIMERS[type]
  if (!d) return null
  const Icon = d.icon

  if (compact) {
    return (
      <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
        ⚠ {d.content}
      </p>
    )
  }

  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{d.title}</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400/80 mt-1 leading-relaxed">{d.content}</p>
        </div>
      </div>
    </div>
  )
}

// Role responsibility component
export function RoleResponsibility() {
  const roles = [
    { role: '플랫폼 (NPLatform)', responsibility: '정보 중개 서비스 제공, 시스템 운영 및 보안. 거래 당사자가 아니며, 거래 결과에 대한 법적 책임 없음.' },
    { role: '매도자', responsibility: '매물 정보의 정확성 보증, 채권의 적법한 보유 확인, 양도 가능성 보증, 하자 없음 표명.' },
    { role: '매수자', responsibility: '투자 판단의 자기 책임, 실사 의무 이행, 대금 지급 의무, 양수 후 채권 관리.' },
    { role: '전문가', responsibility: '제공하는 자문의 전문성과 정확성, 관련 자격 유지, 이해충돌 고지 의무.' },
    { role: '파트너', responsibility: '추천 활동의 진실성, 추천 회원 정보 보호, 관련 법규 준수.' },
  ]

  return (
    <div className="mt-6 rounded-lg border dark:border-gray-800 p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
        <Shield className="h-4 w-4 text-[#1B3A5C]" />
        역할별 책임 구조
      </h3>
      <div className="space-y-2">
        {roles.map(r => (
          <div key={r.role} className="flex gap-3 text-xs">
            <span className="font-medium text-[#1B3A5C] dark:text-blue-400 w-32 shrink-0">{r.role}</span>
            <span className="text-muted-foreground">{r.responsibility}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Export all disclaimer types for full page use
export const ALL_DISCLAIMER_TYPES = ['exchange', 'analysis', 'matching', 'professional', 'investment', 'data', 'ai'] as const
