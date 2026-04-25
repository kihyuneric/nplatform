'use client'

import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Lightbulb, Clock, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import DS from '@/lib/design-system'

/* ── Step Timeline ── */
export function StepTimeline({ steps, activeStep = 0 }: { steps: { title: string; duration?: string }[]; activeStep?: number }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center min-w-[80px]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.8125rem] font-bold transition-colors
              ${i < activeStep ? 'bg-[var(--color-positive)] text-white' : i === activeStep ? 'bg-[var(--color-brand-dark)] text-white ring-4 ring-blue-500/20' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)]'}`}>
              {i < activeStep ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
            </div>
            <span className={`text-[0.8125rem] mt-1 text-center ${i <= activeStep ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{step.title}</span>
            {step.duration && <span className="text-[0.6875rem] text-[var(--color-text-muted)]">{step.duration}</span>}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-12 mx-1 ${i < activeStep ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-border-subtle)]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Mock UI Screenshot ── */
export function MockScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${DS.card.base} overflow-hidden my-6 border-2`}>
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-subtle)]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-stone-100" />
          <div className="w-3 h-3 rounded-full bg-stone-100" />
          <div className="w-3 h-3 rounded-full bg-stone-100" />
        </div>
        <span className="text-[0.75rem] text-[var(--color-text-muted)] ml-2 font-mono">{title}</span>
      </div>
      <div className="p-4 bg-[var(--color-surface-elevated)]">{children}</div>
    </div>
  )
}

/* ── Scenario Box ── */
export function ScenarioBox({ title, persona, description, steps }: { title: string; persona: string; description: string; steps: string[] }) {
  return (
    <div className="bg-stone-100/10 border border-stone-300/20 rounded-xl p-5 my-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-[var(--color-brand-dark)] text-white flex items-center justify-center text-[0.8125rem] font-bold">{persona[0]}</div>
        <div>
          <h4 className={DS.text.cardSubtitle}>{title}</h4>
          <p className={DS.text.captionLight}>{persona}</p>
        </div>
      </div>
      <p className={`${DS.text.body} mb-3`}>{description}</p>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-[0.8125rem]">
            <span className="w-5 h-5 rounded-full bg-[var(--color-brand-dark)] text-white flex items-center justify-center text-[0.6875rem] flex-shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-[var(--color-text-secondary)]">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── Pro Tip ── */
export function ProTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-stone-100/10 border border-stone-300/20 rounded-lg p-4 my-4">
      <Lightbulb className="w-5 h-5 text-stone-900 flex-shrink-0 mt-0.5" />
      <div className="text-[0.8125rem] text-stone-900">{children}</div>
    </div>
  )
}

/* ── Warning ── */
export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-stone-100/10 border border-stone-300/20 rounded-lg p-4 my-4">
      <AlertTriangle className="w-5 h-5 text-stone-900 flex-shrink-0 mt-0.5" />
      <div className="text-[0.8125rem] text-stone-900">{children}</div>
    </div>
  )
}

/* ── FAQ Accordion ── */
export function GuideFAQ({ items }: { items: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  return (
    <div className={`mt-8 pt-6 ${DS.divider.default}`}>
      <h3 className={`${DS.text.cardTitle} mb-4`}>자주 묻는 질문</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={`${DS.card.flat} overflow-hidden`}>
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-surface-sunken)]">
              <span className={DS.text.bodyMedium}>{item.q}</span>
              {openIdx === i ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
            </button>
            {openIdx === i && <div className={`px-4 pb-3 ${DS.text.body}`}>{item.a}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Guide Header ── */
export function GuideHeader({ title, description, time, difficulty, steps }: {
  title: string; description: string; time: string; difficulty: string; steps?: number
}) {
  return (
    <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link href="/guide" className={`inline-flex items-center gap-1 ${DS.text.caption} hover:text-[var(--color-text-primary)] mb-4 transition-colors`}>
          <ArrowLeft className="w-4 h-4" />가이드 센터로 돌아가기
        </Link>
        <span className={`${DS.text.label} text-[var(--color-brand-mid)] block mb-3`}>서비스 가이드</span>
        <h1 className={DS.text.pageTitle}>{title}</h1>
        <p className={`${DS.text.body} mt-2 max-w-2xl`}>{description}</p>
        <div className="flex flex-wrap gap-6 mt-6">
          <span className={`flex items-center gap-2 ${DS.text.caption}`}><Clock className="w-4 h-4" />소요시간: {time}</span>
          <span className={`flex items-center gap-2 ${DS.text.caption}`}>난이도: <Badge variant="outline">{difficulty}</Badge></span>
          {steps && <span className={`flex items-center gap-2 ${DS.text.caption}`}>총 {steps}단계</span>}
        </div>
      </div>
    </section>
  )
}

/* ── Before/After ── */
export function BeforeAfter({ before, after }: { before: string; after: string }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 my-4">
      <div className="bg-stone-100/10 border border-stone-300/20 rounded-lg p-4">
        <span className={`${DS.text.label} text-stone-900`}>Before</span>
        <p className={`${DS.text.body} mt-1`}>{before}</p>
      </div>
      <div className="bg-stone-100/10 border border-stone-300/20 rounded-lg p-4">
        <span className={`${DS.text.label} text-stone-900`}>After</span>
        <p className={`${DS.text.body} mt-1`}>{after}</p>
      </div>
    </div>
  )
}

/* ── Result Card ── */
export function ExpectedResult({ items }: { items: string[] }) {
  return (
    <div className="bg-stone-100/10 border border-stone-300/20 rounded-lg p-4 my-4">
      <h4 className="text-[0.8125rem] font-bold text-stone-900 mb-2">기대 결과</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-[0.8125rem] text-stone-900">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{item}
          </li>
        ))}
      </ul>
    </div>
  )
}
