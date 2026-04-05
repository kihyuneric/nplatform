'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { GuideHeader, MockScreen, ScenarioBox, ProTip, Warning, GuideFAQ, BeforeAfter, ExpectedResult, StepTimeline } from '@/components/guide/guide-components'
import { CheckCircle2, FileText, Shield, Search, MessageSquare, FileSignature, CreditCard, Star, Clock, AlertTriangle, Users } from 'lucide-react'
import DS from '@/lib/design-system'

const STAGES = [
  { title: '관심 등록', duration: '1일' },
  { title: 'NDA 체결', duration: '1~2일' },
  { title: '실사', duration: '1~2주' },
  { title: '가격협상', duration: '3~5일' },
  { title: '계약 체결', duration: '2~3일' },
  { title: '정산', duration: '1~3일' },
  { title: '완료', duration: '즉시' },
]

function DealStage({ number, title, icon: Icon, duration, documents, status = 'pending', children }: {
  number: number; title: string; icon: React.ElementType; duration: string; documents?: string[]; status?: string; children: React.ReactNode
}) {
  return (
    <div className="relative pl-12 pb-12 border-l-2 border-[var(--color-border-subtle)] last:border-0 last:pb-0">
      <div className={`absolute -left-[17px] w-8 h-8 rounded-full flex items-center justify-center text-[0.8125rem] font-bold
        ${status === 'active' ? 'bg-[var(--color-brand-dark)] text-white ring-4 ring-blue-100' : status === 'done' ? 'bg-[var(--color-positive)] text-white' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)]'}`}>
        {status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : number}
      </div>
      <div className="ml-4">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-5 h-5 text-[var(--color-brand-dark)]" />
          <h3 className={DS.text.sectionSubtitle}>{title}</h3>
          <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{duration}</Badge>
        </div>
        {documents && documents.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {documents.map((doc, i) => (
              <Badge key={i} variant="secondary" className="text-[0.75rem]"><FileText className="w-3 h-3 mr-1" />{doc}</Badge>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default function DealProcessGuidePage() {
  const [activeStage, setActiveStage] = useState(0)

  return (
    <div className={DS.page.wrapper}>
      <GuideHeader
        title="NPL 거래 전체 프로세스"
        description="관심 등록부터 거래 완료까지 7단계 거래 흐름을 완전히 이해하세요. 실제 시나리오와 함께 각 단계를 상세히 안내합니다."
        time="15분"
        difficulty="중요"
        steps={7}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Overview Timeline */}
        <div className={`${DS.card.base} ${DS.card.padding} mb-10`}>
          <h2 className={`${DS.text.cardTitle} mb-4`}>거래 흐름 한눈에 보기</h2>
          <StepTimeline steps={STAGES} activeStep={activeStage} />
          <div className="flex gap-2 flex-wrap justify-center mt-2">
            {STAGES.map((s, i) => (
              <button key={i} onClick={() => setActiveStage(i)}
                className={`text-[0.75rem] px-3 py-1 rounded-full transition ${i === activeStage ? 'bg-[var(--color-brand-dark)] text-white' : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)]'}`}>
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <ScenarioBox
          title="예시 시나리오"
          persona="김투자 (개인 투자자)"
          description="서울 강남 오피스 채권 35억 원, 매도자 KB국민은행. 감정가 45억 원 대비 할인율 22%인 매물에 대한 거래를 진행합니다."
          steps={[
            'NPL 매물에서 강남 오피스 채권 발견 및 AI 분석 확인',
            '관심 등록 후 NDA 체결, 상세 정보 열람',
            '14개 항목 실사 진행 (등기부, 감정평가, 임차인 조사)',
            '오퍼 33억 제출 → 역제안 34억 → 합의',
            '채권양수도계약서 자동 생성 및 서명',
            '잔금 34억 입금, 채권 이전 서류 교환',
            '거래 완료 및 상호 평가',
          ]}
        />

        <BeforeAfter
          before="NPL 거래를 어디서 어떻게 시작해야 할지 모르고, 관련 서류를 직접 준비해야 해서 수주~수개월 소요"
          after="NPLatform에서 7단계 구조화된 프로세스로 평균 2~3주 내 거래 완료, 계약서 자동 생성"
        />

        {/* 7 Stages */}
        <div className="mt-10">
          <h2 className={`${DS.text.sectionTitle} mb-8`}>7단계 상세 가이드</h2>

          {/* Stage 1 */}
          <DealStage number={1} title="관심 등록 (LOI)" icon={Search} duration="1일" status={activeStage >= 0 ? (activeStage > 0 ? 'done' : 'active') : 'pending'}>
            <p className={`${DS.text.body} mb-4`}>관심 있는 매물에 대해 매수 의향을 표명합니다. 이 단계에서는 기본 정보만 확인할 수 있으며, 상세 정보는 NDA 체결 후 공개됩니다.</p>

            <MockScreen title="NPLatform - 딜 브릿지 > 매물 상세">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className={DS.text.captionLight}>KB국민은행 매각</div>
                    <div className={DS.text.bodyBold}>서울 강남구 테헤란로 오피스 채권</div>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200">매각 진행중</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-[0.8125rem]">
                  <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>채권 원금</div><div className={DS.text.bodyBold}>35억</div></div>
                  <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>감정가</div><div className={DS.text.bodyBold}>45억</div></div>
                  <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>AI 등급</div><div className="font-bold text-[var(--color-positive)]">A</div></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className={`px-4 py-2 rounded text-[0.8125rem] ${DS.button.ghost}`}>저장</div>
                  <div className="px-4 py-2 bg-[var(--color-brand-dark)] text-white rounded text-[0.8125rem] font-medium">관심 등록</div>
                </div>
              </div>
            </MockScreen>

            <div className={`${DS.card.flat} ${DS.card.padding} my-3`}>
              <h4 className={`${DS.text.bodyBold} mb-2`}>이 단계에서 하는 일</h4>
              <ul className="space-y-1">
                <li className={`flex items-center gap-2 ${DS.text.body}`}><CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />매물 기본 정보 확인 (소재지, 채권 원금, 담보유형)</li>
                <li className={`flex items-center gap-2 ${DS.text.body}`}><CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />AI 분석 등급 및 예상 수익률 확인</li>
                <li className={`flex items-center gap-2 ${DS.text.body}`}><CheckCircle2 className="w-4 h-4 text-[var(--color-positive)]" />&quot;관심 등록&quot; 버튼 클릭으로 매수 의향 전달</li>
              </ul>
            </div>

            <ProTip>관심 등록은 법적 구속력이 없으므로 부담없이 등록하세요. 여러 매물에 동시 관심 등록이 가능합니다.</ProTip>
          </DealStage>

          {/* Stage 2 */}
          <DealStage number={2} title="NDA 체결" icon={Shield} duration="1~2일" documents={['비밀유지계약서(NDA)']} status={activeStage >= 1 ? (activeStage > 1 ? 'done' : 'active') : 'pending'}>
            <p className={`${DS.text.body} mb-4`}>매도자가 관심 등록을 수락하면 비밀유지계약(NDA) 체결 단계로 진행됩니다. NDA 서명 후 상세 채권 정보가 공개됩니다.</p>

            <MockScreen title="NPLatform - 딜룸 > NDA 서명">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[0.8125rem]">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span className={DS.text.bodyBold}>비밀유지계약서 서명 요청</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[0.75rem] text-amber-800">
                  NDA에 서명하시면 다음 정보가 공개됩니다: 등기부등본, 감정평가서, 임차인 현황, 연체 이력
                </div>
                <div className="border border-[var(--color-border-default)] rounded p-3 text-[0.8125rem] text-[var(--color-text-muted)] h-24 overflow-hidden">
                  제1조 (목적) 본 계약은 NPL 채권 양수도 검토 과정에서 교환되는 비밀정보의 보호를 목적으로 한다...
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="px-4 py-2 bg-[var(--color-brand-dark)] text-white rounded text-[0.8125rem] font-medium">전자 서명하기</div>
                </div>
              </div>
            </MockScreen>

            <div className={`${DS.card.flat} ${DS.card.padding} my-3`}>
              <h4 className={`${DS.text.bodyBold} mb-2`}>NDA 체결 후 공개되는 정보</h4>
              <div className={`grid grid-cols-2 gap-2 ${DS.text.body}`}>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />등기부등본</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />감정평가서</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />임차인 현황</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />연체 이력</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />담보물 사진</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />법원 경매 기록</span>
              </div>
            </div>

            <Warning>NDA에 의해 공개된 정보를 제3자에게 유출하면 법적 책임이 발생합니다. 모든 자료는 딜룸 내에서만 열람하세요.</Warning>
          </DealStage>

          {/* Stage 3 */}
          <DealStage number={3} title="실사 (Due Diligence)" icon={Search} duration="1~2주" documents={['실사 체크리스트', '등기부등본', '감정평가서']} status={activeStage >= 2 ? (activeStage > 2 ? 'done' : 'active') : 'pending'}>
            <p className={`${DS.text.body} mb-4`}>14개 항목의 실사 체크리스트를 통해 채권과 담보물의 상태를 꼼꼼하게 확인합니다.</p>

            <MockScreen title="NPLatform - 딜룸 > 실사 체크리스트">
              <div className="space-y-2 text-[0.8125rem]">
                {['등기부등본 확인', '감정평가서 검토', '임차인 현황 파악', '선순위 권리 분석', '법원 경매 기록', '세금 체납 여부', '건축물대장 확인'].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border-subtle)] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded ${i < 4 ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-surface-sunken)]'} flex items-center justify-center`}>
                        {i < 4 && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={i < 4 ? DS.text.bodyBold : DS.text.body}>{item}</span>
                    </div>
                    <Badge variant={i < 4 ? 'default' : 'outline'} className={`text-[0.75rem] ${i < 4 ? 'bg-[var(--color-positive)]' : ''}`}>
                      {i < 4 ? '완료' : '대기'}
                    </Badge>
                  </div>
                ))}
                <div className={`${DS.text.captionLight} mt-2`}>진행률: 4/14 (28%)</div>
              </div>
            </MockScreen>

            <ProTip>실사 과정에서 전문가 도움이 필요하면 플랫폼 내 전문가 서비스를 이용하세요. 법률, 감정, 세무 전문가가 대기 중입니다.</ProTip>
          </DealStage>

          {/* Stage 4 */}
          <DealStage number={4} title="가격 협상" icon={MessageSquare} duration="3~5일" status={activeStage >= 3 ? (activeStage > 3 ? 'done' : 'active') : 'pending'}>
            <p className={`${DS.text.body} mb-4`}>실사 결과를 바탕으로 매수 가격을 제안하고, 매도자와 협상합니다. 딜룸 채팅에서 직접 오퍼를 제출할 수 있습니다.</p>

            <MockScreen title="NPLatform - 딜룸 > 오퍼 협상">
              <div className="space-y-3 text-[0.8125rem]">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-brand-dark)] text-white flex items-center justify-center text-[0.75rem] shrink-0">김</div>
                  <div className="bg-blue-50 rounded-lg p-3 max-w-[80%]">
                    <div className={DS.text.captionLight}>김투자 (매수자)</div>
                    <div className={`${DS.text.body} mt-1`}>실사 결과를 바탕으로 33억 원에 매수를 제안드립니다.</div>
                    <div className={`mt-2 bg-[var(--color-surface-elevated)] rounded p-2 border border-[var(--color-border-subtle)]`}>
                      <span className={DS.text.captionLight}>오퍼 금액: </span><span className="font-bold text-[var(--color-brand-dark)]">33억 원</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="bg-[var(--color-surface-sunken)] rounded-lg p-3 max-w-[80%]">
                    <div className={DS.text.captionLight}>KB국민은행 NPL팀</div>
                    <div className={`${DS.text.body} mt-1`}>34억 원 역제안 드립니다. 감정가 대비 24% 할인입니다.</div>
                    <div className={`mt-2 bg-[var(--color-surface-elevated)] rounded p-2 border border-[var(--color-border-subtle)]`}>
                      <span className={DS.text.captionLight}>역제안: </span><span className="font-bold text-amber-600">34억 원</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[var(--color-brand-mid)] text-white flex items-center justify-center text-[0.75rem] shrink-0">KB</div>
                </div>
              </div>
            </MockScreen>

            <ProTip>AI 분석 결과에서 제시하는 적정 가격 범위를 참고하면 협상에 유리합니다. 시장 데이터 기반의 객관적 근거를 활용하세요.</ProTip>
          </DealStage>

          {/* Stage 5 */}
          <DealStage number={5} title="계약 체결" icon={FileSignature} duration="2~3일" documents={['채권양수도계약서', '확인서', '위임장']} status={activeStage >= 4 ? (activeStage > 4 ? 'done' : 'active') : 'pending'}>
            <p className={`${DS.text.body} mb-4`}>합의된 금액으로 채권양수도계약서를 생성하고 서명합니다. NPLatform에서 6종의 계약서를 자동 생성할 수 있습니다.</p>

            <MockScreen title="NPLatform - 딜룸 > 계약서 생성">
              <div className="space-y-3 text-[0.8125rem]">
                <div className={DS.text.bodyBold}>채권양수도계약서 생성</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>매도자</div><div className={DS.text.bodyBold}>KB국민은행</div></div>
                  <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>매수자</div><div className={DS.text.bodyBold}>김투자</div></div>
                  <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>계약금액</div><div className={DS.text.bodyBold}>34억 원</div></div>
                  <div className="bg-[var(--color-surface-sunken)] rounded p-2"><div className={DS.text.captionLight}>잔금일</div><div className={DS.text.bodyBold}>2026-04-05</div></div>
                </div>
                <div className="flex gap-2">
                  <div className={`px-3 py-1.5 bg-[var(--color-surface-sunken)] rounded text-[0.75rem] text-[var(--color-text-secondary)]`}>PDF 다운로드</div>
                  <div className={`px-3 py-1.5 bg-[var(--color-surface-sunken)] rounded text-[0.75rem] text-[var(--color-text-secondary)]`}>HWP 다운로드</div>
                  <div className="px-3 py-1.5 bg-[var(--color-brand-dark)] text-white rounded text-[0.75rem] ml-auto">전자 서명</div>
                </div>
              </div>
            </MockScreen>

            <Warning>계약서 서명 전 반드시 법률 전문가의 검토를 받으세요. 자동 생성된 계약서도 개별 거래 특성에 맞는 수정이 필요할 수 있습니다.</Warning>
          </DealStage>

          {/* Stage 6 */}
          <DealStage number={6} title="정산" icon={CreditCard} duration="1~3일" documents={['입금확인서', '채권이전서류']} status={activeStage >= 5 ? (activeStage > 5 ? 'done' : 'active') : 'pending'}>
            <p className={`${DS.text.body} mb-4`}>계약에 따라 잔금을 입금하고, 채권 이전 서류를 교환합니다. 정산 진행 상황을 실시간으로 확인할 수 있습니다.</p>

            <MockScreen title="NPLatform - 딜룸 > 정산 진행">
              <div className="space-y-3 text-[0.8125rem]">
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)]">
                  <span className={DS.text.body}>잔금 입금</span>
                  <Badge className="bg-[var(--color-positive)] text-white">확인됨</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)]">
                  <span className={DS.text.body}>채권양도 통지서 발송</span>
                  <Badge className="bg-[var(--color-positive)] text-white">완료</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)]">
                  <span className={DS.text.body}>담보권 이전 등기</span>
                  <Badge variant="outline">진행중</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className={DS.text.body}>최종 확인</span>
                  <Badge variant="outline">대기</Badge>
                </div>
              </div>
            </MockScreen>
          </DealStage>

          {/* Stage 7 */}
          <DealStage number={7} title="거래 완료" icon={Star} duration="즉시" status={activeStage >= 6 ? 'active' : 'pending'}>
            <p className={`${DS.text.body} mb-4`}>모든 정산이 완료되면 거래가 종결됩니다. 상호 평가를 남기고, 거래 이력이 기록됩니다.</p>

            <MockScreen title="NPLatform - 거래 완료">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-[var(--color-positive)]" />
                </div>
                <div className={DS.text.cardTitle}>거래가 완료되었습니다</div>
                <div className={`${DS.text.body} mt-1`}>서울 강남구 오피스 채권 | 34억 원</div>
                <div className="flex justify-center gap-2 mt-4">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`w-6 h-6 ${n <= 4 ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-text-muted)]'}`} />
                  ))}
                </div>
                <div className={`${DS.text.body} mt-2`}>거래 만족도를 평가해주세요</div>
              </div>
            </MockScreen>

            <ExpectedResult items={[
              '거래 이력이 프로필에 기록됩니다',
              '상호 평가를 통해 신뢰 등급이 올라갑니다',
              '포트폴리오에 자동 반영됩니다',
              '유사 매물 추천 알림을 받을 수 있습니다',
            ]} />
          </DealStage>
        </div>

        {/* Summary */}
        <div className={`${DS.card.base} ${DS.card.padding} mt-10`}>
          <h3 className={`${DS.text.cardTitle} mb-4`}>거래 프로세스 요약</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-[0.8125rem]">
            <div className="bg-blue-50 rounded-lg p-3"><div className={DS.text.metricLarge}>7</div><div className={DS.text.captionLight}>거래 단계</div></div>
            <div className="bg-green-50 rounded-lg p-3"><div className="text-[1.625rem] font-bold text-[var(--color-positive)] tabular-nums leading-none">2~3주</div><div className={DS.text.captionLight}>평균 소요기간</div></div>
            <div className="bg-purple-50 rounded-lg p-3"><div className="text-[1.625rem] font-bold text-purple-600 tabular-nums leading-none">6종</div><div className={DS.text.captionLight}>자동 생성 계약서</div></div>
            <div className="bg-amber-50 rounded-lg p-3"><div className="text-[1.625rem] font-bold text-amber-600 tabular-nums leading-none">14개</div><div className={DS.text.captionLight}>실사 체크리스트</div></div>
          </div>
        </div>

        <GuideFAQ items={[
          { q: '관심 등록 후 반드시 거래해야 하나요?', a: '아닙니다. 관심 등록은 법적 구속력이 없으며, 실사 결과에 따라 언제든 철회할 수 있습니다.' },
          { q: 'NDA는 얼마나 유효한가요?', a: 'NDA는 일반적으로 2년간 유효합니다. 정확한 기간은 각 NDA 계약서에 명시되어 있습니다.' },
          { q: '실사에 전문가 도움을 받을 수 있나요?', a: '네. 플랫폼 내에서 법률, 감정, 세무 전문가를 바로 연결할 수 있습니다. 전문가 서비스 메뉴를 이용하세요.' },
          { q: '계약서는 어떤 형식으로 제공되나요?', a: 'PDF, DOCX, HWP 형식으로 다운로드할 수 있으며, 전자 서명도 지원합니다.' },
          { q: '거래 중 분쟁이 발생하면 어떻게 하나요?', a: 'NPLatform 고객센터에서 분쟁 중재를 지원합니다. 또한 플랫폼 내 법률 전문가 상담을 이용할 수 있습니다.' },
          { q: '동시에 여러 매물 거래가 가능한가요?', a: '네, 여러 매물에 대해 동시에 거래를 진행할 수 있습니다. 각 딜룸에서 독립적으로 관리됩니다.' },
        ]} />
      </div>
    </div>
  )
}
