'use client'

/**
 * SignaturePad — 캔버스 기반 전자서명 입력 컴포넌트.
 *
 * 사용:
 *   <SignaturePad onChange={(dataUrl) => setSignatureData(dataUrl)} />
 *   - dataUrl: 'data:image/png;base64,...' (서버로 전송할 base64)
 *   - 빈 캔버스 → null 반환
 *
 * 정책:
 *   · 마우스 + 터치(태블릿/스마트폰) 모두 지원
 *   · "지우기" 버튼으로 다시 그릴 수 있음
 *   · McKinsey 스타일 — paper + electric blue accent + sharp
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface SignaturePadProps {
  /** dataUrl 변경 콜백. 빈 서명 → null */
  onChange?: (dataUrl: string | null) => void
  /** 비활성 (제출 중 등) */
  disabled?: boolean
  /** 너비 (px). 기본 500 */
  width?: number
  /** 높이 (px). 기본 180 */
  height?: number
  /** 라벨 (예: "여기에 서명해 주세요") */
  label?: string
}

const ELECTRIC = '#2251FF'
const INK = '#0A1628'
const BORDER = 'rgba(5, 28, 44, 0.20)'
const PAPER_TINT = '#F8FAFC'
const TEXT_MUTED = 'rgba(5, 28, 44, 0.45)'

export function SignaturePad({
  onChange,
  disabled = false,
  width = 500,
  height = 180,
  label = '여기에 서명해 주세요',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasStrokes, setHasStrokes] = useState(false)

  // ── Canvas 좌표 보정 (DPI · 화면 스케일 대응) ─────────────
  const getPointerPos = useCallback(
    (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    [],
  )

  const startDrawing = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      e.preventDefault()
      isDrawingRef.current = true
      lastPointRef.current = getPointerPos(e)
      // 캔버스가 pointer capture 를 가져 마우스/터치가 캔버스 밖으로 나가도 grace
      canvasRef.current?.setPointerCapture(e.pointerId)
    },
    [disabled, getPointerPos],
  )

  const draw = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current || disabled) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const pt = getPointerPos(e)
      const last = lastPointRef.current ?? pt
      ctx.strokeStyle = INK
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(pt.x, pt.y)
      ctx.stroke()
      lastPointRef.current = pt
      if (!hasStrokes) setHasStrokes(true)
    },
    [disabled, getPointerPos, hasStrokes],
  )

  const stopDrawing = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      lastPointRef.current = null
      try { canvasRef.current?.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      // 변경 emit
      if (canvasRef.current && onChange) {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        onChange(dataUrl)
      }
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
    onChange?.(null)
  }, [onChange])

  // 초기화 — 고DPI 대응
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [width, height])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: ELECTRIC,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
        }}
      >
        전자서명
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          background: PAPER_TINT,
          border: `1px solid ${BORDER}`,
          borderTop: `2px solid ${ELECTRIC}`,
          touchAction: 'none', // 모바일 터치가 페이지 스크롤로 흘러가지 않도록
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          style={{
            display: 'block',
            cursor: disabled ? 'not-allowed' : 'crosshair',
            opacity: disabled ? 0.5 : 1,
            background: '#FFFFFF',
            width: '100%',
            height,
          }}
        />
        {!hasStrokes && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              fontSize: 13,
              color: TEXT_MUTED,
              fontWeight: 600,
              fontStyle: 'italic',
            }}
          >
            {label}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>
          마우스 또는 터치로 서명. 서명 완료 후 제출 시 PDF 에 자동 삽입됩니다.
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !hasStrokes}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            background: '#FFFFFF',
            color: INK,
            border: `1px solid ${BORDER}`,
            cursor: disabled || !hasStrokes ? 'not-allowed' : 'pointer',
            opacity: disabled || !hasStrokes ? 0.4 : 1,
          }}
        >
          <RefreshCw size={10} /> 다시 서명
        </button>
      </div>
    </div>
  )
}
