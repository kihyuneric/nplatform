'use client'

import { GuideHeader, MockScreen, ProTip, GuideFAQ, BeforeAfter, ExpectedResult } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { Map, MapPin, Layers, ZoomIn, Filter } from 'lucide-react'
import DS from '@/lib/design-system'

export default function MapSearchGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader title="지도 기반 매물 탐색" description="지도에서 직접 매물을 찾고, 지역별 매물 밀집도를 확인하세요." time="8분" difficulty="쉬움" steps={3} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <BeforeAfter before="주소만으로는 매물의 실제 위치와 주변 환경을 파악하기 어려웠습니다" after="지도에서 직접 매물 위치를 확인하고, 클러스터로 지역별 매물 분포를 한눈에 파악" />

        <MockScreen title="NPLatform - 지도 기반 매물 탐색">
          <div className="bg-[var(--color-surface-sunken)] rounded-lg p-8 relative">
            <div className={`text-center ${DS.text.body} mb-4`}>지도 영역</div>
            <div className="absolute top-4 left-4 flex flex-col gap-1">
              <div className="w-8 h-8 bg-[var(--color-surface-elevated)] rounded shadow-[var(--shadow-sm)] flex items-center justify-center"><ZoomIn className="w-4 h-4" /></div>
              <div className="w-8 h-8 bg-[var(--color-surface-elevated)] rounded shadow-[var(--shadow-sm)] flex items-center justify-center"><Layers className="w-4 h-4" /></div>
            </div>
            <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[var(--color-brand-dark)] text-white flex items-center justify-center text-[0.75rem] font-bold">12</div>
                <span className={`${DS.text.captionLight} mt-1`}>강남구</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[var(--color-brand-mid)] text-white flex items-center justify-center text-[0.75rem] font-bold">8</div>
                <span className={`${DS.text.captionLight} mt-1`}>서초구</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[var(--color-positive)] text-white flex items-center justify-center text-[0.75rem] font-bold">5</div>
                <span className={`${DS.text.captionLight} mt-1`}>송파구</span>
              </div>
            </div>
          </div>
        </MockScreen>

        <div className="space-y-6 mt-8">
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <h3 className={`${DS.text.cardTitle} mb-3`}>지도 기능</h3>
            <div className="space-y-2 text-[0.8125rem]">
              {[
                { icon: MapPin, label: '매물 마커', desc: '클릭하면 매물 요약 정보 팝업' },
                { icon: Layers, label: '클러스터 뷰', desc: '줌 아웃 시 지역별 매물 수 표시' },
                { icon: Filter, label: '지도 필터', desc: '담보유형, 금액 범위로 필터링' },
                { icon: Map, label: '위성/일반', desc: '지도 스타일 전환 가능' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] last:border-0 pb-2 last:pb-0">
                  <item.icon className="w-5 h-5 text-[var(--color-brand-dark)]" />
                  <div><div className={DS.text.bodyBold}>{item.label}</div><div className={DS.text.captionLight}>{item.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ProTip>지도에서 영역을 드래그하면 해당 범위의 매물만 필터링됩니다. 특정 지역에 집중할 때 유용합니다.</ProTip>
        <ExpectedResult items={['지역별 매물 분포를 시각적으로 파악', '매물 위치와 주변 환경을 동시에 확인', '관심 지역의 매물만 빠르게 필터링', '클러스터로 매물 밀집 지역 발견']} />
        <GuideFAQ items={[
          { q: '지도에서 바로 관심표명할 수 있나요?', a: '매물 마커 클릭 후 팝업에서 바로 관심표명이 가능합니다.' },
          { q: '로드뷰를 볼 수 있나요?', a: '네, 매물 마커에서 로드뷰 버튼을 클릭하면 주변 거리뷰를 확인할 수 있습니다.' },
        ]} />
      </div>
    </div>
  )
}
