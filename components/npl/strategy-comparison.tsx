'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Clock, Shield } from 'lucide-react'

interface ReturnData {
  strategy_type: string
  scenario_name: string
  investment_amount: number
  equity_amount: number
  expected_return: number
  net_profit: number
  annualized_irr: number
  moic: number
  cash_yield?: number
  break_even_price: number
  break_even_rate: number
}

interface StrategyComparisonProps {
  nplReturn: ReturnData | null
  directReturn: ReturnData | null
  investmentPeriodMonths: number
  holdingPeriodYears: number
}

function formatBillion(v: number) {
  if (!v) return '-'
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1)}억`
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}만`
  return v.toLocaleString()
}

function formatPercent(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

export function StrategyComparison({ nplReturn, directReturn, investmentPeriodMonths, holdingPeriodYears }: StrategyComparisonProps) {
  const metrics = [
    {
      label: '투자금액',
      icon: DollarSign,
      npl: nplReturn ? formatBillion(nplReturn.equity_amount) : '-',
      direct: directReturn ? formatBillion(directReturn.investment_amount) : '-',
    },
    {
      label: '예상수익',
      icon: TrendingUp,
      npl: nplReturn ? formatBillion(nplReturn.net_profit) : '-',
      direct: directReturn ? formatBillion(directReturn.net_profit) : '-',
    },
    {
      label: '연환산 IRR',
      icon: ArrowUpRight,
      npl: nplReturn ? formatPercent(nplReturn.annualized_irr) : '-',
      direct: directReturn ? formatPercent(directReturn.annualized_irr) : '-',
      highlight: true,
    },
    {
      label: 'MOIC',
      icon: TrendingUp,
      npl: nplReturn ? `${nplReturn.moic.toFixed(2)}x` : '-',
      direct: directReturn ? `${directReturn.moic.toFixed(2)}x` : '-',
    },
    {
      label: '투자기간',
      icon: Clock,
      npl: `${investmentPeriodMonths}개월`,
      direct: `${holdingPeriodYears}년`,
    },
    {
      label: '손실방어가',
      icon: Shield,
      npl: nplReturn ? formatBillion(nplReturn.break_even_price) : '-',
      direct: directReturn ? formatBillion(directReturn.break_even_price) : '-',
    },
  ]

  const nplIrr = nplReturn?.annualized_irr || 0
  const directIrr = directReturn?.annualized_irr || 0
  const recommendation = nplIrr > directIrr ? 'NPL' : '직접낙찰'

  return (
    <div className="space-y-6">
      {/* Side by Side Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* NPL */}
        <Card className={`border-2 ${recommendation === 'NPL' ? 'border-blue-500' : 'border-[var(--color-border-subtle)]'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">NPL 채권매입</CardTitle>
              {recommendation === 'NPL' && <Badge className="bg-blue-500">추천</Badge>}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">단기 고수익 전략</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-center">
              <p className="text-3xl font-bold text-blue-600">
                {nplReturn ? formatPercent(nplReturn.annualized_irr) : '-'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">연환산 IRR</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">에쿼티</span>
                <span className="font-medium">{nplReturn ? formatBillion(nplReturn.equity_amount) : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">MOIC</span>
                <span className="font-medium">{nplReturn ? `${nplReturn.moic.toFixed(2)}x` : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">투자기간</span>
                <span className="font-medium">{investmentPeriodMonths}개월</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Direct */}
        <Card className={`border-2 ${recommendation === '직접낙찰' ? 'border-green-500' : 'border-[var(--color-border-subtle)]'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">직접 낙찰</CardTitle>
              {recommendation === '직접낙찰' && <Badge className="bg-green-500">추천</Badge>}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">중장기 안정 전략</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {directReturn ? formatPercent(directReturn.annualized_irr) : '-'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">연환산 IRR</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">총취득원가</span>
                <span className="font-medium">{directReturn ? formatBillion(directReturn.investment_amount) : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">MOIC</span>
                <span className="font-medium">{directReturn ? `${directReturn.moic.toFixed(2)}x` : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">보유기간</span>
                <span className="font-medium">{holdingPeriodYears}년</span>
              </div>
              {directReturn?.cash_yield && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">현금수익률</span>
                  <span className="font-medium">{formatPercent(directReturn.cash_yield)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">상세 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium text-[var(--color-text-muted)]">지표</th>
                  <th className="py-2 text-right font-medium text-blue-600">NPL 채권매입</th>
                  <th className="py-2 text-right font-medium text-green-600">직접 낙찰</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i} className={`border-b ${m.highlight ? 'bg-[var(--color-surface-overlay)] font-semibold' : ''}`}>
                    <td className="py-2.5 flex items-center gap-2">
                      <m.icon className="h-4 w-4 text-[var(--color-text-muted)]" />
                      {m.label}
                    </td>
                    <td className="py-2.5 text-right">{m.npl}</td>
                    <td className="py-2.5 text-right">{m.direct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
