'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Loader2, CheckCircle, Clock, MapPin, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { BookingCalendar } from './booking-calendar'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number | null
  free_initial: boolean
}

interface BookingDialogProps {
  professionalId: string
  professionalName: string
  specialty: string
  location: string
  services: Service[]
  trigger?: React.ReactNode
}

export function BookingDialog({
  professionalId,
  professionalName,
  specialty,
  location,
  services,
  trigger,
}: BookingDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [bookingRef, setBookingRef] = useState('')

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [content, setContent] = useState('')

  const selectedService = services.find((s) => s.id === serviceId)

  const handleCalendarSelect = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('날짜와 시간을 선택해주세요.')
      return
    }
    if (content.trim().length < 10) {
      toast.error('상담 내용을 10자 이상 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/professional/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professionalId,
          service_id: serviceId || null,
          scheduled_date: selectedDate,
          scheduled_time: selectedTime,
          content,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '예약에 실패했습니다.')
      }

      const data = await res.json()
      setBookingRef(data.data?.booking_reference || data.data?.id || 'CON-UNKNOWN')
      setStep('success')
      toast.success('예약이 완료되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '예약에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => {
      setStep('form')
      setSelectedDate('')
      setSelectedTime('')
      setServiceId('')
      setContent('')
      setBookingRef('')
    }, 200)
  }

  const formatDisplayDate = (date: string) => {
    if (!date) return ''
    const d = new Date(date + 'T00:00:00')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-1.5 w-full">
            <Calendar className="h-4 w-4" />
            예약하기
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#2E75B6]" />
                {professionalName} 전문가 예약
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Professional info summary */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-overlay)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2E75B6] text-white font-semibold">
                  {professionalName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{professionalName}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <Badge variant="secondary" className="text-xs">{specialty}</Badge>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service select */}
              {services.length > 0 && (
                <div className="space-y-2">
                  <Label>서비스 선택</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="서비스를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          <div className="flex items-center gap-2">
                            {svc.name}
                            {svc.free_initial && (
                              <span className="text-xs text-stone-900 font-medium">무료</span>
                            )}
                            <span className="text-xs text-gray-400">
                              {svc.price > 0 ? `${svc.price.toLocaleString()}원` : '협의'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Calendar */}
              <div className="space-y-2">
                <Label>날짜 및 시간 선택 <span className="text-stone-900">*</span></Label>
                <BookingCalendar
                  professionalId={professionalId}
                  onSelect={handleCalendarSelect}
                />
                {selectedDate && selectedTime && (
                  <p className="text-sm text-[#2E75B6] font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDisplayDate(selectedDate)} {selectedTime}
                  </p>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>
                  상담 내용 <span className="text-stone-900">*</span>
                  <span className="text-xs text-gray-400 ml-1">(최소 10자)</span>
                </Label>
                <Textarea
                  placeholder="상담 받고 싶은 내용을 자세히 작성해주세요..."
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right">{content.length}자</p>
              </div>

              {/* Price summary */}
              {selectedService && (
                <div className="p-3 rounded-lg bg-stone-100/10 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">서비스</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[var(--color-text-secondary)]">비용</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {selectedService.free_initial ? '무료 (초기상담)' : `${selectedService.price.toLocaleString()}원`}
                    </span>
                  </div>
                  {selectedService.duration_minutes && (
                    <div className="flex justify-between mt-1">
                      <span className="text-[var(--color-text-secondary)]">소요시간</span>
                      <span className="text-[var(--color-text-primary)]">약 {selectedService.duration_minutes}분</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  취소
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedDate || !selectedTime || content.trim().length < 10}
                  className="gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      예약 중...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      예약 확인
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-stone-100/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-stone-900" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                예약이 완료되었습니다
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                전문가의 확인 후 상담이 진행됩니다.
              </p>
            </div>

            <div className="bg-[var(--color-surface-overlay)] rounded-lg p-4 text-sm space-y-2 text-left max-w-xs mx-auto">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">예약번호</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">{bookingRef}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(bookingRef)
                      toast.success('예약번호가 복사되었습니다.')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">전문가</span>
                <span className="text-[var(--color-text-primary)]">{professionalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">일시</span>
                <span className="text-[var(--color-text-primary)]">
                  {formatDisplayDate(selectedDate)} {selectedTime}
                </span>
              </div>
              {selectedService && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">서비스</span>
                  <span className="text-[var(--color-text-primary)]">{selectedService.name}</span>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                닫기
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
