'use client'

import { GuideHeader, MockScreen, ProTip, Warning, GuideFAQ, BeforeAfter, ExpectedResult } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { ScanLine, Upload, FileText, CheckCircle2 } from 'lucide-react'
import DS from '@/lib/design-system'

export default function OcrGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader title="OCR 문서 인식 가이드" description="등기부등본, 감정평가서 등을 업로드하면 AI가 자동으로 데이터를 추출합니다." time="7분" difficulty="쉬움" steps={3} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <BeforeAfter before="문서에서 수치와 정보를 직접 타이핑해야 해서 오류가 빈번했습니다" after="문서 사진이나 PDF를 업로드하면 AI가 핵심 데이터를 자동 추출하고 매물 정보에 반영" />

        <MockScreen title="NPLatform - OCR 문서 인식">
          <div className="space-y-3 text-[0.8125rem]">
            <div className="border-2 border-dashed border-[var(--color-border-default)] rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
              <div className={DS.text.bodyBold}>문서를 드래그하거나 클릭하여 업로드</div>
              <div className={`${DS.text.captionLight} mt-1`}>PDF, JPG, PNG (최대 20MB)</div>
            </div>
            <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />
                <span className={DS.text.bodyBold}>등기부등본 인식 완료</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--color-surface-elevated)] rounded p-2"><span className={DS.text.captionLight}>소재지</span><div className={DS.text.bodyBold}>서울 강남구 테헤란로 123</div></div>
                <div className="bg-[var(--color-surface-elevated)] rounded p-2"><span className={DS.text.captionLight}>소유자</span><div className={DS.text.bodyBold}>홍길동</div></div>
                <div className="bg-[var(--color-surface-elevated)] rounded p-2"><span className={DS.text.captionLight}>근저당권</span><div className={DS.text.bodyBold}>35억 원 (KB국민은행)</div></div>
                <div className="bg-[var(--color-surface-elevated)] rounded p-2"><span className={DS.text.captionLight}>전세권</span><div className={DS.text.bodyBold}>없음</div></div>
              </div>
            </div>
          </div>
        </MockScreen>

        <div className={`mt-8 ${DS.card.base} ${DS.card.padding}`}>
          <h3 className={`${DS.text.cardTitle} mb-3`}>지원 문서 유형</h3>
          <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
            {['등기부등본', '감정평가서', '건축물대장', '토지대장', '지적도', '임대차계약서', '법원 경매 내역', '세금 납부 확인서'].map((doc, i) => (
              <div key={i} className="flex items-center gap-2 bg-[var(--color-surface-sunken)] rounded p-2">
                <FileText className="w-4 h-4 text-[var(--color-brand-dark)]" />
                <span className="text-[var(--color-text-secondary)]">{doc}</span>
              </div>
            ))}
          </div>
        </div>

        <ProTip>OCR 결과는 자동으로 매물 등록 양식에 반영됩니다. 수동 입력보다 빠르고 정확합니다.</ProTip>
        <Warning>OCR 인식 결과는 반드시 원본 문서와 대조하여 확인하세요. 스캔 상태에 따라 인식률이 달라질 수 있습니다.</Warning>
        <ExpectedResult items={['문서에서 핵심 데이터 자동 추출', '매물 등록 양식에 자동 반영', '수동 입력 대비 시간 80% 절감', '오류 감소로 정보 정확도 향상']} />
        <GuideFAQ items={[
          { q: 'OCR 인식률은 어느 정도인가요?', a: '선명한 문서의 경우 95% 이상의 인식률을 보입니다. 흐릿하거나 기울어진 문서는 정확도가 낮아질 수 있습니다.' },
          { q: 'OCR에 크레딧이 필요한가요?', a: '문서당 1 크레딧이 소요됩니다. 무료 크레딧으로도 이용 가능합니다.' },
          { q: '여러 문서를 한번에 업로드할 수 있나요?', a: '네, 최대 10개 문서를 동시에 업로드할 수 있습니다.' },
        ]} />
      </div>
    </div>
  )
}
