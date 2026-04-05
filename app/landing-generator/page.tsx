'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ImageIcon, Eye, ArrowLeft, Loader2 } from 'lucide-react'
import type { GeneratedStory, SectionImages, ColorTheme, GenerationStep } from '@/lib/landing-generator/types'
import { COLOR_THEMES } from '@/lib/landing-generator/types'
import { StepInput } from '@/components/landing-generator/StepInput'
import { StepStory } from '@/components/landing-generator/StepStory'
import { StepPreview } from '@/components/landing-generator/StepPreview'

const STEPS = [
  { id: 'input' as const, label: '주제 입력', icon: Sparkles },
  { id: 'generating' as const, label: 'AI 생성중', icon: Loader2 },
  { id: 'images' as const, label: '이미지 매칭', icon: ImageIcon },
  { id: 'preview' as const, label: '미리보기', icon: Eye },
]

export default function LandingGeneratorPage() {
  const [step, setStep] = useState<GenerationStep>('input')
  const [story, setStory] = useState<GeneratedStory | null>(null)
  const [images, setImages] = useState<SectionImages | null>(null)
  const [colorTheme, setColorTheme] = useState<ColorTheme>('navy')
  const [error, setError] = useState<string>('')
  const isGenerating = useRef(false)

  const doGenerate = async (topic: string, targetAudience: string, tone: string) => {
    if (isGenerating.current) return
    isGenerating.current = true
    setStep('generating')
    setError('')

    try {
      // Step 1: AI 스토리텔링 생성
      const storyRes = await fetch('/api/landing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, targetAudience, tone }),
      })

      if (!storyRes.ok) {
        const err = await storyRes.json()
        throw new Error(err.error || '스토리 생성 실패')
      }

      const { story: generatedStory } = await storyRes.json()
      setStory(generatedStory)

      // Step 2: 이미지 자동 매칭
      setStep('images')
      const imgRes = await fetch('/api/landing/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: generatedStory.meta.imageKeywords }),
      })

      if (!imgRes.ok) throw new Error('이미지 검색 실패')

      const { images: fetchedImages } = await imgRes.json()
      setImages(fetchedImages)

      // Step 3: 미리보기로 이동
      setStep('preview')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(message)
      setStep('input')
    } finally {
      isGenerating.current = false
    }
  }

  const handleGenerate = doGenerate

  const handleReset = () => {
    setStep('input')
    setStory(null)
    setImages(null)
    setError('')
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== 'input' && (
              <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI 랜딩페이지 생성기
            </h1>
          </div>

          {/* Progress Steps */}
          <div className="hidden md:flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = i === currentStepIndex
              const isDone = i < currentStepIndex
              return (
                <div key={s.id} className="flex items-center gap-1">
                  {i > 0 && (
                    <div className={`w-8 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-slate-200'}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : ''}
                      ${isDone ? 'bg-blue-100 text-blue-700' : ''}
                      ${!isActive && !isDone ? 'bg-slate-100 text-slate-400' : ''}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${s.id === 'generating' && step === 'generating' ? 'animate-spin' : ''}`} />
                    <span className="hidden lg:inline">{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">테마:</span>
            <div className="flex gap-1">
              {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setColorTheme(key)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    colorTheme === key ? 'border-slate-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: COLOR_THEMES[key].primary }}
                  title={COLOR_THEMES[key].name}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Input */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StepInput onGenerate={handleGenerate} error={error} />
            </motion.div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <Sparkles className="w-8 h-8 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-2xl font-bold mt-8 text-slate-800">
                AI가 스토리텔링을 만들고 있습니다
              </h2>
              <p className="text-slate-500 mt-2">잠시만 기다려주세요... (약 10~20초)</p>
            </motion.div>
          )}

          {/* Step 3: Image matching (brief) */}
          {step === 'images' && (
            <motion.div
              key="images"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <ImageIcon className="w-16 h-16 text-purple-500 animate-pulse" />
              <h2 className="text-2xl font-bold mt-8 text-slate-800">
                섹션별 이미지를 찾고 있습니다
              </h2>
              <p className="text-slate-500 mt-2">최적의 이미지를 매칭중...</p>
            </motion.div>
          )}

          {/* Step 4: Preview + Story */}
          {(step === 'preview' && story && images) && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">생성 완료!</h2>
                  <p className="text-slate-500">스토리텔링과 랜딩페이지를 확인하세요</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    새로 만들기
                  </button>
                </div>
              </div>

              {/* Tabs: Story / Preview */}
              <StepStory story={story} />
              <div className="mt-8">
                <StepPreview story={story} images={images} colorTheme={colorTheme} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
