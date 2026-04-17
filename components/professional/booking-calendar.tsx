'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BookingCalendarProps {
  professionalId: string
  onSelect: (date: string, time: string) => void
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
]

const DAY_NAMES = ['월', '화', '수', '목', '금']

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7)

  const dates: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

function generateAvailability(professionalId: string, dates: Date[]): Record<string, Set<string>> {
  const availability: Record<string, Set<string>> = {}
  const seed = professionalId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const date of dates) {
    if (date < today) continue
    const dateStr = date.toISOString().split('T')[0]
    const available = new Set<string>()
    for (let i = 0; i < TIME_SLOTS.length; i++) {
      const hash = (seed + date.getDate() * 31 + i * 17) % 100
      if (hash < 60) {
        available.add(TIME_SLOTS[i])
      }
    }
    availability[dateStr] = available
  }
  return availability
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function BookingCalendar({ professionalId, onSelect }: BookingCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const availability = useMemo(
    () => generateAvailability(professionalId, weekDates),
    [professionalId, weekDates]
  )

  const weekLabel = useMemo(() => {
    const start = weekDates[0]
    const end = weekDates[4]
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일`
  }, [weekDates])

  const handleSlotClick = (date: string, time: string) => {
    setSelectedSlot({ date, time })
    onSelect(date, time)
  }

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((p) => Math.max(0, p - 1))}
          disabled={weekOffset === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">{weekLabel}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((p) => Math.min(p + 1, 3))}
          disabled={weekOffset >= 3}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          {/* Day headers */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {weekDates.map((date, i) => (
              <div key={i} className="text-center">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">{DAY_NAMES[i]}</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{formatDate(date)}</p>
              </div>
            ))}
          </div>

          {/* Time slot grid */}
          <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
            {TIME_SLOTS.map((time) => (
              <div key={time} className="grid grid-cols-5 gap-1">
                {weekDates.map((date) => {
                  const dateStr = formatDateISO(date)
                  const isAvailable = availability[dateStr]?.has(time) ?? false
                  const isSelected = selectedSlot?.date === dateStr && selectedSlot?.time === time
                  const isPast = date < new Date(new Date().toDateString())

                  return (
                    <button
                      key={`${dateStr}-${time}`}
                      disabled={!isAvailable || isPast}
                      onClick={() => handleSlotClick(dateStr, time)}
                      className={cn(
                        'text-xs py-1.5 rounded-md transition-colors font-medium',
                        isSelected
                          ? 'bg-[#2E75B6] text-white ring-2 ring-[#2E75B6]/30'
                          : isAvailable && !isPast
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] line-through cursor-not-allowed'
                      )}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] pt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/20" />
          예약 가능
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)]" />
          예약 불가
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#2E75B6]" />
          선택됨
        </span>
      </div>
    </div>
  )
}
