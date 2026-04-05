'use client'

import { GuideHeader, MockScreen, ProTip, GuideFAQ, BeforeAfter, ExpectedResult } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { Megaphone, CheckCircle2, Bell } from 'lucide-react'
import DS from '@/lib/design-system'

export default function DemandRegisterGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader title="매수 수요 등록 가이드" description="원하는 매물 조건을 공개하면, 매도자가 먼저 제안합니다. 수동적 탐색에서 능동적 매칭으로." time="7분" difficulty="보통" steps={3} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <BeforeAfter before="매물이 등록될 때까지 기다리거나, 직접 찾아다녀야 했습니다" after="매수 조건을 등록하면 매도자가 먼저 제안하고, 조건에 맞는 매물이 자동 매칭됩니다" />

        <MockScreen title="NPLatform - 매수 수요 등록">
          <div className="space-y-3 text-[0.8125rem] max-w-md">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={DS.text.captionLight}>희망 담보유형</label><div className={`border border-[var(--color-border-default)] rounded px-3 py-2 ${DS.text.bodyBold}`}>아파트</div></div>
              <div><label className={DS.text.captionLight}>희망 지역</label><div className={`border border-[var(--color-border-default)] rounded px-3 py-2 ${DS.text.bodyBold}`}>서울 전체</div></div>
              <div><label className={DS.text.captionLight}>희망 금액 범위</label><div className={`border border-[var(--color-border-default)] rounded px-3 py-2 ${DS.text.bodyBold}`}>1억 ~ 5억</div></div>
              <div><label className={DS.text.captionLight}>최소 할인율</label><div className={`border border-[var(--color-border-default)] rounded px-3 py-2 ${DS.text.bodyBold}`}>20% 이상</div></div>
            </div>
            <div><label className={DS.text.captionLight}>추가 조건</label><div className="border border-[var(--color-border-default)] rounded px-3 py-2 text-[var(--color-text-muted)]">임차인 없는 매물 선호, AI A등급 이상</div></div>
            <div className="flex gap-2">
              <label className={`flex items-center gap-2 ${DS.text.caption}`}><input type="checkbox" className="rounded" defaultChecked /><span className="text-[var(--color-text-primary)]">매도자에게 공개</span></label>
              <label className={`flex items-center gap-2 ${DS.text.caption}`}><input type="checkbox" className="rounded" defaultChecked /><span className="text-[var(--color-text-primary)]">매칭 알림 받기</span></label>
            </div>
            <div className="w-full py-2 bg-[var(--color-brand-dark)] text-white rounded text-center text-[0.8125rem] font-medium">수요 등록</div>
          </div>
        </MockScreen>

        <ProTip>매수 수요를 구체적으로 작성할수록 정확한 매칭이 이루어집니다. 할인율, AI 등급 등 세부 조건을 활용하세요.</ProTip>
        <ExpectedResult items={['매도자가 먼저 매물을 제안하는 역방향 매칭', '조건 매칭 시 자동 알림', '수요 조건 비공개 설정도 가능', '등록된 수요는 언제든 수정/삭제 가능']} />
        <GuideFAQ items={[
          { q: '수요 등록하면 매도자에게 연락처가 공개되나요?', a: '아닙니다. 매도자가 제안을 보내면 플랫폼 내에서 대화할 수 있으며, 연락처는 NDA 체결 전까지 비공개입니다.' },
          { q: '수요 등록 비용이 있나요?', a: '매수 수요 등록은 무료입니다.' },
          { q: '최대 몇 개까지 등록할 수 있나요?', a: '무료 회원 3개, 프리미엄 회원 10개까지 등록할 수 있습니다.' },
        ]} />
      </div>
    </div>
  )
}
