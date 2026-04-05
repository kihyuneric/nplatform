"use client"
import { useState, useRef, useEffect, type ReactNode } from "react"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  height?: "auto" | "half" | "full"
}

export function BottomSheet({ open, onClose, title, children, height = "auto" }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`
    }
  }

  const handleTouchEnd = () => {
    const diff = currentY.current - startY.current
    if (diff > 100) {
      onClose()
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
    startY.current = 0
    currentY.current = 0
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 rounded-t-2xl shadow-xl md:hidden transition-transform duration-300 ${
          height === 'full' ? 'max-h-[90vh]' : height === 'half' ? 'max-h-[50vh]' : 'max-h-[80vh]'
        } overflow-hidden`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>
        {title && (
          <div className="px-4 pb-2 border-b dark:border-gray-800">
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
        )}
        <div className="overflow-y-auto p-4" style={{ maxHeight: height === 'full' ? '80vh' : height === 'half' ? '42vh' : '70vh' }}>
          {children}
        </div>
      </div>
    </>
  )
}
