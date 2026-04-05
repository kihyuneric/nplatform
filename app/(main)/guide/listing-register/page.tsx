'use client'

import { GuideHeader, StepTimeline, MockScreen, ProTip, Warning, GuideFAQ, BeforeAfter, ExpectedResult } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle2, FileText, Camera, DollarSign, Eye } from 'lucide-react'
import DS from '@/lib/design-system'

const STEPS = [
  { title: '기본정보', duration: '3분' },
  { title: '담보물', duration: '3분' },
  { title: '채권현황', duration: '3분' },
  { title: '서류첨부', duration: '2분' },
  { title: '가격설정', duration: '2분' },
  { title: '확인/등록', duration: '1분' },
]

export default function ListingRegisterGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader title="매물 등록 가이드" description="6단계 위저드로 매물을 등록하세요. 단계별 안내를 따라가면 쉽게 완성할 수 있습니다." time="12분" difficulty="보통" steps={6} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <StepTimeline steps={STEPS} activeStep={2} />
        <BeforeAfter before="매물 정보를 정리하고 공고를 직접 작성하는 데 수시간이 소요되었습니다" after="6단계 위저드를 따라가면 15분 내에 매물 등록이 완료됩니다" />

        {STEPS.map((step, i) => (
          <section key={i} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[var(--color-brand-dark)] text-white flex items-center justify-center text-[0.8125rem] font-bold">{i + 1}</div>
              <h3 className={DS.text.cardTitle}>{step.title}</h3>
              <Badge variant="outline">{step.duration}</Badge>
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              {i === 0 && <div className="space-y-1">
                <p className={DS.text.body}>채권 유형, 담보유형, 소재지, 채권 원금 등 기본 정보를 입력합니다.</p>
                <div className="flex flex-wrap gap-2 mt-2">{['NPL/부실채권', '상가/오피스/아파트', '서울/경기/지방', '원금 규모'].map(t => <Badge key={t} variant="secondary" className="text-[0.75rem]">{t}</Badge>)}</div>
              </div>}
              {i === 1 && <p className={DS.text.body}>담보물의 상세 정보: 면적, 층수, 준공연도, 현재 사용 현황 등을 입력합니다.</p>}
              {i === 2 && <p className={DS.text.body}>채무자 정보, 연체 기간, 보증 관계, 선순위 채권 현황 등을 입력합니다.</p>}
              {i === 3 && <p className={DS.text.body}>등기부등본, 감정평가서, 담보물 사진 등 관련 서류를 첨부합니다. (NDA 체결 후 공개)</p>}
              {i === 4 && <p className={DS.text.body}>매각 희망가, 최저가, 협상 가능 여부를 설정합니다. AI 적정가 참고 가능.</p>}
              {i === 5 && <p className={DS.text.body}>입력한 모든 정보를 최종 확인하고 등록합니다. 등록 후 24시간 내 검증됩니다.</p>}
            </div>
          </section>
        ))}

        <ProTip>사진과 감정평가서를 함께 첨부하면 매수자의 관심도가 3배 이상 높아집니다. 첨부 서류가 많을수록 신뢰도가 올라갑니다.</ProTip>
        <Warning>허위 정보 기재 시 플랫폼 이용이 영구 제한됩니다. 모든 정보는 정확하게 입력해주세요.</Warning>
        <ExpectedResult items={['15분 내 매물 등록 완료', '24시간 내 플랫폼 검증 및 게시', '검증된 매수자 풀에 자동 노출', '관심도 실시간 추적']} />
        <GuideFAQ items={[
          { q: '등록 후 정보를 수정할 수 있나요?', a: '네, 등록 후에도 매물 정보를 수정할 수 있습니다. 단, NDA 체결된 매수자에게는 변경 알림이 발송됩니다.' },
          { q: '비공개 매물로 등록할 수 있나요?', a: '네, 비공개 설정 시 특정 매수자에게만 매물이 노출됩니다.' },
          { q: '등록 비용이 있나요?', a: '기본 등록은 무료이며, 프리미엄 노출(상단 고정)은 유료입니다.' },
        ]} />
      </div>
    </div>
  )
}
