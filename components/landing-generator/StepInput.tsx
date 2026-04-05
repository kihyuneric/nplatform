'use client'

import { useState } from 'react'
import { Sparkles, Target, Mic } from 'lucide-react'

interface StepInputProps {
  onGenerate: (topic: string, targetAudience: string, tone: string) => void
  error: string
}

const EXAMPLE_TOPICS = [
  '건물주 기초과정',
  '부동산 경매 입문',
  'NPL 투자 마스터',
  '상가 투자 실전반',
  '토지 투자 완전정복',
  '부동산 세금 절세 전략',
]

const TONES = [
  { value: 'professional', label: '전문적', emoji: '🏢' },
  { value: 'friendly', label: '친근한', emoji: '😊' },
  { value: 'urgent', label: '긴급한', emoji: '🔥' },
  { value: 'storytelling', label: '스토리텔링', emoji: '📖' },
]

export function StepInput({ onGenerate, error }: StepInputProps) {
  const [topic, setTopic] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [tone, setTone] = useState('professional')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    onGenerate(topic.trim(), targetAudience.trim(), tone)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          AI 기반 자동 생성
        </div>
        <h2 className="text-4xl font-bold text-slate-900 mb-3">
          주제만 입력하면<br />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            랜딩페이지가 완성됩니다
          </span>
        </h2>
        <p className="text-lg text-slate-500">
          AI가 스토리텔링, 이미지, 디자인을 한번에 만들어드립니다
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Sparkles className="w-4 h-4 inline mr-1" />
            과정 주제 *
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 건물주 기초과정"
            className="w-full px-4 py-3 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            autoFocus
          />
          {/* Example Topics */}
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLE_TOPICS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setTopic(ex)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                  topic === ex
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Target className="w-4 h-4 inline mr-1" />
            타겟 대상 (선택)
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="예: 30-50대 직장인, 부동산 투자 초보자"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
          />
        </div>

        {/* Tone Selection */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            <Mic className="w-4 h-4 inline mr-1" />
            카피 톤앤매너
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                  tone === t.value
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md shadow-blue-500/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!topic.trim()}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          <Sparkles className="w-5 h-5 inline mr-2" />
          랜딩페이지 생성하기
        </button>
      </form>
    </div>
  )
}
