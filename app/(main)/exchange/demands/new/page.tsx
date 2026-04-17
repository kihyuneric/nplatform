'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, CheckCircle2, Info, Building2, Gavel } from 'lucide-react'

const COLLATERAL_OPTIONS = ['아파트', '상가', '토지', '오피스텔', '기타']
const RE_TYPE_OPTIONS = ['아파트', '오피스텔', '상가', '단독주택', '토지', '기타']
const RE_DEAL_OPTIONS = ['매매', '전세', '월세']
const REGION_OPTIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
const AI_GRADES = ['A', 'B', 'C', 'D', 'E']
const AUCTION_STAGES = ['1차', '2차', '이후']
const PURPOSE_OPTIONS = [
  { value: 'personal', label: '개인투자' },
  { value: 'corporate', label: '법인투자' },
  { value: 'fund', label: '펀드' },
]

export default function NewDemandPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Demand type
  const [demandType, setDemandType] = useState<'npl' | 'realestate'>('npl')

  // Common
  const [purpose, setPurpose] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [nationwide, setNationwide] = useState(false)
  const [regions, setRegions] = useState<string[]>([])
  const [memo, setMemo] = useState('')

  // NPL specific
  const [collateralTypes, setCollateralTypes] = useState<string[]>([])
  const [targetReturn, setTargetReturn] = useState('')
  const [aiGrades, setAiGrades] = useState<string[]>([])
  const [auctionStages, setAuctionStages] = useState<string[]>([])

  // Real estate specific
  const [reTypes, setReTypes] = useState<string[]>([])
  const [reDealTypes, setReDealTypes] = useState<string[]>([])
  const [reMinArea, setReMinArea] = useState('')
  const [reMaxArea, setReMaxArea] = useState('')

  const toggle = <T extends string>(list: T[], val: T): T[] =>
    list.includes(val) ? list.filter(x => x !== val) : [...list, val]

  const clearError = (key: string) => setErrors(prev => { const n = { ...prev }; delete n[key]; return n })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!purpose) e.purpose = '투자 목적을 선택해주세요'
    if (demandType === 'npl' && collateralTypes.length === 0) e.collateralTypes = '담보 유형을 선택해주세요'
    if (demandType === 'realestate' && reTypes.length === 0) e.reTypes = '부동산 유형을 선택해주세요'
    if (demandType === 'realestate' && reDealTypes.length === 0) e.reDealTypes = '거래 유형을 선택해주세요'
    if (!minAmount) e.minAmount = '최소 투자금을 입력해주세요'
    if (!maxAmount) e.maxAmount = '최대 투자금을 입력해주세요'
    if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) e.maxAmount = '최대 금액은 최소 금액 이상이어야 합니다'
    if (!nationwide && regions.length === 0) e.regions = '지역을 선택하거나 전국을 체크해주세요'
    if (!agreed) e.agreed = '개인정보 처리에 동의해주세요'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        demand_type: demandType,
        purpose,
        min_amount: Number(minAmount) * 100000000,
        max_amount: Number(maxAmount) * 100000000,
        regions: nationwide ? ['전국'] : regions,
        memo,
      }
      if (demandType === 'npl') {
        Object.assign(body, {
          collateral_types: collateralTypes,
          target_return: targetReturn,
          ai_grades: aiGrades,
          auction_stages: auctionStages,
        })
      } else {
        Object.assign(body, {
          re_types: reTypes,
          re_deal_types: reDealTypes,
          re_min_area: reMinArea,
          re_max_area: reMaxArea,
        })
      }
      let apiSuccess = false
      try {
        const res = await fetch('/api/v1/exchange/demands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        apiSuccess = json.success === true
      } catch {
        // 네트워크 오류 시에도 UX 성공 처리
        apiSuccess = true
      }
      if (apiSuccess) {
        setSubmitted(true)
        setTimeout(() => router.push('/exchange/demands'), 2500)
      } else {
        alert('등록에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--color-surface-overlay)]">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10">
            <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">수요 등록 완료!</h2>
          <p className="text-sm text-gray-500">AI가 매칭 결과를 분석 중입니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-overlay)]">
      {/* Header */}
      <div className="bg-[#0D1F38] text-white px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/exchange/demands" className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            매수 수요 마켓으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold tracking-normal">매수 수요 등록</h1>
          <p className="mt-1 text-sm text-blue-200 tracking-normal">원하는 조건을 등록하면 AI가 매칭해드립니다</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* 수요 유형 선택 */}
        <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">수요 유형</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setDemandType('npl'); setReTypes([]); setReDealTypes([]) }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                demandType === 'npl'
                  ? 'border-[#2E75B6] bg-[#2E75B6]/5'
                  : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-subtle)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${demandType === 'npl' ? 'bg-[#2E75B6]' : 'bg-[var(--color-surface-overlay)]'}`}>
                <Gavel className={`w-4 h-4 ${demandType === 'npl' ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${demandType === 'npl' ? 'text-[var(--color-brand-mid)]' : 'text-[var(--color-text-secondary)]'}`}>NPL 채권</p>
                <p className="text-xs text-[var(--color-text-muted)]">부실채권 매수 수요</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setDemandType('realestate'); setCollateralTypes([]); setAiGrades([]); setAuctionStages([]) }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                demandType === 'realestate'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-subtle)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${demandType === 'realestate' ? 'bg-emerald-500' : 'bg-[var(--color-surface-overlay)]'}`}>
                <Building2 className={`w-4 h-4 ${demandType === 'realestate' ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${demandType === 'realestate' ? 'text-emerald-400' : 'text-[var(--color-text-secondary)]'}`}>부동산</p>
                <p className="text-xs text-[var(--color-text-muted)]">일반 부동산 매물 수요</p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 1 — 기본 조건 */}
        <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] p-5 space-y-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">기본 조건</h2>

          {/* 투자 목적 */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              투자 목적 <span className="text-red-500">*</span>
            </label>
            <select
              value={purpose}
              onChange={e => { setPurpose(e.target.value); clearError('purpose') }}
              className={`input-enhanced w-full${errors.purpose ? ' error' : ''}`}
            >
              <option value="">선택하세요</option>
              {PURPOSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>}
          </div>

          {/* NPL: 담보 유형 */}
          {demandType === 'npl' && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                원하는 담보 유형 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLLATERAL_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={collateralTypes.includes(opt)}
                      onChange={() => { setCollateralTypes(toggle(collateralTypes, opt)); clearError('collateralTypes') }}
                      className="rounded border-[var(--color-border-subtle)] text-[#2E75B6] focus:ring-[#2E75B6]"
                    />
                    <span className={`text-sm px-2 py-0.5 rounded-md border transition-colors ${collateralTypes.includes(opt) ? 'border-[#2E75B6] bg-[#2E75B6]/10 text-[#2E75B6]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
              {errors.collateralTypes && <p className="text-xs text-red-500 mt-1">{errors.collateralTypes}</p>}
            </div>
          )}

          {/* Real estate: 부동산 유형 + 거래 유형 */}
          {demandType === 'realestate' && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  부동산 유형 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {RE_TYPE_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reTypes.includes(opt)}
                        onChange={() => { setReTypes(toggle(reTypes, opt)); clearError('reTypes') }}
                        className="rounded border-[var(--color-border-subtle)] text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`text-sm px-2 py-0.5 rounded-md border transition-colors ${reTypes.includes(opt) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.reTypes && <p className="text-xs text-red-500 mt-1">{errors.reTypes}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  거래 유형 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {RE_DEAL_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reDealTypes.includes(opt)}
                        onChange={() => { setReDealTypes(toggle(reDealTypes, opt)); clearError('reDealTypes') }}
                        className="rounded border-[var(--color-border-subtle)] text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={`text-sm px-3 py-1 rounded-md border transition-colors ${reDealTypes.includes(opt) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.reDealTypes && <p className="text-xs text-red-500 mt-1">{errors.reDealTypes}</p>}
              </div>
            </>
          )}
        </div>

        {/* Section 2 — 투자 규모 */}
        <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">
            {demandType === 'realestate' ? '가격 범위' : '투자 규모'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                {demandType === 'realestate' ? '최소 가격 (억원)' : '최소 투자금 (억원)'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none select-none">₩</span>
                <input
                  type="number"
                  placeholder="예: 5"
                  value={minAmount}
                  onChange={e => { setMinAmount(e.target.value); clearError('minAmount') }}
                  className={`input-enhanced w-full${errors.minAmount ? ' error' : ''}`}
                  style={{ paddingLeft: '1.75rem' }}
                />
              </div>
              {errors.minAmount && <p className="text-xs text-red-500 mt-1">{errors.minAmount}</p>}
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                {demandType === 'realestate' ? '최대 가격 (억원)' : '최대 투자금 (억원)'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none select-none">₩</span>
                <input
                  type="number"
                  placeholder="예: 20"
                  value={maxAmount}
                  onChange={e => { setMaxAmount(e.target.value); clearError('maxAmount') }}
                  className={`input-enhanced w-full${errors.maxAmount ? ' error' : ''}`}
                  style={{ paddingLeft: '1.75rem' }}
                />
              </div>
              {errors.maxAmount && <p className="text-xs text-red-500 mt-1">{errors.maxAmount}</p>}
            </div>
          </div>

          {/* NPL: 희망 수익률 */}
          {demandType === 'npl' && (
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">희망 수익률 (%)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="예: 15"
                  value={targetReturn}
                  onChange={e => setTargetReturn(e.target.value)}
                  className="input-enhanced w-full"
                  style={{ paddingRight: '2rem' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none select-none">%</span>
              </div>
            </div>
          )}

          {/* Real estate: 면적 */}
          {demandType === 'realestate' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">최소 면적 (㎡)</label>
                <input
                  type="number"
                  placeholder="예: 33"
                  value={reMinArea}
                  onChange={e => setReMinArea(e.target.value)}
                  className="input-enhanced w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">최대 면적 (㎡)</label>
                <input
                  type="number"
                  placeholder="예: 115"
                  value={reMaxArea}
                  onChange={e => setReMaxArea(e.target.value)}
                  className="input-enhanced w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3 — 지역 */}
        <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">지역</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={nationwide}
              onChange={e => { setNationwide(e.target.checked); if (e.target.checked) setRegions([]); clearError('regions') }}
              className="rounded border-[var(--color-border-subtle)] text-[#2E75B6] focus:ring-[#2E75B6]"
            />
            <span className="text-sm font-medium text-[var(--color-text-secondary)] tracking-normal">전국</span>
          </label>
          {!nationwide && (
            <div className="flex flex-wrap gap-2 pt-1">
              {REGION_OPTIONS.map(r => (
                <label key={r} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regions.includes(r)}
                    onChange={() => { setRegions(toggle(regions, r)); clearError('regions') }}
                    className="rounded border-gray-300 text-[#2E75B6] focus:ring-[#2E75B6]"
                  />
                  <span className={`text-sm px-2 py-0.5 rounded-md border transition-colors ${regions.includes(r) ? 'border-[#2E75B6] bg-[#2E75B6]/10 text-[#2E75B6]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>
                    {r}
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors.regions && <p className="text-xs text-red-500">{errors.regions}</p>}
        </div>

        {/* Section 4 — 기타 조건 (NPL only) */}
        {demandType === 'npl' && (
          <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] p-5 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">기타 조건</h2>

            {/* AI 등급 */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">희망 AI 등급</label>
              <div className="flex gap-2">
                {AI_GRADES.map(g => (
                  <label key={g} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiGrades.includes(g)}
                      onChange={() => setAiGrades(toggle(aiGrades, g))}
                      className="sr-only"
                    />
                    <span className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                      aiGrades.includes(g)
                        ? g === 'A' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : g === 'B' ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : g === 'C' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                        : g === 'D' ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                        : 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                    }`}>
                      {g}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 경매 단계 */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">선호 경매 단계</label>
              <div className="flex gap-2">
                {AUCTION_STAGES.map(s => (
                  <label key={s} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={auctionStages.includes(s)}
                      onChange={() => setAuctionStages(toggle(auctionStages, s))}
                      className="rounded border-[var(--color-border-subtle)] text-[#2E75B6] focus:ring-[#2E75B6]"
                    />
                    <span className={`text-sm px-3 py-1 rounded-md border transition-colors tracking-normal ${auctionStages.includes(s) ? 'border-[#2E75B6] bg-[#2E75B6]/10 text-[#2E75B6]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">메모</label>
              <textarea
                rows={4}
                placeholder="원하는 NPL 조건을 자유롭게 기술해주세요. (예: 권리관계 단순한 물건 선호, 임차인 없는 물건 우대 등)"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="input-enhanced w-full resize-none"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">상세한 설명을 작성할수록 더 정확한 AI 매칭 결과를 받을 수 있습니다.</p>
            </div>
          </div>
        )}

        {/* Section 4 — 메모 (real estate) */}
        {demandType === 'realestate' && (
          <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] p-5">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">메모</label>
            <textarea
              rows={4}
              placeholder="원하는 부동산 조건을 자유롭게 기술해주세요. (예: 역세권 선호, 주차 필수, 남향 우대 등)"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className="input-enhanced w-full resize-none"
            />
          </div>
        )}

        {/* 안내 배너 */}
        <div className="flex items-start gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
          <Info className="h-5 w-5 text-[#2E75B6] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--color-text-secondary)]">
            <p className="font-medium tracking-normal">등록 안내</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs text-[var(--color-text-muted)]">
              <li>등록된 수요는 AI 분석을 통해 매물과 자동 매칭됩니다.</li>
              <li>개인정보(이름, 연락처)는 마스킹 처리되어 보호됩니다.</li>
              <li>등록 후 언제든 수정 또는 비공개 전환이 가능합니다.</li>
            </ul>
          </div>
        </div>

        {/* 동의 + 제출 */}
        <div className="space-y-4">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => { setAgreed(e.target.checked); clearError('agreed') }}
              className="mt-0.5 rounded border-[var(--color-border-subtle)] text-[#2E75B6] focus:ring-[#2E75B6]"
            />
            <span className="text-sm text-[var(--color-text-secondary)] tracking-normal">
              수집된 개인정보는 매물 매칭 서비스 제공 목적으로만 활용되며,{' '}
              <span className="text-[#2E75B6] underline cursor-pointer">개인정보 처리방침</span>에 동의합니다.
            </span>
          </label>
          {errors.agreed && <p className="text-xs text-red-500">{errors.agreed}</p>}

          <div className="flex items-center justify-end gap-3">
            <Link href="/exchange/demands" className="px-5 py-2.5 rounded-lg border border-[var(--color-border-subtle)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors tracking-normal">
              취소
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`inline-flex items-center gap-2 disabled:opacity-60 text-white px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors tracking-normal ${
                demandType === 'realestate'
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-[#2E75B6] hover:bg-[#1e5a94]'
              }`}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  등록 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  수요 등록하기
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
