'use client'

import { motion } from 'framer-motion'
import type { GeneratedStory, SectionImages } from '@/lib/landing-generator/types'

interface LandingRendererProps {
  story: GeneratedStory
  images: SectionImages
  theme: {
    primary: string
    primaryDark: string
    accent: string
    bg: string
    bgAlt: string
    text: string
    textMuted: string
    gradient: string
  }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export function LandingRenderer({ story, images, theme }: LandingRendererProps) {
  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: "'Pretendard', sans-serif" }}>
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden" style={{ minHeight: '500px' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${images.hero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 md:py-32">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight whitespace-pre-line">
              {story.hero.headline}
            </h1>
            <p className="text-lg md:text-xl text-white/80 mt-4 max-w-2xl">
              {story.hero.subheadline}
            </p>
            <button
              className="mt-8 px-8 py-4 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              style={{ backgroundColor: theme.primary }}
            >
              {story.hero.ctaText}
            </button>
          </motion.div>
        </div>
      </section>

      {/* ===== PAIN POINTS ===== */}
      <section className="py-16 md:py-24" style={{ backgroundColor: theme.bgAlt }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            className="text-2xl md:text-3xl font-bold text-center mb-12"
          >
            {story.painPoints.title}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {story.painPoints.items.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md border border-stone-300 hover:shadow-lg transition"
              >
                <span className="text-4xl block mb-3">{item.icon}</span>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p style={{ color: theme.textMuted }} className="text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOLUTION ===== */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold">{story.solution.title}</h2>
            <p style={{ color: theme.textMuted }} className="mt-2 text-lg">
              {story.solution.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {story.solution.features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition"
              >
                <span className="text-3xl shrink-0">{f.icon}</span>
                <div>
                  <h3 className="text-lg font-bold mb-1">{f.title}</h3>
                  <p style={{ color: theme.textMuted }} className="text-sm leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CURRICULUM ===== */}
      <section
        className="py-16 md:py-24 relative overflow-hidden"
        style={{ backgroundColor: theme.bgAlt }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            className="text-2xl md:text-3xl font-bold text-center mb-12"
          >
            {story.curriculum.title}
          </motion.h2>

          <div className="space-y-6">
            {story.curriculum.steps.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 items-start"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg"
                  style={{ backgroundColor: theme.primary }}
                >
                  {step.step}
                </div>
                <div className="bg-white rounded-xl p-5 flex-1 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg">{step.title}</h3>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
                    >
                      {step.duration}
                    </span>
                  </div>
                  <p style={{ color: theme.textMuted }} className="text-sm">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            className="text-2xl md:text-3xl font-bold text-center mb-12"
          >
            {story.testimonials.title}
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {story.testimonials.items.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md border border-slate-100"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.rating)].map((_, j) => (
                    <span key={j} className="text-stone-900 text-lg">★</span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                  &ldquo;{t.content}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {t.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INSTRUCTOR ===== */}
      <section className="py-16 md:py-24" style={{ backgroundColor: theme.bgAlt }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            className="flex flex-col md:flex-row gap-8 items-center"
          >
            <div className="shrink-0">
              <div
                className="w-40 h-40 rounded-2xl bg-cover bg-center shadow-lg"
                style={{ backgroundImage: `url(${images.instructor})` }}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: theme.primary }}>
                강사 소개
              </p>
              <h3 className="text-2xl font-bold">{story.instructor.name}</h3>
              <p className="font-medium" style={{ color: theme.textMuted }}>
                {story.instructor.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                {story.instructor.bio}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {story.instructor.credentials.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${theme.primary}15`,
                      color: theme.primary,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-6">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div
              className="px-8 py-6 text-white text-center"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})` }}
            >
              <h2 className="text-2xl font-bold">{story.pricing.title}</h2>
            </div>
            <div className="p-8 text-center">
              <div className="flex items-baseline justify-center gap-3 mb-4">
                <span className="text-xl text-slate-400 line-through">{story.pricing.originalPrice}</span>
                <span className="text-4xl font-extrabold" style={{ color: theme.primary }}>
                  {story.pricing.salePrice}
                </span>
                <span className="px-2 py-1 bg-stone-100 text-white rounded-lg text-xs font-bold">
                  {story.pricing.discount}
                </span>
              </div>

              <div className="text-left space-y-3 my-6">
                {story.pricing.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: theme.primary }}
                    >
                      ✓
                    </span>
                    <span className="text-sm">{b}</span>
                  </div>
                ))}
              </div>

              <button
                className="w-full py-4 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                style={{ backgroundColor: theme.primary }}
              >
                {story.hero.ctaText}
              </button>

              <p className="text-sm text-stone-900 font-semibold mt-4">{story.pricing.deadline}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-16 md:py-24" style={{ backgroundColor: theme.bgAlt }}>
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            className="text-2xl md:text-3xl font-bold text-center mb-12"
          >
            {story.faq.title}
          </motion.h2>

          <div className="space-y-4">
            {story.faq.items.map((item, i) => (
              <motion.details
                key={i}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl shadow-sm border border-slate-100 group"
              >
                <summary className="px-6 py-4 cursor-pointer font-semibold hover:bg-slate-50 transition list-none flex items-center justify-between">
                  {item.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4">
                  <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                    {item.answer}
                  </p>
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section
        className="py-16 md:py-24 text-center text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${images.background})` }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible">
            <h2 className="text-3xl md:text-4xl font-extrabold">{story.finalCta.headline}</h2>
            <p className="text-lg text-white/80 mt-4">{story.finalCta.subheadline}</p>
            <button className="mt-8 px-10 py-4 bg-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              style={{ color: theme.primary }}
            >
              {story.finalCta.ctaText}
            </button>
            <p className="text-sm text-white/70 mt-4">{story.finalCta.urgencyText}</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm" style={{ color: theme.textMuted, backgroundColor: theme.bgAlt }}>
        <p>&copy; 2026 {story.meta.title}. All rights reserved.</p>
      </footer>
    </div>
  )
}
