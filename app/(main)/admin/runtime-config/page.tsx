'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sliders, RefreshCw, CheckCircle2, AlertCircle,
  Loader2, ChevronDown, Save,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────

interface RuntimeConfig {
  key: string
  value: string
  description: string
  updatedAt: string
  updatedBy?: string
}

type ProviderKey = RuntimeConfig['key']

// ─── Provider options per key ────────────────────────────────

const PROVIDER_OPTIONS: Record<string, string[]> = {
  ai_provider:        ['claude', 'openai', 'gemini'],
  embedding_provider: ['voyage', 'openai'],
  payment_provider:   ['nicepay', 'toss', 'stripe', 'none'],
  ocr_mode:           ['claude', 'tesseract', 'none'],
  registry_mode:      ['iros', 'mock'],
  market_data_mode:   ['molit', 'kamco', 'mock'],
}

const KEY_LABELS: Record<string, string> = {
  ai_provider:        'AI 공급자',
  embedding_provider: '임베딩 공급자',
  payment_provider:   '결제 게이트웨이',
  ocr_mode:           'OCR 모드',
  registry_mode:      '등기 API 모드',
  market_data_mode:   '시세 데이터 모드',
}

const VALUE_BADGES: Record<string, { label: string; color: string }> = {
  claude:    { label: 'Claude',    color: 'bg-violet-900/50 text-violet-300 border-violet-700/50' },
  openai:    { label: 'OpenAI',    color: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' },
  gemini:    { label: 'Gemini',    color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  voyage:    { label: 'Voyage',    color: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50' },
  nicepay:   { label: 'NicePay',   color: 'bg-orange-900/50 text-orange-300 border-orange-700/50' },
  toss:      { label: 'Toss',      color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  stripe:    { label: 'Stripe',    color: 'bg-purple-900/50 text-purple-300 border-purple-700/50' },
  none:      { label: 'OFF',       color: 'bg-gray-800 text-gray-400 border-gray-700' },
  tesseract: { label: 'Tesseract', color: 'bg-amber-900/50 text-amber-300 border-amber-700/50' },
  iros:      { label: 'IROS',      color: 'bg-rose-900/50 text-rose-300 border-rose-700/50' },
  mock:      { label: 'Mock',      color: 'bg-gray-800 text-yellow-400 border-yellow-700/50' },
  molit:     { label: 'MOLIT',     color: 'bg-sky-900/50 text-sky-300 border-sky-700/50' },
  kamco:     { label: 'KAMCO',     color: 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50' },
}

// ─── Config Card ─────────────────────────────────────────────

function ConfigCard({
  config,
  onUpdate,
}: {
  config: RuntimeConfig
  onUpdate: (key: ProviderKey, value: string) => Promise<void>
}) {
  const [selected, setSelected] = useState(config.value)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const isDirty = selected !== config.value
  const options = PROVIDER_OPTIONS[config.key] ?? [config.value]
  const badge = VALUE_BADGES[config.value]
  const selectedBadge = VALUE_BADGES[selected]

  async function handleSave() {
    setSaving(true)
    await onUpdate(config.key, selected)
    setSaving(false)
  }

  return (
    <div className={`rounded-xl border transition-colors ${isDirty ? 'border-amber-600/60 bg-amber-950/20' : 'border-gray-800 bg-gray-900/60'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-white">{KEY_LABELS[config.key] ?? config.key}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{config.key}</p>
          </div>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4">{config.description}</p>

        {/* Dropdown */}
        <div className="relative mb-3">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between gap-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              {selectedBadge && (
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${selectedBadge.color}`}>
                  {selectedBadge.label}
                </span>
              )}
              <span className="font-mono">{selected}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl z-10"
              >
                {options.map((opt) => {
                  const b = VALUE_BADGES[opt]
                  return (
                    <button
                      key={opt}
                      onClick={() => { setSelected(opt); setOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-700 transition-colors ${selected === opt ? 'bg-gray-700' : ''}`}
                    >
                      {b && (
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${b.color}`}>
                          {b.label}
                        </span>
                      )}
                      <span className="font-mono text-white">{opt}</span>
                      {selected === opt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save button */}
        <AnimatePresence>
          {isDirty && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? '저장 중...' : `${selected} 로 변경 저장`}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 pb-3 flex items-center justify-between text-xs text-gray-600 border-t border-gray-800/50 pt-2.5">
        <span>마지막 변경: {new Date(config.updatedAt).toLocaleString('ko-KR')}</span>
        {config.updatedBy && <span>by {config.updatedBy}</span>}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default function RuntimeConfigPage() {
  const [configs, setConfigs] = useState<RuntimeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/runtime-config')
      const json = await res.json()
      if (json.success) {
        setConfigs(json.data)
        setLastRefresh(new Date())
      }
    } catch {
      toast.error('설정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleUpdate(key: ProviderKey, value: string) {
    try {
      const res = await fetch('/api/v1/admin/runtime-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? '변경 실패')

      toast.success(json.message ?? `${key} → ${value} 변경됨`)
      setConfigs((prev) =>
        prev.map((c) =>
          c.key === key
            ? { ...c, value, updatedAt: new Date().toISOString(), updatedBy: 'admin' }
            : c
        )
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '변경 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">런타임 공급자 설정</h1>
            <p className="text-sm text-gray-500">서버 재시작 없이 공급자를 전환합니다 · 5분 내 전체 반영</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-600">
              {lastRefresh.toLocaleTimeString('ko-KR')} 기준
            </span>
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 mb-6">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300 leading-relaxed">
          변경사항은 <strong>즉시 DB에 저장</strong>되며, 각 서버 인스턴스의 5분 캐시 만료 후 자동으로 적용됩니다.
          AI 공급자 변경 시 해당 API 키가 설정되어 있는지 <a href="/admin/integrations" className="underline">연동 관리</a>에서 확인하세요.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config) => (
            <ConfigCard key={config.key} config={config} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
