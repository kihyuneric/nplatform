'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ─── NPL Term Definitions ─────────────────────────────────────────────────

export interface NplTerm {
  id: string
  term: string
  shortDef: string
  longDef?: string
  formula?: string
  example?: string
  relatedTerms?: string[]
  learnMoreUrl?: string
}

export const NPL_TERMS: Record<string, NplTerm> = {
  NPL: {
    id: 'NPL',
    term: 'NPL (부실채권)',
    shortDef: '채무불이행이 발생했거나 발생 가능성이 높은 대출채권',
    longDef:
      'NPL(Non-Performing Loan)은 원금이나 이자를 3개월 이상 연체한 부실채권을 의미합니다. 금융기관은 이를 전문 투자자나 자산관리회사(AMC)에 매각하여 손실을 최소화합니다.',
    example: '은행이 아파트 담보대출 채권 중 연체가 6개월 이상 지속된 채권을 NPL로 분류하고 매각',
    relatedTerms: ['LTV', '담보물', 'AMC', '낙찰가율'],
  },
  LTV: {
    id: 'LTV',
    term: 'LTV (담보인정비율)',
    shortDef: '담보물 감정가 대비 대출금액의 비율',
    longDef:
      'LTV(Loan to Value ratio)는 부동산 담보물의 감정평가액 대비 대출금액 비율입니다. NPL 투자 시 LTV는 실제 회수 가능 금액을 판단하는 핵심 지표입니다.',
    formula: 'LTV = (대출금액 ÷ 담보물 감정가) × 100',
    example: '감정가 3억원 아파트에 2억원 대출 → LTV = 66.7%',
    relatedTerms: ['DTI', 'NPL', '감정가'],
  },
  DTI: {
    id: 'DTI',
    term: 'DTI (총부채상환비율)',
    shortDef: '연소득 대비 연간 원리금 상환 부담 비율',
    longDef:
      'DTI(Debt to Income ratio)는 차주의 연간 총소득 대비 연간 부채 원리금 상환액의 비율입니다. 대출 한도 산정 시 활용되는 규제 지표입니다.',
    formula: 'DTI = (연간 부채 원리금 상환액 ÷ 연 소득) × 100',
    example: '연소득 5000만원, 연간 원리금 상환 2000만원 → DTI = 40%',
    relatedTerms: ['LTV', 'DSR'],
  },
  근저당: {
    id: '근저당',
    term: '근저당권 (根抵當權)',
    shortDef: '채권최고액을 한도로 장래 발생할 채권을 담보하는 권리',
    longDef:
      '근저당은 현재 발생한 채권뿐만 아니라 장래에 발생할 채권까지 일정 한도액(채권최고액) 내에서 담보하는 저당권입니다. 일반 저당권과 달리 계속적 거래에서 활용됩니다.',
    example: '은행이 아파트에 채권최고액 1억2000만원의 근저당 설정 (실제 대출은 1억원)',
    relatedTerms: ['임의경매', '배당', '말소기준권리'],
  },
  배당: {
    id: '배당',
    term: '배당 (配當)',
    shortDef: '경매 낙찰금을 채권자에게 순위에 따라 나누어 주는 절차',
    longDef:
      '경매에서 배당은 낙찰 대금을 각 채권자의 순위(선순위, 후순위)에 따라 분배하는 절차입니다. NPL 투자 수익성 분석에서 배당 순위와 예상 배당액을 파악하는 것이 핵심입니다.',
    example: '낙찰가 2억원 / 선순위 근저당 1.5억원 → 선순위 채권자에게 1.5억원, 나머지 5000만원을 후순위 배분',
    relatedTerms: ['낙찰가율', '배당요구', '근저당', '임의경매'],
  },
  낙찰가율: {
    id: '낙찰가율',
    term: '낙찰가율 (落札價率)',
    shortDef: '감정가 대비 낙찰금액의 비율',
    longDef:
      '낙찰가율은 법원경매에서 감정가 대비 실제 낙찰된 금액의 비율입니다. 지역별·물건별 낙찰가율 분석은 NPL 투자 수익성 예측의 핵심 데이터입니다.',
    formula: '낙찰가율 = (낙찰금액 ÷ 감정가) × 100',
    example: '감정가 5억 아파트가 4.2억에 낙찰 → 낙찰가율 84%',
    relatedTerms: ['NPL', '경매', '감정가', '유찰'],
  },
  AMC: {
    id: 'AMC',
    term: 'AMC (자산관리회사)',
    shortDef: '금융기관의 부실자산을 전문으로 관리·처분하는 회사',
    longDef:
      'AMC(Asset Management Company)는 부실채권 및 부실자산을 매입하여 관리, 처분, 회수를 전문으로 하는 회사입니다. 한국자산관리공사(KAMCO)가 대표적인 공공 AMC입니다.',
    relatedTerms: ['NPL', 'KAMCO', '유동화'],
  },
  유찰: {
    id: '유찰',
    term: '유찰 (流札)',
    shortDef: '경매에서 낙찰자가 없어 다음 회차로 넘어가는 것',
    longDef:
      '유찰은 법원경매 또는 공매에서 최저매각가격 이상의 응찰이 없어 매각이 이루어지지 않는 경우입니다. 유찰 시 최저매각가격은 통상 전회차의 80%로 낮아집니다.',
    example: '1회차 최저가 2억 → 유찰 → 2회차 최저가 1.6억 → 다시 유찰 → 3회차 1.28억',
    relatedTerms: ['낙찰가율', '경매', '최저매각가격'],
  },
}

// ─── Contextual Help Component ────────────────────────────────────────────

interface ContextualHelpProps {
  term: string | NplTerm
  trigger?: 'hover' | 'click'
  placement?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  iconSize?: 'sm' | 'md'
  showLabel?: boolean
}

export function ContextualHelp({
  term,
  trigger = 'click',
  placement = 'bottom',
  className,
  iconSize = 'sm',
  showLabel = false,
}: ContextualHelpProps) {
  const [open, setOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const termData: NplTerm | null = React.useMemo(() => {
    if (typeof term === 'string') {
      return NPL_TERMS[term] ?? null
    }
    return term
  }, [term])

  // Click outside to close
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!termData) return null

  const iconSizeClass = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  const popoverClasses = cn(
    'absolute z-50 w-72 rounded-xl bg-[var(--color-surface-elevated)] shadow-xl border border-border',
    'overflow-hidden',
    placement === 'bottom' && 'top-full mt-2 left-1/2 -translate-x-1/2',
    placement === 'top' && 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    placement === 'left' && 'right-full mr-2 top-1/2 -translate-y-1/2',
    placement === 'right' && 'left-full ml-2 top-1/2 -translate-y-1/2',
  )

  return (
    <div
      ref={ref}
      className={cn('relative inline-flex items-center gap-1', className)}
    >
      {/* Trigger */}
      <button
        className={cn(
          'inline-flex items-center gap-1 text-muted-foreground',
          'hover:text-[#2E75B6] transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:ring-offset-1 rounded',
        )}
        onClick={trigger === 'click' ? () => setOpen((v) => !v) : undefined}
        onMouseEnter={trigger === 'hover' ? () => setOpen(true) : undefined}
        onMouseLeave={trigger === 'hover' ? () => setOpen(false) : undefined}
        aria-label={`${termData.term} 설명 보기`}
        aria-expanded={open}
      >
        <Info className={iconSizeClass} />
        {showLabel && (
          <span className="text-xs underline decoration-dotted">{termData.term}</span>
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={popoverClasses}
            initial={{ opacity: 0, scale: 0.95, y: placement === 'bottom' ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: placement === 'bottom' ? -4 : 4 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B3A5C] to-[#2E75B6] px-4 py-3 flex items-center justify-between">
              <h4 className="text-white font-semibold text-sm">{termData.term}</h4>
              <button
                onClick={() => { setOpen(false); setExpanded(false) }}
                className="text-white/60 hover:text-white transition-colors"
                aria-label="닫기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Short definition */}
            <div className="px-4 py-3">
              <p className="text-sm text-foreground leading-relaxed">
                {termData.shortDef}
              </p>

              {/* Expandable long def */}
              {termData.longDef && (
                <>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                          {termData.longDef}
                        </p>

                        {termData.formula && (
                          <div className="mt-2 bg-muted rounded-lg p-2">
                            <p className="text-xs font-mono text-stone-900">
                              {termData.formula}
                            </p>
                          </div>
                        )}

                        {termData.example && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground">예시</p>
                            <p className="text-xs text-foreground mt-0.5">{termData.example}</p>
                          </div>
                        )}

                        {termData.relatedTerms && termData.relatedTerms.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {termData.relatedTerms.map((t) => (
                              <span
                                key={t}
                                className="text-xs px-2 py-0.5 rounded-full bg-stone-100/10 text-stone-900 font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-2 flex items-center gap-1 text-xs text-[#2E75B6] hover:text-[#1B3A5C] font-medium transition-colors"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        간략히 보기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        자세히 보기
                      </>
                    )}
                  </button>
                </>
              )}

              {termData.learnMoreUrl && (
                <a
                  href={termData.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  더 알아보기
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Term Label (inline) ──────────────────────────────────────────────────

export function TermLabel({
  termKey,
  children,
  className,
}: {
  termKey: string
  children?: React.ReactNode
  className?: string
}) {
  const termData = NPL_TERMS[termKey]
  const label = children ?? termData?.term ?? termKey

  if (!termData) {
    return <span className={className}>{label}</span>
  }

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <span className="border-b border-dashed border-current/50 cursor-help">{label}</span>
      <ContextualHelp term={termData} iconSize="sm" />
    </span>
  )
}
