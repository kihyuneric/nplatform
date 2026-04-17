'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react'
import DS, { formatKRW, formatDate } from '@/lib/design-system'

const SPECIALTY_OPTIONS = [
  { value: 'JUDICIAL_SCRIVENER', label: '법무사' },
  { value: 'TAX_ACCOUNTANT', label: '세무사' },
  { value: 'BROKER', label: '공인중개사' },
  { value: 'APPRAISER', label: '감정평가사' },
  { value: 'LAWYER', label: '변호사' },
]

const SERVICES = ['일반 상담', '서류 검토', '권리분석', '종합 컨설팅', '명도소송 대행', '경매 대행']

const STEPS = ['기본 정보', '자격 인증', '서비스 설정', '프로필 작성']

export default function ExpertRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', specialty: '', location: '',
    licenseNumber: '', licenseFile: '',
    selectedServices: [] as string[],
    priceMin: '', priceMax: '',
    bio: '', photo: '',
  })

  function set(key: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleService(svc: string) {
    set('selectedServices', form.selectedServices.includes(svc)
      ? form.selectedServices.filter((s) => s !== svc)
      : [...form.selectedServices, svc]
    )
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await fetch('/api/v1/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      router.push('/services/experts')
    } catch {
      setLoading(false)
    }
  }

  const canNext = [
    form.name.trim() && form.specialty && form.location.trim(),
    form.licenseNumber.trim(),
    form.selectedServices.length > 0 && form.priceMin,
    form.bio.trim(),
  ][step]

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className={DS.header.wrapper}>
          <Link href="/services/experts" className={`${DS.text.link} inline-flex items-center gap-1.5 mb-4`}>
            <ArrowLeft className="w-4 h-4" /> 전문가 목록
          </Link>
          <h1 className={DS.header.title}>전문가 등록</h1>
          <p className={DS.header.subtitle}>관리자 승인 후 마켓플레이스에 프로필이 공개됩니다.</p>
        </div>
      </div>

      <div className={`${DS.page.container} py-8`} style={{ maxWidth: '42rem' }}>
        {/* Progress Step Bar */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.6875rem] font-bold transition-colors ${
                  i < step ? 'bg-[var(--color-positive)] text-white' : i === step ? 'bg-[var(--color-brand-mid)] text-white' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[0.6875rem] mt-1 font-medium ${i === step ? DS.text.primary : DS.text.muted}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 mb-4 transition-colors ${i < step ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-border-subtle)]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className={`${DS.card.base} ${DS.card.padding} space-y-5`}>
          {/* Step 0: 기본 정보 */}
          {step === 0 && (
            <>
              <p className={DS.header.eyebrow}>기본 정보</p>

              <div>
                <label className={DS.input.label}>
                  이름 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text" placeholder="홍길동"
                  value={form.name} onChange={(e) => set('name', e.target.value)}
                  className={DS.input.base}
                />
              </div>

              <div>
                <label className={DS.input.label}>
                  전문 분야 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <select
                  value={form.specialty} onChange={(e) => set('specialty', e.target.value)}
                  className={DS.input.base}
                >
                  <option value="">선택해주세요</option>
                  {SPECIALTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={DS.input.label}>
                  소재 지역 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text" placeholder="서울 강남구"
                  value={form.location} onChange={(e) => set('location', e.target.value)}
                  className={DS.input.base}
                />
              </div>
            </>
          )}

          {/* Step 1: 자격 인증 */}
          {step === 1 && (
            <>
              <p className={DS.header.eyebrow}>자격 인증</p>

              <div>
                <label className={DS.input.label}>
                  자격증 번호 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text" placeholder="예: 제2014-서울-0421호"
                  value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)}
                  className={DS.input.base}
                />
              </div>

              <div>
                <label className={DS.input.label}>등록증 파일 업로드</label>
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-default)] rounded-xl p-8 cursor-pointer hover:border-[var(--color-brand-mid)] hover:bg-blue-500/10 transition-colors`}>
                  <Upload className="w-6 h-6 text-[var(--color-text-muted)]" />
                  <span className={DS.text.body}>
                    {form.licenseFile || 'JPG, PNG, PDF 파일을 드래그하거나 클릭하여 업로드'}
                  </span>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                    onChange={(e) => set('licenseFile', e.target.files?.[0]?.name || '')} />
                </label>
              </div>
            </>
          )}

          {/* Step 2: 서비스 설정 */}
          {step === 2 && (
            <>
              <p className={DS.header.eyebrow}>서비스 설정</p>

              <div>
                <label className={`${DS.input.label} mb-2`}>
                  제공 서비스 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map((svc) => {
                    const active = form.selectedServices.includes(svc)
                    return (
                      <button key={svc} type="button" onClick={() => toggleService(svc)}
                        className={active ? `${DS.filter.chip} ${DS.filter.chipActive}` : `${DS.filter.chip} ${DS.filter.chipInactive}`}>
                        {svc}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={DS.input.label}>
                    최소 상담료 (원) <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <input
                    type="number" min="0" step="10000" placeholder="50000"
                    value={form.priceMin} onChange={(e) => set('priceMin', e.target.value)}
                    className={DS.input.base}
                  />
                </div>
                <div>
                  <label className={DS.input.label}>최대 상담료 (원)</label>
                  <input
                    type="number" min="0" step="10000" placeholder="500000"
                    value={form.priceMax} onChange={(e) => set('priceMax', e.target.value)}
                    className={DS.input.base}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 3: 프로필 작성 */}
          {step === 3 && (
            <>
              <p className={DS.header.eyebrow}>프로필 작성</p>

              <div>
                <label className={DS.input.label}>
                  소개글 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <textarea
                  rows={5} placeholder="전문 분야, 경력, 강점 등을 자유롭게 소개해주세요."
                  value={form.bio} onChange={(e) => set('bio', e.target.value)}
                  className={`${DS.input.base} resize-none`}
                />
              </div>

              <div>
                <label className={DS.input.label}>프로필 사진</label>
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-default)] rounded-xl p-6 cursor-pointer hover:border-[var(--color-brand-mid)] hover:bg-blue-500/10 transition-colors`}>
                  <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
                  <span className={DS.text.body}>
                    {form.photo || 'JPG, PNG 형식, 최대 5MB'}
                  </span>
                  <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
                    onChange={(e) => set('photo', e.target.files?.[0]?.name || '')} />
                </label>
              </div>
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.push('/services/experts')}
            className={DS.button.secondary}
          >
            {step === 0 ? '취소' : '이전'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className={`${DS.button.primary} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              다음 단계
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext || loading}
              className={`${DS.button.primary} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {loading ? '처리 중...' : '등록 완료'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
