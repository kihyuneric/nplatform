'use client'

import { GuideHeader, MockScreen, ProTip, GuideFAQ, ExpectedResult } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { Building2, Shield, Star, CheckCircle2 } from 'lucide-react'
import DS from '@/lib/design-system'

export default function InstitutionProfileGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader title="기관 프로필 관리" description="신뢰 등급을 높이고, 기관 프로필을 관리하여 매수자 신뢰를 확보하세요." time="8분" difficulty="쉬움" steps={3} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <MockScreen title="NPLatform - 기관 프로필">
          <div className="space-y-3 text-[0.8125rem]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-[var(--color-brand-dark)] text-white flex items-center justify-center text-[1.1875rem] font-bold">KB</div>
              <div>
                <div className={DS.text.cardTitle}>KB국민은행</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">인증 기관</Badge>
                  <div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-3 h-3 ${n <= 4 ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-text-muted)]'}`} />)}</div>
                  <span className={DS.text.captionLight}>4.8</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.bodyBold}>156</div><div className={DS.text.captionLight}>등록 매물</div></div>
              <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.bodyBold}>89</div><div className={DS.text.captionLight}>매각 완료</div></div>
              <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.bodyBold}>57%</div><div className={DS.text.captionLight}>매각률</div></div>
            </div>
          </div>
        </MockScreen>

        <div className={`mt-8 ${DS.card.base} ${DS.card.padding}`}>
          <h3 className={`${DS.text.cardTitle} mb-3`}>신뢰 등급 올리는 방법</h3>
          <div className="space-y-2 text-[0.8125rem]">
            {[
              { action: '기관 인증 완료', points: '+30점', done: true },
              { action: '프로필 100% 완성', points: '+20점', done: true },
              { action: '첫 매물 등록', points: '+10점', done: false },
              { action: '거래 완료 (건당)', points: '+5점', done: false },
              { action: '매수자 평가 4.0+', points: '+10점', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between border-b border-[var(--color-border-subtle)] last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${item.done ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-muted)]'}`} />
                  <span className={item.done ? DS.text.bodyBold : DS.text.body}>{item.action}</span>
                </div>
                <Badge variant={item.done ? 'default' : 'outline'} className={item.done ? 'bg-[var(--color-positive)] text-white' : ''}>{item.points}</Badge>
              </div>
            ))}
          </div>
        </div>

        <ProTip>인증 기관 배지가 있으면 매수자의 관심표명이 2배 이상 증가합니다. 기관 인증을 최우선으로 완료하세요.</ProTip>
        <ExpectedResult items={['인증 기관 배지로 신뢰도 확보', '기관 통계(매각률, 평가)로 실적 증명', '프로필 완성도에 따른 노출 우선순위']} />
        <GuideFAQ items={[
          { q: '인증 배지는 어떻게 받나요?', a: '사업자 등록증과 금융기관 라이선스를 제출하면 1~3영업일 내 인증됩니다.' },
          { q: '프로필 정보를 비공개할 수 있나요?', a: '기본 정보(기관명, 인증 상태)는 공개이며, 상세 통계는 비공개 설정이 가능합니다.' },
        ]} />
      </div>
    </div>
  )
}
