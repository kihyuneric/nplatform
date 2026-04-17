'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  BookOpen,
  MessageSquare,
  User,
  CreditCard,
  HelpCircle,
  Megaphone,
} from 'lucide-react'
import type { GeneratedStory } from '@/lib/landing-generator/types'

interface StepStoryProps {
  story: GeneratedStory
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  hero: Megaphone,
  painPoints: Target,
  solution: Lightbulb,
  curriculum: BookOpen,
  testimonials: MessageSquare,
  instructor: User,
  pricing: CreditCard,
  faq: HelpCircle,
  finalCta: Megaphone,
}

export function StepStory({ story }: StepStoryProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['hero'])

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const sections = [
    { id: 'hero', title: '히어로 섹션', content: story.hero },
    { id: 'painPoints', title: '고민/문제점', content: story.painPoints },
    { id: 'solution', title: '해결책/특장점', content: story.solution },
    { id: 'curriculum', title: '커리큘럼', content: story.curriculum },
    { id: 'testimonials', title: '수강 후기', content: story.testimonials },
    { id: 'instructor', title: '강사 소개', content: story.instructor },
    { id: 'pricing', title: '가격/혜택', content: story.pricing },
    { id: 'faq', title: '자주 묻는 질문', content: story.faq },
    { id: 'finalCta', title: '최종 CTA', content: story.finalCta },
  ]

  return (
    <div className="bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">📝 생성된 스토리텔링</h3>
        <p className="text-sm text-[var(--color-text-muted)]">각 섹션을 클릭하여 내용을 확인하세요</p>
      </div>

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {sections.map((section, index) => {
          const Icon = SECTION_ICONS[section.id] || Target
          const isExpanded = expandedSections.includes(section.id)

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--color-surface-overlay)] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/15 text-blue-400 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-[var(--color-text-secondary)]">{section.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-6 pb-4"
                >
                  <SectionContent sectionId={section.id} content={section.content} />
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function SectionContent({ sectionId, content }: { sectionId: string; content: unknown }) {
  const data = content as any

  if (sectionId === 'hero') {
    return (
      <div className="bg-[var(--color-surface-base)] rounded-xl p-4 space-y-2">
        <p className="text-lg font-bold text-[var(--color-text-primary)] whitespace-pre-line">{data.headline}</p>
        <p className="text-[var(--color-text-secondary)]">{data.subheadline}</p>
        <span className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
          {data.ctaText}
        </span>
      </div>
    )
  }

  if (sectionId === 'painPoints') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-[var(--color-text-secondary)] mb-3">{data.title}</p>
        {data.items.map((item: { icon: string; title: string; description: string }, i: number) => (
          <div key={i} className="flex gap-3 bg-red-500/10 rounded-xl p-3">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{item.title}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'solution') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-[var(--color-text-secondary)]">{data.title}</p>
        <p className="text-sm text-[var(--color-text-muted)] mb-3">{data.subtitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.features.map((f: { icon: string; title: string; description: string }, i: number) => (
            <div key={i} className="bg-green-500/10 rounded-xl p-3">
              <span className="text-xl">{f.icon}</span>
              <p className="font-semibold text-[var(--color-text-primary)] mt-1">{f.title}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sectionId === 'curriculum') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-[var(--color-text-secondary)] mb-3">{data.title}</p>
        {data.steps.map((s: { step: number; title: string; description: string; duration: string }) => (
          <div key={s.step} className="flex gap-3 bg-blue-500/10 rounded-xl p-3">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              {s.step}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {s.title} <span className="text-xs text-blue-400 font-normal">{s.duration}</span>
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'testimonials') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-[var(--color-text-secondary)] mb-3">{data.title}</p>
        {data.items.map((t: { name: string; role: string; content: string; rating: number }, i: number) => (
          <div key={i} className="bg-yellow-500/10 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              {[...Array(t.rating)].map((_, j) => (
                <span key={j} className="text-yellow-400 text-sm">★</span>
              ))}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] italic">&ldquo;{t.content}&rdquo;</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">— {t.name} ({t.role})</p>
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'instructor') {
    return (
      <div className="bg-[var(--color-surface-base)] rounded-xl p-4">
        <p className="text-lg font-bold text-[var(--color-text-primary)]">{data.name}</p>
        <p className="text-sm text-blue-400 font-medium">{data.title}</p>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">{data.bio}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {data.credentials.map((c: string, i: number) => (
            <span key={i} className="px-2 py-1 bg-blue-500/15 text-blue-400 rounded-lg text-xs">
              {c}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (sectionId === 'pricing') {
    return (
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4">
        <p className="font-semibold text-[var(--color-text-secondary)]">{data.title}</p>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-[var(--color-text-muted)] line-through text-lg">{data.originalPrice}</span>
          <span className="text-3xl font-bold text-blue-400">{data.salePrice}</span>
          <span className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">{data.discount}</span>
        </div>
        <ul className="mt-3 space-y-1">
          {data.benefits.map((b: string, i: number) => (
            <li key={i} className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
              <span className="text-green-500">✓</span> {b}
            </li>
          ))}
        </ul>
        <p className="text-sm text-red-400 font-semibold mt-3">{data.deadline}</p>
      </div>
    )
  }

  if (sectionId === 'faq') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-[var(--color-text-secondary)] mb-3">{data.title}</p>
        {data.items.map((item: { question: string; answer: string }, i: number) => (
          <div key={i} className="bg-[var(--color-surface-base)] rounded-xl p-3">
            <p className="font-semibold text-[var(--color-text-primary)] text-sm">Q. {item.question}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">A. {item.answer}</p>
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'finalCta') {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white">
        <p className="text-lg font-bold">{data.headline}</p>
        <p className="text-sm opacity-90 mt-1">{data.subheadline}</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-bold">
            {data.ctaText}
          </span>
          <span className="text-sm opacity-80">{data.urgencyText}</span>
        </div>
      </div>
    )
  }

  return <pre className="text-xs bg-[var(--color-surface-base)] p-3 rounded-xl overflow-auto">{JSON.stringify(content, null, 2)}</pre>
}
