'use client'

import { GuideHeader, StepTimeline, MockScreen, ProTip, GuideFAQ, ExpectedResult, BeforeAfter } from '@/components/guide/guide-components'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Settings, Search, CheckCircle2, ShoppingCart, Building2, Briefcase, Users } from 'lucide-react'
import DS from '@/lib/design-system'

const STEPS = [
  { title: '회원가입', duration: '2분' },
  { title: '역할 선택', duration: '1분' },
  { title: '프로필 완성', duration: '3분' },
  { title: '첫 매물 검색', duration: '1분' },
]

export default function GettingStartedGuidePage() {
  return (
    <div className={DS.page.wrapper}>
      <GuideHeader
        title="회원가입 & 역할 설정"
        description="NPLatform에 가입하고 나에게 맞는 역할을 선택하세요. 5분이면 시작할 수 있습니다."
        time="5분"
        difficulty="쉬움"
        steps={4}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <StepTimeline steps={STEPS} activeStep={1} />

        {/* Step 1 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center"><UserPlus className="w-5 h-5 text-white" /></div>
            <h3 className={DS.text.cardTitle}>Step 1. 회원가입</h3>
          </div>

          <MockScreen title="NPLatform - 회원가입">
            <div className="space-y-3 text-[0.8125rem] max-w-sm mx-auto">
              <div className="text-center mb-4">
                <div className={DS.text.cardTitle}>NPLatform 가입</div>
                <div className={DS.text.captionLight}>이메일 또는 소셜 계정으로 시작하세요</div>
              </div>
              <div className="space-y-2">
                <div className="border border-[var(--color-border-default)] rounded px-3 py-2 text-[var(--color-text-muted)]">이메일 주소</div>
                <div className="border border-[var(--color-border-default)] rounded px-3 py-2 text-[var(--color-text-muted)]">비밀번호</div>
                <div className="w-full py-2 bg-[var(--color-brand-dark)] text-white rounded text-center text-[0.8125rem] font-medium">가입하기</div>
              </div>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 border-t border-[var(--color-border-subtle)]" /><span className={DS.text.captionLight}>또는</span><div className="flex-1 border-t border-[var(--color-border-subtle)]" />
              </div>
              <div className="space-y-2">
                <div className="border border-[var(--color-border-default)] rounded px-3 py-2 text-center text-[0.8125rem] text-[var(--color-text-primary)]">Google로 가입</div>
                <div className="border border-[var(--color-border-default)] rounded px-3 py-2 text-center text-[0.8125rem] text-[var(--color-text-primary)]">카카오로 가입</div>
              </div>
            </div>
          </MockScreen>

          <ProTip>소셜 로그인(Google, 카카오)을 사용하면 이메일 인증 없이 바로 시작할 수 있습니다.</ProTip>
        </section>

        {/* Step 2 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center"><Settings className="w-5 h-5 text-white" /></div>
            <h3 className={DS.text.cardTitle}>Step 2. 역할 선택</h3>
          </div>

          <MockScreen title="NPLatform - 역할 선택">
            <div className="grid grid-cols-2 gap-3 text-[0.8125rem]">
              {[
                { icon: ShoppingCart, role: '매수자', desc: 'NPL 매물을 탐색하고 투자합니다', color: 'border-blue-400' },
                { icon: Building2, role: '매도자', desc: '보유 채권을 등록하고 매각합니다', color: 'border-amber-400' },
                { icon: Briefcase, role: '전문가', desc: '전문 서비스를 제공합니다', color: 'border-purple-400' },
                { icon: Users, role: '파트너', desc: '추천으로 수익을 창출합니다', color: 'border-green-400' },
              ].map((item, i) => (
                <div key={i} className={`border-2 ${i === 0 ? item.color + ' bg-blue-50' : 'border-[var(--color-border-default)]'} rounded-lg p-3 cursor-pointer`}>
                  <item.icon className="w-5 h-5 mb-2 text-[var(--color-text-tertiary)]" />
                  <div className={DS.text.bodyBold}>{item.role}</div>
                  <div className={DS.text.captionLight}>{item.desc}</div>
                </div>
              ))}
            </div>
          </MockScreen>

          <ProTip>역할은 나중에 언제든 변경하거나 추가할 수 있습니다. 매수자와 매도자 역할을 동시에 사용하는 것도 가능합니다.</ProTip>
        </section>

        {/* Step 3 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>
            <h3 className={DS.text.cardTitle}>Step 3. 프로필 완성</h3>
          </div>

          <div className={`${DS.card.flat} ${DS.card.padding}`}>
            <h4 className={DS.text.bodyBold}>프로필 완성도를 높이면 좋은 점</h4>
            <ul className="space-y-1 mt-2">
              <li className={`flex items-center gap-2 ${DS.text.body}`}><CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />거래 상대방의 신뢰도 향상</li>
              <li className={`flex items-center gap-2 ${DS.text.body}`}><CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />맞춤형 매물 추천 정확도 상승</li>
              <li className={`flex items-center gap-2 ${DS.text.body}`}><CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />전문가 매칭 우선 순위 부여</li>
            </ul>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center"><Search className="w-5 h-5 text-white" /></div>
            <h3 className={DS.text.cardTitle}>Step 4. 첫 매물 검색</h3>
          </div>

          <ExpectedResult items={[
            'NPL 매물에서 NPL 매물 검색',
            'AI 분석으로 투자 적합성 확인',
            '관심 매물 저장 및 알림 설정',
            '관심 등록으로 거래 시작',
          ]} />
        </section>

        <BeforeAfter
          before="NPL 시장 진입이 어렵고, 어디서 시작해야 할지 막막했습니다"
          after="5분 만에 가입 완료, AI가 추천하는 매물을 바로 확인할 수 있습니다"
        />

        <GuideFAQ items={[
          { q: '가입비가 있나요?', a: '아닙니다. NPLatform 가입은 완전 무료이며, 기본 매물 검색도 무료로 이용할 수 있습니다.' },
          { q: '본인 인증이 필요한가요?', a: '기본 기능은 이메일 인증만으로 이용 가능합니다. 거래 참여 시 본인 인증이 추가로 필요합니다.' },
          { q: '역할은 나중에 변경할 수 있나요?', a: '네, 설정 메뉴에서 언제든 역할을 변경하거나 추가할 수 있습니다.' },
        ]} />
      </div>
    </div>
  )
}
