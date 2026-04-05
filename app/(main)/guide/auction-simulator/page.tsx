'use client'

import { GuideHeader, MockScreen, ProTip, GuideFAQ, BeforeAfter, ExpectedResult } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, Percent } from 'lucide-react'
import DS from '@/lib/design-system'

export default function AuctionSimulatorGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader title="경매 시뮬레이터 가이드" description="매수 가격별 예상 수익률을 계산하세요. 다양한 시나리오를 시뮬레이션할 수 있습니다." time="8분" difficulty="쉬움" steps={3} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <BeforeAfter before="수익률을 엑셀로 직접 계산하고, 다양한 시나리오를 일일이 만들어야 했습니다" after="매수 가격만 입력하면 자동으로 수익률, 비용, 회수 기간을 시뮬레이션합니다" />

        <MockScreen title="NPLatform - 경매 시뮬레이터">
          <div className="space-y-4 text-[0.8125rem]">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={DS.text.captionLight}>감정가</label><div className={`border border-[var(--color-border-default)] rounded px-3 py-2 ${DS.text.bodyBold}`}>4.5억 원</div></div>
              <div><label className={DS.text.captionLight}>채권 원금</label><div className={`border border-[var(--color-border-default)] rounded px-3 py-2 ${DS.text.bodyBold}`}>3.2억 원</div></div>
              <div><label className={DS.text.captionLight}>매수 가격 (조절)</label><div className="border-2 border-[var(--color-brand-dark)] rounded px-3 py-2 font-bold text-[var(--color-brand-dark)]">2.8억 원</div></div>
              <div><label className={DS.text.captionLight}>경매 예상 낙찰가</label><div className={`border border-[var(--color-border-default)] rounded px-3 py-2 ${DS.text.bodyBold}`}>3.6억 원 (80%)</div></div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="text-center">
                <div className={DS.text.captionLight}>예상 수익률</div>
                <div className="text-[2.5rem] font-extrabold text-[var(--color-positive)] tabular-nums leading-none">28.6%</div>
                <div className={`${DS.text.captionLight} mt-1`}>매수 2.8억 → 회수 3.6억 (비용 차감 후)</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>예상 비용</div><div className={DS.text.bodyBold}>2,400만</div></div>
              <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>순수익</div><div className="font-bold text-[var(--color-positive)]">5,600만</div></div>
              <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>회수 기간</div><div className={DS.text.bodyBold}>8개월</div></div>
            </div>
          </div>
        </MockScreen>

        <ProTip>시뮬레이터에서 매수 가격 슬라이더를 조절하면 실시간으로 수익률이 변경됩니다. 최적의 매수 가격을 찾아보세요.</ProTip>
        <ExpectedResult items={['매수 가격별 예상 수익률 즉시 계산', '경매 비용(법원 비용, 세금) 자동 반영', '낙관/중립/비관 3가지 시나리오 비교', '결과를 PDF로 다운로드 가능']} />
        <GuideFAQ items={[
          { q: '시뮬레이션 결과는 얼마나 정확한가요?', a: '과거 경매 데이터와 시장 트렌드를 기반으로 하지만, 실제 결과는 다를 수 있습니다. 참고용으로 활용하세요.' },
          { q: '크레딧이 필요한가요?', a: '경매 시뮬레이터는 무료로 무제한 이용할 수 있습니다.' },
          { q: '시뮬레이션 결과를 저장할 수 있나요?', a: '네, 시뮬레이션 결과를 저장하고 나중에 비교할 수 있습니다. PDF 다운로드도 가능합니다.' },
        ]} />
      </div>
    </div>
  )
}
