"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, Check, PenTool } from "lucide-react"

interface SignaturePadProps {
  width?: number
  height?: number
  onConfirm?: (signatureBase64: string) => void
  onClear?: () => void
  className?: string
}

export default function SignaturePad({
  width = 400,
  height = 200,
  onConfirm,
  onClear,
  className = "",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas resolution for crisp drawing
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Fill background
    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(0, 0, width, height)

    // Stroke style
    ctx.strokeStyle = "#1B3A5C"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [width, height])

  const getCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      if ("touches" in e) {
        const touch = e.touches[0]
        if (!touch) return null
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      }
    },
    []
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (confirmed) return
      e.preventDefault()
      const coords = getCoords(e)
      if (!coords) return
      setIsDrawing(true)
      setIsEmpty(false)
      lastPoint.current = coords

      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(coords.x, coords.y)
      }
    },
    [confirmed, getCoords]
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || confirmed) return
      e.preventDefault()
      const coords = getCoords(e)
      if (!coords) return

      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx || !lastPoint.current) return

      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()

      lastPoint.current = coords
    },
    [isDrawing, confirmed, getCoords]
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPoint.current = null
  }, [])

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(0, 0, width, height)

    // Reset stroke style after clearing
    ctx.strokeStyle = "#1B3A5C"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    setIsEmpty(true)
    setConfirmed(false)
    onClear?.()
  }, [width, height, onClear])

  const handleConfirm = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return

    const base64 = canvas.toDataURL("image/png")
    setConfirmed(true)
    onConfirm?.(base64)
  }, [isEmpty, onConfirm])

  return (
    <div className={`inline-flex flex-col gap-3 ${className}`}>
      {/* Canvas area */}
      <div className="relative rounded-lg border-2 border-[var(--color-border-subtle)] overflow-hidden" style={{ width, height }}>
        <canvas
          ref={canvasRef}
          className={`block ${confirmed ? "cursor-default" : "cursor-crosshair"}`}
          style={{ width, height, touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Placeholder when empty */}
        {isEmpty && !confirmed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <PenTool className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)] font-medium">서명을 해주세요</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">마우스 또는 터치로 서명하세요</p>
          </div>
        )}

        {/* Confirmed overlay */}
        {confirmed && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 rounded-full bg-stone-100/15 px-2 py-0.5 text-[10px] font-medium text-stone-900">
              <Check className="h-3 w-3" />
              서명 완료
            </div>
          </div>
        )}

        {/* Bottom guide line */}
        {!confirmed && (
          <div
            className="absolute left-8 right-8 border-b border-dashed border-[var(--color-border-subtle)]"
            style={{ bottom: "40px" }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="flex-1 gap-1.5"
        >
          <Eraser className="h-3.5 w-3.5" />
          지우기
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={isEmpty || confirmed}
          className="flex-1 gap-1.5 bg-npl-primary hover:bg-npl-primary/90"
        >
          <Check className="h-3.5 w-3.5" />
          {confirmed ? "서명 완료" : "확인"}
        </Button>
      </div>
    </div>
  )
}
