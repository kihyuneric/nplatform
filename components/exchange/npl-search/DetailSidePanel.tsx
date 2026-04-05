"use client"

/**
 * components/exchange/npl-search/DetailSidePanel.tsx
 *
 * 행 클릭 시 페이지 이동 없이 오른쪽에 슬라이드인하는 매물 상세 패널.
 * Radix Dialog를 이용해 접근성 지원.
 */

import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import {
  X, ExternalLink, FileSearch, Handshake, Calculator,
  MapPin, Building2, TrendingUp, AlertCircle, Star,
  ChevronRight, Calendar, Banknote,
} from 'lucide-react'

// ── 타입 ──────────────────────────────────────────────────

export interface NplItem {
  id: number
  up_at: string
  status: string
  creditor_institution: string
  is_corporation: string
  type: string
  sido: string
  sigungu: string
  dong: string
  address: string
  total_claim_amount: number
  loan_balance: number
  appraisal_value: number
  min_sale_price: number
  overdue_interest_rate: number
  claim_profitability: number
  area: number
  building_area: number
  area_pyeong: number
  building_area_pyeong: number
  vacancy_status: string
  deposit: number
  monthly_rent: number
  caseno: string
  etc: string
  [key: string]: unknown
}

interface DetailSidePanelProps {
  item: NplItem | null
  open: boolean
  onClose: () => void
  isStarred?: boolean
  onToggleStar?: (id: number) => void
}

// ── 포맷 헬퍼 ────────────────────────────────────────────

function fmtMoney(n: number | null | undefined) {
  if (!n || n === 0) return '—'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}억원`
  return `${n.toLocaleString()}만원`
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toFixed(2)}%`
}

const STATUS_STYLE: Record<string, string> = {
  '진행 중':   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  '협의 중':   'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  '매각 완료': 'bg-gray-500/20 text-gray-400 border border-gray-600/30',
  '준비 중':   'bg-slate-500/20 text-slate-300 border border-slate-500/30',
}

// ── 컴포넌트 ─────────────────────────────────────────────

export function DetailSidePanel({ item, open, onClose, isStarred, onToggleStar }: DetailSidePanelProps) {
  if (!item) return null

  const roiEst = item.appraisal_value > 0
    ? ((item.appraisal_value - item.total_claim_amount) / item.total_claim_amount * 100)
    : null

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        {/* 반투명 오버레이 */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* 슬라이드인 패널 */}
        <Dialog.Content
          className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#070F1C] border-l border-white/10 shadow-2xl overflow-y-auto focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
        >
          {/* 헤더 */}
          <div className="sticky top-0 bg-[#0D1F38] border-b border-white/10 px-5 py-4 z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status] ?? 'bg-gray-700 text-gray-300'}`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-white/40">{item.type}</span>
                </div>
                <p className="text-sm font-semibold text-white line-clamp-2">{item.address || `${item.sido} ${item.sigungu} ${item.dong}`}</p>
                <p className="text-xs text-white/50 mt-0.5">{item.creditor_institution} · {item.is_corporation}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {onToggleStar && (
                  <button onClick={() => onToggleStar(item.id)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Star className={`h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'}`} />
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-xs text-white/50 mb-1">총 채권액</p>
                <p className="text-lg font-bold text-white">{fmtMoney(item.total_claim_amount)}</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-xs text-white/50 mb-1">감정가</p>
                <p className="text-lg font-bold text-white">{fmtMoney(item.appraisal_value)}</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-xs text-white/50 mb-1">최저매각가</p>
                <p className="text-lg font-bold text-emerald-400">{fmtMoney(item.min_sale_price)}</p>
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl p-3">
                <p className="text-xs text-white/50 mb-1">예상 ROI</p>
                <p className={`text-lg font-bold ${roiEst != null && roiEst > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {roiEst != null ? `${roiEst.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>

            {/* 위치 */}
            <div className="bg-white/5 border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">위치</span>
              </div>
              <p className="text-sm text-white/70">{item.address || `${item.sido} ${item.sigungu} ${item.dong}`}</p>
              {item.area > 0 && (
                <div className="flex gap-4 mt-2 text-xs text-white/50">
                  <span>대지 {item.area_pyeong?.toFixed(1) ?? '—'}평 ({item.area?.toFixed(1) ?? '—'}㎡)</span>
                  <span>전용 {item.building_area_pyeong?.toFixed(1) ?? '—'}평 ({item.building_area?.toFixed(1) ?? '—'}㎡)</span>
                </div>
              )}
            </div>

            {/* 채권 정보 */}
            <div className="bg-white/5 border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">채권 정보</span>
              </div>
              <div className="space-y-2">
                <InfoRow label="대출 잔액" value={fmtMoney(item.loan_balance)} />
                <InfoRow label="연체금리" value={fmtPct(item.overdue_interest_rate)} />
                <InfoRow label="채권수익성" value={fmtPct(item.claim_profitability)} />
                {item.caseno && <InfoRow label="사건번호" value={item.caseno} mono />}
              </div>
            </div>

            {/* 임차인 현황 */}
            {(item.deposit > 0 || item.monthly_rent > 0) && (
              <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">임차인 현황</span>
                </div>
                <div className="space-y-2">
                  <InfoRow label="공실 여부" value={item.vacancy_status || '—'} />
                  {item.deposit > 0 && <InfoRow label="보증금" value={fmtMoney(item.deposit)} />}
                  {item.monthly_rent > 0 && <InfoRow label="월세" value={fmtMoney(item.monthly_rent)} />}
                </div>
              </div>
            )}

            {/* 특이사항 */}
            {item.etc && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">특이사항</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{item.etc}</p>
              </div>
            )}

            {/* 등록일 */}
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Calendar className="h-3.5 w-3.5" />
              <span>등록일: {item.up_at}</span>
            </div>

            {/* 액션 버튼 */}
            <div className="space-y-2 pb-6">
              <Link
                href={`/exchange/${item.id}`}
                className="flex items-center justify-between w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  매물 상세 보기
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/analysis/simulator?appraisal=${item.appraisal_value * 10000}&senior=${item.total_claim_amount * 10000}`}
                className="flex items-center justify-between w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium px-4 py-3 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  경매 수익률 분석
                </span>
                <ChevronRight className="h-4 w-4 text-white/40" />
              </Link>
              <Link
                href={`/deals?listing=${item.id}`}
                className="flex items-center justify-between w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium px-4 py-3 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-purple-400" />
                  딜룸 신청
                </span>
                <ChevronRight className="h-4 w-4 text-white/40" />
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── 보조 컴포넌트 ─────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-white/50">{label}</span>
      <span className={`text-sm text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
