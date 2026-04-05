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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">📝 생성된 스토리텔링</h3>
        <p className="text-sm text-slate-500">각 섹션을 클릭하여 내용을 확인하세요</p>
      </div>

      <div className="divide-y divide-slate-100">
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
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-700">{section.title}</span>
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
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <p className="text-lg font-bold text-slate-800 whitespace-pre-line">{data.headline}</p>
        <p className="text-slate-600">{data.subheadline}</p>
        <span className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
          {data.ctaText}
        </span>
      </div>
    )
  }

  if (sectionId === 'painPoints') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-slate-700 mb-3">{data.title}</p>
        {data.items.map((item: { icon: string; title: string; description: string }, i: number) => (
          <div key={i} className="flex gap-3 bg-red-50 rounded-xl p-3">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="font-semibold text-slate-800">{item.title}</p>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'solution') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-slate-700">{data.title}</p>
        <p className="text-sm text-slate-500 mb-3">{data.subtitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.features.map((f: { icon: string; title: string; description: string }, i: number) => (
            <div key={i} className="bg-green-50 rounded-xl p-3">
              <span className="text-xl">{f.icon}</span>
              <p className="font-semibold text-slate-800 mt-1">{f.title}</p>
              <p className="text-sm text-slate-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sectionId === 'curriculum') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-slate-700 mb-3">{data.title}</p>
        {data.steps.map((s: { step: number; title: string; description: string; duration: string }) => (
          <div key={s.step} className="flex gap-3 bg-blue-50 rounded-xl p-3">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              {s.step}
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                {s.title} <span className="text-xs text-blue-500 font-normal">{s.duration}</span>
              </p>
              <p className="text-sm text-slate-600">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'testimonials') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-slate-700 mb-3">{data.title}</p>
        {data.items.map((t: { name: string; role: string; content: string; rating: number }, i: number) => (
          <div key={i} className="bg-yellow-50 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              {[...Array(t.rating)].map((_, j) => (
                <span key={j} className="text-yellow-400 text-sm">★</span>
              ))}
            </div>
            <p className="text-sm text-slate-700 italic">&ldquo;{t.content}&rdquo;</p>
            <p className="text-xs text-slate-500 mt-1">— {t.name} ({t.role})</p>
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'instructor') {
    return (
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-lg font-bold text-slate-800">{data.name}</p>
        <p className="text-sm text-blue-600 font-medium">{data.title}</p>
        <p className="text-sm text-slate-600 mt-2">{data.bio}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {data.credentials.map((c: string, i: number) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
              {c}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (sectionId === 'pricing') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
        <p className="font-semibold text-slate-700">{data.title}</p>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-slate-400 line-through text-lg">{data.originalPrice}</span>
          <span className="text-3xl font-bold text-blue-600">{data.salePrice}</span>
          <span className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">{data.discount}</span>
        </div>
        <ul className="mt-3 space-y-1">
          {data.benefits.map((b: string, i: number) => (
            <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
              <span className="text-green-500">✓</span> {b}
            </li>
          ))}
        </ul>
        <p className="text-sm text-red-600 font-semibold mt-3">{data.deadline}</p>
      </div>
    )
  }

  if (sectionId === 'faq') {
    return (
      <div className="space-y-2">
        <p className="font-semibold text-slate-700 mb-3">{data.title}</p>
        {data.items.map((item: { question: string; answer: string }, i: number) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3">
            <p className="font-semibold text-slate-800 text-sm">Q. {item.question}</p>
            <p className="text-sm text-slate-600 mt-1">A. {item.answer}</p>
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

  return <pre className="text-xs bg-slate-50 p-3 rounded-xl overflow-auto">{JSON.stringify(content, null, 2)}</pre>
}
