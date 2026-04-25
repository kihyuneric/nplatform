'use client'

import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'

interface RiskItem {
  category: string
  description: string
  level: '높음' | '주의' | '양호'
  detail: string
}

interface RiskChecklistProps {
  risks: RiskItem[]
}

const levelConfig = {
  '높음': { icon: AlertTriangle, color: 'text-stone-900', bg: 'bg-stone-100/10', border: 'border-stone-300/20', badge: 'bg-stone-100/15 text-stone-900' },
  '주의': { icon: AlertCircle, color: 'text-stone-900', bg: 'bg-stone-100/10', border: 'border-stone-300/20', badge: 'bg-stone-100/15 text-stone-900' },
  '양호': { icon: CheckCircle2, color: 'text-stone-900', bg: 'bg-stone-100/10', border: 'border-stone-300/20', badge: 'bg-stone-100/15 text-stone-900' },
}

export function RiskChecklist({ risks }: RiskChecklistProps) {
  const highCount = risks.filter(r => r.level === '높음').length
  const warnCount = risks.filter(r => r.level === '주의').length
  const goodCount = risks.filter(r => r.level === '양호').length

  const overallLevel = highCount > 0 ? '높음' : warnCount > 1 ? '주의' : '양호'
  const overallConfig = levelConfig[overallLevel]

  return (
    <div className="space-y-4">
      {/* Overall Risk Score */}
      <div className={`flex items-center gap-3 rounded-lg ${overallConfig.bg} border ${overallConfig.border} p-4`}>
        <overallConfig.icon className={`h-6 w-6 ${overallConfig.color}`} />
        <div>
          <p className={`text-sm font-semibold ${overallConfig.color}`}>
            전체 리스크 등급: {overallLevel}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            높음 {highCount} / 주의 {warnCount} / 양호 {goodCount}
          </p>
        </div>
      </div>

      {/* Individual Risks */}
      <div className="space-y-2">
        {risks.map((risk, i) => {
          const config = levelConfig[risk.level]
          const Icon = config.icon
          return (
            <div key={i} className={`flex items-start gap-3 rounded-lg border ${config.border} p-3`}>
              <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{risk.category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
                    {risk.level}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{risk.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
