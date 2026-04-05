'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Monitor, Smartphone, Tablet, ExternalLink } from 'lucide-react'
import type { GeneratedStory, SectionImages, ColorTheme } from '@/lib/landing-generator/types'
import { COLOR_THEMES } from '@/lib/landing-generator/types'
import { LandingRenderer } from './LandingRenderer'

interface StepPreviewProps {
  story: GeneratedStory
  images: SectionImages
  colorTheme: ColorTheme
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'

const DEVICES: { id: DeviceMode; label: string; icon: React.ElementType; width: string }[] = [
  { id: 'desktop', label: '데스크탑', icon: Monitor, width: '100%' },
  { id: 'tablet', label: '태블릿', icon: Tablet, width: '768px' },
  { id: 'mobile', label: '모바일', icon: Smartphone, width: '375px' },
]

export function StepPreview({ story, images, colorTheme }: StepPreviewProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const [showFullPage, setShowFullPage] = useState(false)
  const theme = COLOR_THEMES[colorTheme]
  const activeDevice = DEVICES.find((d) => d.id === device)!

  if (showFullPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <span className="font-semibold text-sm text-slate-600">전체 화면 미리보기</span>
          <button
            onClick={() => setShowFullPage(false)}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
          >
            닫기
          </button>
        </div>
        <LandingRenderer story={story} images={images} theme={theme} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-200 rounded-lg p-1">
          {DEVICES.map((d) => {
            const Icon = d.icon
            return (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  device === d.id
                    ? 'bg-white text-slate-800 shadow'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setShowFullPage(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
        >
          <ExternalLink className="w-4 h-4" />
          전체 화면
        </button>
      </div>

      {/* Preview Frame */}
      <div className="bg-slate-100 p-4 flex justify-center overflow-hidden" style={{ minHeight: '600px' }}>
        <motion.div
          key={device}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white shadow-2xl rounded-lg overflow-y-auto overflow-x-hidden"
          style={{
            width: activeDevice.width,
            maxWidth: '100%',
            maxHeight: '80vh',
          }}
        >
          <LandingRenderer story={story} images={images} theme={theme} />
        </motion.div>
      </div>
    </div>
  )
}
