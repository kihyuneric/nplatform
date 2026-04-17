'use client'

import { useParams, useRouter } from 'next/navigation'
import { X, Printer } from 'lucide-react'

const SERVICE_GUIDES: Record<string, { title: string; steps: { title: string; description: string }[] }> = {
  'npl-listing': {
    title: 'NPL 매물 등록',
    steps: [
      { title: '매물 기본 정보 입력', description: '채권 유형, 담보물건 정보, 소재지 등 기본 정보를 입력합니다.' },
      { title: '채권 상세 정보 입력', description: '원금, 이자율, 연체 기간, 감정가 등 채권의 상세 정보를 입력합니다.' },
      { title: '관련 서류 업로드', description: '등기부등본, 감정평가서, 채권양도양수계약서 등 필수 서류를 업로드합니다.' },
      { title: '공개 범위 설정', description: '티저(Teaser) / NDA 필수 / 전체공개 중 정보 공개 범위를 선택합니다.' },
      { title: '검토 및 게시', description: '입력한 정보를 최종 확인하고 매물을 게시합니다. 관리자 승인 후 공개됩니다.' },
    ],
  },
  'deal-bridge': {
    title: '딜 브릿지 이용',
    steps: [
      { title: '매물 탐색 및 관심 표시', description: '딜 마켓플레이스에서 관심 있는 매물을 찾고 관심 표시 버튼을 클릭합니다.' },
      { title: 'NDA 체결', description: '매도자가 NDA를 요구하는 경우, 비밀유지계약을 전자 서명합니다.' },
      { title: '실사(Due Diligence)', description: '체크리스트에 따라 법률, 감정평가, 재무, 물리 실사를 진행합니다.' },
      { title: '가격 협상', description: '오퍼를 제출하고, 카운터 오퍼를 주고받으며 가격을 합의합니다.' },
      { title: '계약 및 정산', description: '합의된 조건으로 계약을 체결하고, 에스크로를 통해 안전하게 정산합니다.' },
    ],
  },
  'ai-analysis': {
    title: 'AI 분석 도구',
    steps: [
      { title: '분석 유형 선택', description: '가격 추정, 등기 분석, 낙찰 확률, 수익 시뮬레이션 중 원하는 분석을 선택합니다.' },
      { title: '분석 대상 입력', description: '매물 ID를 입력하거나, 직접 물건 정보를 입력합니다.' },
      { title: '추가 파라미터 설정', description: '분석에 필요한 추가 조건(투자 기간, 목표 수익률 등)을 설정합니다.' },
      { title: '분석 결과 확인', description: 'AI가 산출한 분석 결과와 신뢰도 점수를 확인합니다.' },
      { title: '리포트 다운로드', description: '분석 결과를 PDF 리포트로 다운로드하여 활용합니다.' },
    ],
  },
  consultation: {
    title: '전문가 상담',
    steps: [
      { title: '전문가 검색', description: '법률, 세무, 감정평가 등 분야별 전문가를 검색합니다.' },
      { title: '서비스 선택', description: '전문가가 제공하는 서비스 목록에서 원하는 서비스를 선택합니다.' },
      { title: '상담 예약', description: '원하는 날짜와 시간에 상담을 예약합니다. 무료 초기상담을 제공하는 서비스도 있습니다.' },
      { title: '상담 진행', description: '예약된 시간에 온라인 또는 오프라인으로 상담을 진행합니다.' },
      { title: '후기 작성', description: '상담 완료 후 평점과 후기를 남겨 다른 이용자에게 도움을 줍니다.' },
    ],
  },
  'auction-analysis': {
    title: '경매 분석',
    steps: [
      { title: '경매 물건 검색', description: '법원, 지역, 물건 종류 등으로 경매 물건을 검색합니다.' },
      { title: '권리분석 확인', description: 'AI가 자동으로 분석한 등기부등본 권리 관계를 확인합니다.' },
      { title: '시세 비교', description: '주변 실거래가, 감정가 대비 최저가 비율을 비교합니다.' },
      { title: '입찰가 시뮬레이션', description: '예상 수익률에 따른 적정 입찰가를 시뮬레이션합니다.' },
      { title: '입찰 준비', description: '입찰표 작성 가이드와 필요 서류 체크리스트를 확인합니다.' },
    ],
  },
}

const DEFAULT_GUIDE = {
  title: '서비스 가이드',
  steps: [
    { title: '서비스 접속', description: '해당 서비스 페이지에 접속합니다.' },
    { title: '기능 확인', description: '제공되는 기능과 메뉴를 확인합니다.' },
    { title: '이용 시작', description: '원하는 기능을 선택하여 이용을 시작합니다.' },
  ],
}

export default function ServiceGuidePage() {
  const params = useParams()
  const router = useRouter()
  const key = params?.key as string
  const guide = SERVICE_GUIDES[key] || DEFAULT_GUIDE

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            NP
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">NPLatform 서비스 가이드</p>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{guide.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text-secondary)]"
            title="인쇄"
          >
            <Printer className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.close()}
            className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text-secondary)]"
            title="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Steps */}
      <ol className="relative space-y-8 border-l-2 border-blue-500/30 pl-8">
        {guide.steps.map((step, idx) => (
          <li key={idx} className="relative">
            <div className="absolute -left-[2.55rem] flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow">
              {idx + 1}
            </div>
            <h3 className="mb-1 text-base font-semibold text-[var(--color-text-primary)]">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {step.description}
            </p>
          </li>
        ))}
      </ol>

      {/* Footer */}
      <div className="mt-12 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          추가 도움이 필요하시면{' '}
          <button
            onClick={() => router.push('/support')}
            className="font-medium text-blue-400 hover:underline"
          >
            고객 지원센터
          </button>
          로 문의해 주세요.
        </p>
      </div>
    </div>
  )
}
