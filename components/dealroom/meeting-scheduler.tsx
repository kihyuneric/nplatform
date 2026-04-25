"use client"

/**
 * MeetingScheduler — 하이브리드 미팅 예약 모달
 *
 * 사용처: /deals/[id] 미팅 탭 "미팅 예약" 버튼.
 *
 * 3가지 모드:
 *   - ONLINE   : Zoom/Meet/Webex 링크
 *   - OFFLINE  : 주소 + 도착 안내
 *   - HYBRID   : 둘 다 (오프라인 대표 장소 + 원격 참석 링크)
 *
 * v6 deal_room_meetings 스키마와 1:1 매핑.
 * 제출 시:
 *   1) deal_room_meetings insert
 *   2) deal_room_meeting_attendees insert (각 참석자)
 *   3) audit_logs MEETING_CREATE 기록 (severity NOTICE)
 *   4) (옵션) 캘린더 ICS 첨부 이메일 발송
 *
 * 디자인: dark theme. SafeModalPortal로 containing-block trap 회피.
 */

import * as React from "react"
import {
  X, CalendarCheck, Video, MapPin, Users, Clock,
  AlertTriangle, Sparkles, Link as LinkIcon,
} from "lucide-react"
import { SafeModalPortal } from "@/components/ui/safe-modal-portal"

export type MeetingMode = "ONLINE" | "OFFLINE" | "HYBRID"

export interface MeetingAttendee {
  userId: string
  name: string
  role?: string
}

export interface MeetingFormValue {
  title: string
  mode: MeetingMode
  startAt: string                  // ISO datetime-local 형식 (yyyy-MM-ddTHH:mm)
  durationMinutes: number
  /** ONLINE | HYBRID 시 사용 */
  joinUrl: string
  /** OFFLINE | HYBRID 시 사용 */
  venue: string
  /** OFFLINE | HYBRID 시 사용 - 도착 안내·주차 정보 */
  arrivalNote: string
  /** 참석자 user id 목록 */
  attendees: MeetingAttendee[]
  agenda: string
}

interface MeetingSchedulerProps {
  open: boolean
  onClose: () => void
  onSubmit: (value: MeetingFormValue) => Promise<void> | void
  /** 선택 가능한 후보 참석자 (양쪽 딜룸 멤버) */
  candidates: MeetingAttendee[]
  /** 진행 중 여부 */
  submitting?: boolean
}

const initialValue = (candidates: MeetingAttendee[]): MeetingFormValue => {
  // 기본 시작: 내일 오후 2시
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(14, 0, 0, 0)
  const yyyyMmDdHhMm = tomorrow.toISOString().slice(0, 16)
  return {
    title: "",
    mode: "ONLINE",
    startAt: yyyyMmDdHhMm,
    durationMinutes: 60,
    joinUrl: "",
    venue: "",
    arrivalNote: "",
    attendees: candidates.slice(0, 2),    // 기본: 자신 + 상대방
    agenda: "",
  }
}

const MODE_META: Record<MeetingMode, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; tone: string }> = {
  ONLINE:  { label: "온라인",   icon: Video,         tone: "blue"    },
  OFFLINE: { label: "오프라인", icon: MapPin,        tone: "amber"   },
  HYBRID:  { label: "하이브리드", icon: CalendarCheck, tone: "emerald" },
}

export function MeetingScheduler({
  open,
  onClose,
  onSubmit,
  candidates,
  submitting = false,
}: MeetingSchedulerProps) {
  const [value, setValue] = React.useState<MeetingFormValue>(() => initialValue(candidates))
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setValue(initialValue(candidates))
      setError(null)
    }
  }, [open, candidates])

  if (!open) return null

  const update = <K extends keyof MeetingFormValue>(k: K, v: MeetingFormValue[K]) =>
    setValue(s => ({ ...s, [k]: v }))

  const toggleAttendee = (a: MeetingAttendee) => {
    setValue(s => {
      const exists = s.attendees.find(x => x.userId === a.userId)
      return {
        ...s,
        attendees: exists
          ? s.attendees.filter(x => x.userId !== a.userId)
          : [...s.attendees, a],
      }
    })
  }

  const needsUrl   = value.mode === "ONLINE" || value.mode === "HYBRID"
  const needsVenue = value.mode === "OFFLINE" || value.mode === "HYBRID"

  const valid =
    value.title.trim().length > 0 &&
    value.startAt.length > 0 &&
    value.durationMinutes > 0 &&
    (!needsUrl || value.joinUrl.trim().length > 0) &&
    (!needsVenue || value.venue.trim().length > 0) &&
    value.attendees.length >= 2

  const handleSubmit = async () => {
    setError(null)
    if (!valid) {
      setError("필수 항목과 참석자 2명 이상을 확인해주세요.")
      return
    }
    if (new Date(value.startAt).getTime() < Date.now()) {
      setError("과거 시각으로는 미팅을 예약할 수 없습니다.")
      return
    }
    try {
      await onSubmit(value)
    } catch (e) {
      setError((e as Error).message ?? "제출 중 오류가 발생했습니다.")
    }
  }

  return (
    <SafeModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-title"
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="w-full max-w-2xl max-h-[92vh] bg-[#080F1A] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0A1628]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-stone-100/[0.12] border border-stone-300/30 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-stone-900" />
              </div>
              <div>
                <h2 id="meeting-title" className="text-base font-bold text-white tracking-normal">미팅 예약</h2>
                <p className="text-[11px] text-white/40 tracking-normal mt-0.5">온라인 · 오프라인 · 하이브리드 모두 지원</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* 모드 선택 */}
            <div>
              <label className="text-[11px] font-bold text-white/60 tracking-normal mb-2 block">미팅 형태 *</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(MODE_META) as MeetingMode[]).map(m => {
                  const meta = MODE_META[m]
                  const Icon = meta.icon
                  const active = value.mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update("mode", m)}
                      className={`px-3 py-3 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${
                        active
                          ? `bg-${meta.tone}-500/[0.12] border-${meta.tone}-500/50`
                          : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.16]"
                      }`}
                      style={
                        active
                          ? meta.tone === "blue"
                            ? { backgroundColor: "rgba(5, 28, 44,0.12)", borderColor: "rgba(5, 28, 44,0.5)" }
                            : meta.tone === "amber"
                              ? { backgroundColor: "rgba(5, 28, 44,0.12)", borderColor: "rgba(5, 28, 44,0.5)" }
                              : { backgroundColor: "rgba(5, 28, 44,0.12)", borderColor: "rgba(5, 28, 44,0.5)" }
                          : undefined
                      }
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{
                          color: active
                            ? meta.tone === "blue" ? "#051C2C" : meta.tone === "amber" ? "#FCD34D" : "#051C2C"
                            : "rgba(255,255,255,0.5)",
                        }}
                      />
                      <span
                        className="text-xs font-bold tracking-normal"
                        style={{
                          color: active
                            ? meta.tone === "blue" ? "#93C5FD" : meta.tone === "amber" ? "#FCD34D" : "#2251FF"
                            : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {meta.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 제목 */}
            <Field label="미팅 제목" required>
              <input
                type="text"
                value={value.title}
                onChange={e => update("title", e.target.value)}
                placeholder="예: 1차 가격 협상 미팅"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-stone-300/50"
              />
            </Field>

            {/* 시각 + 시간 */}
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <Field label="시작 시각" required icon={<Clock className="w-3.5 h-3.5" />}>
                <input
                  type="datetime-local"
                  value={value.startAt}
                  onChange={e => update("startAt", e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white tabular-nums outline-none focus:border-stone-300/50"
                />
              </Field>
              <Field label="진행 시간 (분)" required>
                <select
                  value={value.durationMinutes}
                  onChange={e => update("durationMinutes", Number(e.target.value))}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white tabular-nums outline-none focus:border-stone-300/50"
                >
                  {[30, 45, 60, 90, 120, 180].map(d => (
                    <option key={d} value={d} className="bg-[#080F1A]">{d}분</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* 온라인 링크 (모드에 따라) */}
            {needsUrl && (
              <Field label="원격 참석 링크" required icon={<LinkIcon className="w-3.5 h-3.5" />}>
                <input
                  type="url"
                  value={value.joinUrl}
                  onChange={e => update("joinUrl", e.target.value)}
                  placeholder="https://zoom.us/j/... 또는 https://meet.google.com/..."
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-stone-300/50"
                />
              </Field>
            )}

            {/* 오프라인 장소 (모드에 따라) */}
            {needsVenue && (
              <>
                <Field label="장소" required icon={<MapPin className="w-3.5 h-3.5" />}>
                  <input
                    type="text"
                    value={value.venue}
                    onChange={e => update("venue", e.target.value)}
                    placeholder="예: 서울 강남구 테헤란로 123 NPLatform 본사 5층 회의실 A"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-stone-300/50"
                  />
                </Field>
                <Field label="도착 안내 (선택)">
                  <textarea
                    value={value.arrivalNote}
                    onChange={e => update("arrivalNote", e.target.value)}
                    rows={2}
                    placeholder="예: 1층 안내데스크 등록 후 5층, 주차 2시간 무료"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-stone-300/50 resize-none"
                  />
                </Field>
              </>
            )}

            {/* 참석자 */}
            <Field label={`참석자 (${value.attendees.length}명 선택됨)`} required icon={<Users className="w-3.5 h-3.5" />}>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {candidates.length === 0 && (
                  <p className="text-xs text-white/30 px-3 py-2 tracking-normal">선택 가능한 참석자가 없습니다.</p>
                )}
                {candidates.map(c => {
                  const selected = !!value.attendees.find(a => a.userId === c.userId)
                  return (
                    <label
                      key={c.userId}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                        selected
                          ? "bg-stone-100/[0.08] border-stone-300/30"
                          : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.16]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleAttendee(c)}
                        className="accent-emerald-500"
                      />
                      <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {c.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white tracking-normal truncate">{c.name}</p>
                        {c.role && <p className="text-[10px] text-white/40 tracking-normal">{c.role}</p>}
                      </div>
                    </label>
                  )
                })}
              </div>
            </Field>

            {/* 의제 */}
            <Field label="의제 (선택)">
              <textarea
                value={value.agenda}
                onChange={e => update("agenda", e.target.value)}
                rows={3}
                placeholder="예: 1) 가격 협상 — 매수가 8.5억 / 매도가 9.2억 격차 / 2) 잔금 일정 / 3) 실사 보고서 검토"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-stone-300/50 resize-none"
              />
            </Field>

            {/* 안내 */}
            <div className="bg-stone-100/[0.06] border border-stone-300/20 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-stone-900 shrink-0 mt-0.5" />
              <p className="text-[10px] text-stone-900/80 leading-relaxed tracking-normal">
                모든 참석자에게 캘린더 초대(ICS) + 알림이 자동 발송되며, 미팅 시각 30분 전 리마인더가 전송됩니다.
                미팅 종료 후 회의록 업로드 시 Access Score <strong className="text-stone-900">+30점</strong>이 가산됩니다.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3.5 py-2.5 bg-stone-100/[0.08] border border-stone-300/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
                <p className="text-xs text-stone-900 tracking-normal">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06] bg-[#0A1628]">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white tracking-normal transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="px-5 py-2 bg-stone-100 hover:bg-stone-100 disabled:bg-white/[0.06] disabled:text-white/30 text-white text-xs font-bold rounded-lg tracking-normal transition-colors flex items-center gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              {submitting ? "예약 중..." : "미팅 예약"}
            </button>
          </div>
        </div>
      </div>
    </SafeModalPortal>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string
  required?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-white/60 tracking-normal mb-1.5">
        {icon}
        {label}
        {required && <span className="text-stone-900">*</span>}
      </label>
      {children}
    </div>
  )
}
