'use client'

import { GuideHeader, MockScreen, ProTip, Warning, GuideFAQ, ExpectedResult } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, FileText, AlertTriangle, Search } from 'lucide-react'
import DS from '@/lib/design-system'

const DD_ITEMS = [
  { category: '법률', items: ['등기부등본 확인', '선순위 권리 분석', '법원 경매 기록 조회', '가압류/가처분 확인'] },
  { category: '담보물', items: ['감정평가서 검토', '건축물대장 확인', '현장 실사', '임차인 현황 파악'] },
  { category: '채권', items: ['연체 이력 분석', '채무자 신용 조회', '보증 관계 확인'] },
  { category: '세금/비용', items: ['세금 체납 여부', '관리비 연체 확인', '예상 비용 산정'] },
]

export default function DueDiligenceGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader title="실사 체크리스트 가이드" description="14개 항목의 체계적인 실사 체크리스트로 채권과 담보물을 꼼꼼하게 검증하세요." time="12분" difficulty="보통" steps={14} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <MockScreen title="NPLatform - 딜룸 > 실사 체크리스트">
          <div className="space-y-4 text-[0.8125rem]">
            {DD_ITEMS.map((cat, ci) => (
              <div key={ci}>
                <div className="font-semibold text-[var(--color-brand-dark)] mb-2">{cat.category} ({cat.items.length}개)</div>
                <div className="space-y-1.5">
                  {cat.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 ${ci === 0 && i < 3 ? 'bg-[var(--color-positive)] border-[var(--color-positive)]' : 'border-[var(--color-border-default)]'} flex items-center justify-center`}>
                        {ci === 0 && i < 3 && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={ci === 0 && i < 3 ? DS.text.bodyBold : DS.text.body}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </MockScreen>

        <div className="mt-8 space-y-4">
          {DD_ITEMS.map((cat, ci) => (
            <div key={ci} className={`${DS.card.base} ${DS.card.padding}`}>
              <h3 className={`${DS.text.cardTitle} mb-3`}>{cat.category} 실사 ({cat.items.length}항목)</h3>
              <div className="space-y-3 text-[0.8125rem]">
                {cat.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-[var(--color-border-subtle)] last:border-0 pb-2 last:pb-0">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-brand-dark)] text-white flex items-center justify-center text-[0.75rem] flex-shrink-0">{i + 1}</div>
                    <div>
                      <div className={DS.text.bodyBold}>{item}</div>
                      <div className={`${DS.text.captionLight} mt-0.5`}>
                        {item === '등기부등본 확인' && '소유권, 근저당, 전세권 등 권리 관계를 정확히 파악합니다.'}
                        {item === '감정평가서 검토' && '최근 감정 가격과 현재 시세를 비교하여 적정 가치를 판단합니다.'}
                        {item === '임차인 현황 파악' && '대항력 있는 임차인, 보증금 규모, 계약 만료일 등을 확인합니다.'}
                        {item === '연체 이력 분석' && '연체 기간, 금액, 채무자의 상환 의지를 분석합니다.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <ProTip>실사 과정이 어렵다면 플랫폼 내 전문가 서비스를 이용하세요. 실사 전문가가 체크리스트 항목을 대행해드립니다.</ProTip>

        <Warning>실사를 생략하면 예상치 못한 권리관계나 하자로 인해 큰 손실이 발생할 수 있습니다. 모든 항목을 꼼꼼히 확인하세요.</Warning>

        <ExpectedResult items={['14개 항목 체계적 실사 완료', '리스크 사전 파악으로 투자 안정성 확보', '실사 결과를 기반으로 한 합리적 가격 협상', '전문가 검토를 통한 추가 검증']} />

        <GuideFAQ items={[
          { q: '실사에 보통 얼마나 걸리나요?', a: '매물 복잡도에 따라 다르지만, 일반적으로 1~2주가 소요됩니다. 단순한 아파트 채권은 1주일 이내에 완료되기도 합니다.' },
          { q: '실사 비용은 누가 부담하나요?', a: '실사 비용은 매수자가 부담합니다. 전문가 서비스 이용 시 서비스 비용이 별도로 발생합니다.' },
          { q: '실사 결과가 불량하면 거래를 취소할 수 있나요?', a: '네, 실사 결과에 따라 관심표명을 철회하거나 가격을 재협상할 수 있습니다.' },
        ]} />
      </div>
    </div>
  )
}
