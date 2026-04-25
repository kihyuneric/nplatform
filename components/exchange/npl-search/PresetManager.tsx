"use client"

/**
 * components/exchange/npl-search/PresetManager.tsx
 *
 * 최대 5개 필터 프리셋 저장·로드 (localStorage).
 */

import { useState, useEffect } from 'react'
import { Bookmark, BookmarkCheck, Trash2, ChevronDown, Plus } from 'lucide-react'

export interface FilterValues {
  sido: string
  sigungu: string
  dong: string
  collateralMain: string
  collateralSub: string
  status: string[]
  debtorType: string[]
  institution: string
  zoning: string
  overdueRateMin: string
  overdueRateMax: string
  totalClaimMin: string
  totalClaimMax: string
  appraisalMin: string
  appraisalMax: string
}

interface Preset {
  id: string
  name: string
  filters: FilterValues
  savedAt: string
}

const STORAGE_KEY = 'npl_search_presets'
const MAX_PRESETS = 5

function loadPresets(): Preset[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Preset[]
  } catch {
    return []
  }
}

function savePresets(presets: Preset[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

interface PresetManagerProps {
  currentFilters: FilterValues
  onLoadPreset: (filters: FilterValues) => void
}

export function PresetManager({ currentFilters, onLoadPreset }: PresetManagerProps) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)

  useEffect(() => {
    setPresets(loadPresets())
  }, [])

  function savePreset() {
    if (!newName.trim()) return
    if (presets.length >= MAX_PRESETS) {
      alert(`최대 ${MAX_PRESETS}개까지 저장할 수 있습니다.`)
      return
    }
    const preset: Preset = {
      id: Date.now().toString(),
      name: newName.trim(),
      filters: { ...currentFilters },
      savedAt: new Date().toISOString(),
    }
    const updated = [...presets, preset]
    setPresets(updated)
    savePresets(updated)
    setNewName('')
    setShowSaveForm(false)
  }

  function deletePreset(id: string) {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    savePresets(updated)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-medium rounded-lg transition-colors"
      >
        {presets.length > 0 ? <BookmarkCheck className="h-3.5 w-3.5 text-stone-900" /> : <Bookmark className="h-3.5 w-3.5" />}
        프리셋 {presets.length > 0 && <span className="bg-stone-100 text-white text-[10px] px-1 rounded">{presets.length}</span>}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-[#0D1F38] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-white/10">
            <p className="text-xs font-semibold text-white/70">저장된 프리셋 ({presets.length}/{MAX_PRESETS})</p>
          </div>

          {/* 프리셋 목록 */}
          <div className="max-h-48 overflow-y-auto">
            {presets.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-4">저장된 프리셋이 없습니다</p>
            ) : (
              presets.map(preset => (
                <div key={preset.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors">
                  <button
                    onClick={() => { onLoadPreset(preset.filters); setOpen(false) }}
                    className="flex-1 text-left text-xs text-white truncate"
                  >
                    {preset.name}
                  </button>
                  <button onClick={() => deletePreset(preset.id)} className="text-white/30 hover:text-stone-900 transition-colors flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 현재 필터 저장 */}
          <div className="p-3 border-t border-white/10">
            {showSaveForm ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setShowSaveForm(false) }}
                  placeholder="프리셋 이름 입력"
                  autoFocus
                  className="flex-1 bg-white/10 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-stone-300"
                />
                <button onClick={savePreset} className="bg-stone-100 hover:bg-stone-100 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                  저장
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveForm(true)}
                disabled={presets.length >= MAX_PRESETS}
                className="flex items-center gap-1.5 text-xs text-stone-900 hover:text-stone-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                현재 필터를 프리셋으로 저장
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
