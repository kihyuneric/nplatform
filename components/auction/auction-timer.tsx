"use client"

import { useState, useEffect } from "react"
import { memo } from 'react'
import { Clock, AlertTriangle } from "lucide-react"

interface AuctionTimerProps {
  endTime: string
  onEnd?: () => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

function calculateTimeLeft(endTime: string): TimeLeft {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 }
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    totalMs: diff,
  }
}

type TimerColor = "green" | "yellow" | "red"

function getTimerColor(totalMs: number): TimerColor {
  if (totalMs <= 5 * 60 * 1000) return "red"      // < 5분
  if (totalMs <= 60 * 60 * 1000) return "yellow"   // < 1시간
  return "green"
}

const COLOR_CLASSES: Record<TimerColor, { bg: string; text: string; border: string; glow: string }> = {
  green: {
    bg: "bg-[var(--color-positive)]/20",
    text: "text-[var(--color-positive)]",
    border: "border-[var(--color-positive)]/30",
    glow: "",
  },
  yellow: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/40",
    glow: "",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/40",
    glow: "shadow-red-900/40 shadow-lg",
  },
}

function TimeSegment({ value, label, color }: { value: number; label: string; color: TimerColor }) {
  const classes = COLOR_CLASSES[color]
  return (
    <div className="flex flex-col items-center">
      <div className={`
        ${classes.bg} ${classes.border} border rounded-lg
        min-w-[52px] h-[52px] flex items-center justify-center
        font-mono text-xl font-bold ${classes.text}
        transition-colors duration-300
      `}>
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 font-medium">{label}</span>
    </div>
  )
}

export default function AuctionTimer({ endTime, onEnd }: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(endTime))
  const [hasEnded, setHasEnded] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = calculateTimeLeft(endTime)
      setTimeLeft(tl)

      if (tl.totalMs <= 0 && !hasEnded) {
        setHasEnded(true)
        onEnd?.()
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [endTime, hasEnded, onEnd])

  if (hasEnded || timeLeft.totalMs <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface-overlay)] flex items-center justify-center">
          <Clock className="w-7 h-7 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--color-text-secondary)]">경매 종료</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">경매가 종료되었습니다</p>
        </div>
      </div>
    )
  }

  const color = getTimerColor(timeLeft.totalMs)
  const isFinalMinute = timeLeft.totalMs <= 60 * 1000
  const classes = COLOR_CLASSES[color]

  return (
    <div className={`flex flex-col items-center gap-3 ${isFinalMinute ? "animate-pulse" : ""}`}>
      {/* 라벨 */}
      <div className={`flex items-center gap-1.5 text-sm font-medium ${classes.text}`}>
        {color === "red" ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        {color === "red" ? "마감 임박!" : "남은 시간"}
      </div>

      {/* 타이머 세그먼트 */}
      <div className={`flex items-center gap-2 ${classes.glow} rounded-xl p-2`}>
        {timeLeft.days > 0 && (
          <>
            <TimeSegment value={timeLeft.days} label="일" color={color} />
            <span className={`text-xl font-bold ${classes.text} mt-[-16px]`}>:</span>
          </>
        )}
        <TimeSegment value={timeLeft.hours} label="시간" color={color} />
        <span className={`text-xl font-bold ${classes.text} mt-[-16px]`}>:</span>
        <TimeSegment value={timeLeft.minutes} label="분" color={color} />
        <span className={`text-xl font-bold ${classes.text} mt-[-16px]`}>:</span>
        <TimeSegment value={timeLeft.seconds} label="초" color={color} />
      </div>

      {/* 마감 임박 경고 */}
      {color === "red" && (
        <p className="text-xs text-red-400 font-medium animate-pulse">
          경매 종료가 임박했습니다. 서둘러 입찰하세요!
        </p>
      )}
    </div>
  )
}
