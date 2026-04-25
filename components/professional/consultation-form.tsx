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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageSquare, Calendar, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number | null
  free_initial: boolean
}

interface ConsultationFormProps {
  professionalId: string
  professionalName: string
  services: Service[]
  trigger?: React.ReactNode
}

export function ConsultationForm({
  professionalId,
  professionalName,
  services,
  trigger,
}: ConsultationFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    service_id: '',
    scheduled_date: '',
    scheduled_time: '',
    content: '',
    listing_id: '',
  })

  const selectedService = services.find((s) => s.id === form.service_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.content.trim()) {
      toast.error('상담 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const scheduled_at =
        form.scheduled_date && form.scheduled_time
          ? `${form.scheduled_date}T${form.scheduled_time}:00`
          : null

      const res = await fetch('/api/v1/professional/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: professionalId,
          service_id: form.service_id || null,
          scheduled_at,
          content: form.content,
          listing_id: form.listing_id || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '요청에 실패했습니다.')
      }

      toast.success('상담 요청이 전송되었습니다.')
      setOpen(false)
      setForm({ service_id: '', scheduled_date: '', scheduled_time: '', content: '', listing_id: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '상담 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            상담 요청
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#2E75B6]" />
            {professionalName} 전문가 상담 요청
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Service Select */}
          {services.length > 0 && (
            <div className="space-y-2">
              <Label>서비스 선택</Label>
              <Select
                value={form.service_id}
                onValueChange={(v) => setForm((p) => ({ ...p, service_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="서비스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      <div className="flex items-center gap-2">
                        {svc.name}
                        {svc.free_initial && (
                          <span className="text-xs text-stone-900 font-medium">무료 초기상담</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {svc.price > 0 ? `${svc.price.toLocaleString()}원` : '협의'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedService?.free_initial && (
                <p className="text-xs text-stone-900">이 서비스는 초기 상담이 무료입니다.</p>
              )}
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>희망 날짜</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>희망 시간</Label>
              <Input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>
              상담 내용 <span className="text-stone-900">*</span>
            </Label>
            <Textarea
              placeholder="상담 받고 싶은 내용을 자세히 작성해주세요..."
              rows={4}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            />
          </div>

          {/* Listing ID */}
          <div className="space-y-2">
            <Label>관련 매물 ID (선택)</Label>
            <Input
              placeholder="관련 매물이 있다면 ID를 입력하세요"
              value={form.listing_id}
              onChange={(e) => setForm((p) => ({ ...p, listing_id: e.target.value }))}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  요청 중...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  상담 요청
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
