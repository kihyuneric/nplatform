"use client"

/**
 * components/esign/signature-pad.tsx
 *
 * 캔버스 기반 전자 서명 패드.
 * - 마우스/터치 드로잉
 * - 서명 이미지 → Base64 PNG 내보내기
 * - 서명 초기화
 * - 접근성: role="img", aria-label
 */

import { useRef, useState, useEffect, useCallback } from "react"
import { RotateCcw, PenLine, Check } from "lucide-react"

interface SignaturePadProps {
  /** 서명 완료 콜백 — base64 PNG dataURL */
  onSign?: (dataUrl: string) => void
  /** 초기화 콜백 */
  onClear?: () => void
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
  disabled?: boolean
  label?: string
}

export function SignaturePad({
  onSign,
  onClear,
  width = 480,
  height = 160,
  strokeColor = "#0F172A",
  strokeWidth = 2.2,
  disabled = false,
  label = "여기에 서명하세요",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // ── Canvas setup ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // Retina support
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)
  }, [width, height])

  // ── Pointer helpers ───────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    e.preventDefault()
    setDrawing(true)
    lastPos.current = getPos(e)
  }, [disabled])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getPos(e)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
      setHasSignature(true)
    }
    lastPos.current = pos
  }, [drawing, disabled, strokeColor, strokeWidth])

  const endDraw = useCallback(() => {
    setDrawing(false)
    lastPos.current = null
  }, [])

  // ── Actions ───────────────────────────────────────────────────
  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    setHasSignature(false)
    onClear?.()
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return
    const dataUrl = canvas.toDataURL("image/png")
    onSign?.(dataUrl)
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Canvas area */}
      <div
        style={{
          position: "relative",
          width,
          borderRadius: 10,
          overflow: "hidden",
          border: `1.5px solid ${drawing ? "#051C2C" : "#1E3A5F"}`,
          backgroundColor: "#F8FAFC",
          transition: "border-color 0.2s",
          cursor: disabled ? "not-allowed" : "crosshair",
        }}
      >
        {/* Placeholder text */}
        {!hasSignature && (
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
              color: "#94A3B8", fontSize: 13, fontWeight: 500,
              gap: 6,
            }}
          >
            <PenLine size={14} />
            {label}
          </div>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="전자 서명 입력 영역"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{ display: "block", touchAction: "none" }}
        />
        {/* Signature line */}
        <div
          style={{
            position: "absolute", bottom: 28, left: 24, right: 24,
            height: 1, backgroundColor: "#CBD5E1",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: 10, left: 24,
            fontSize: 9, color: "#94A3B8", pointerEvents: "none",
          }}
        >
          서명자
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasSignature || disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold
            bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors"
        >
          <RotateCcw size={12} /> 초기화
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasSignature || disabled}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[0.75rem] font-bold
            bg-stone-100 text-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors"
        >
          <Check size={12} /> 서명 확인
        </button>
      </div>
    </div>
  )
}
