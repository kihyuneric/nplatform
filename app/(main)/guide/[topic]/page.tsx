'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useState, use } from 'react'
import { ArrowLeft, Clock, FileText, MessageSquare, ChevronRight, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react'
import DS from '@/lib/design-system'

const GUIDE_CONTENT: Record<string, {
  title: string
  description: string
  time: string
  difficulty: string
  category: string
  date: string
  sections: { id: string; heading: string; body: string; type?: 'tip' | 'warning' | 'normal' }[]
  related: { title: string; href: string; category: string }[]
}> = {
  psychology: {
    title: 'NPL 투자 심리 가이드',
    description: '경매 및 NPL 투자에서 나타나는 심리적 편향과 극복 방법을 알아보세요.',
    time: '10분',
    difficulty: '보통',
    category: '심화 학습',
    date: '2026.03.21',
    sections: [
      {
        id: 'anchoring',
        heading: '1. 앵커링 편향',
        body: '처음 접한 정보(감정가, 최초 제시가)에 과도하게 의존하는 현상입니다. 독립적인 AI 평가와 시장 데이터로 검증하세요.',
        type: 'normal',
      },
      {
        id: 'loss-aversion',
        heading: '2. 손실 회피 편향',
        body: '손실이 이득보다 2배 이상 강렬하게 느껴집니다. 명확한 손절 기준(예: -15% LTV 하락)을 사전에 설정하세요.',
        type: 'warning',
      },
      {
        id: 'overconfidence',
        heading: '3. 과신 편향',
        body: '경험이 쌓일수록 과신이 커집니다. 체크리스트 기반 실사와 AI 분석을 병행하여 객관성을 유지하세요.',
        type: 'tip',
      },
      {
        id: 'herding',
        heading: '4. 군집 행동',
        body: '인기 매물에 몰리는 현상입니다. 경쟁이 낮은 틈새 지역이나 자산 유형을 분석하는 역발상 전략을 고려하세요.',
        type: 'normal',
      },
      {
        id: 'overload',
        heading: '5. 정보 과부하',
        body: '너무 많은 정보가 결정을 마비시킵니다. 5~7개의 핵심 지표(LTV, 할인율, 선순위 설정금액, 예상 낙찰가율)로 집중하세요.',
        type: 'tip',
      },
    ],
    related: [
      { title: 'AI NPL 분석 가이드', href: '/guide/npl-analysis', category: '심화 학습' },
      { title: '경매 시뮬레이터 활용법', href: '/guide/auction-simulator', category: '도구' },
      { title: '거래 전체 프로세스', href: '/guide/deal-process', category: '기본' },
    ],
  },
  'npl-basics': {
    title: 'NPL 투자 입문 가이드',
    description: '부실채권(NPL)이란 무엇인지, 어떻게 투자하는지 기초부터 설명합니다.',
    time: '12분',
    difficulty: '쉬움',
    category: '기본',
    date: '2026.03.20',
    sections: [
      { id: 'what', heading: '1. NPL이란?', body: 'Non-Performing Loan의 약자로, 연체 90일 이상의 부실채권을 말합니다. 은행·금융기관이 원금 회수를 포기하고 할인 매각하는 채권입니다.', type: 'normal' },
      { id: 'why', heading: '2. 왜 투자하나?', body: '감정가 대비 30~60% 할인 매입이 가능하여, 공매·경매를 통해 정상 시세로 처분 시 높은 수익을 기대할 수 있습니다.', type: 'tip' },
      { id: 'risk', heading: '3. 주요 리스크', body: '선순위 채권 미확인, 점유자 명도 문제, 공법상 제한(건축법·용도지역) 등이 주요 리스크입니다. 사전 실사가 필수입니다.', type: 'warning' },
      { id: 'process', heading: '4. 투자 프로세스', body: '매물 탐색 → AI 분석 → 현장 조사 → 입찰가 산정 → 경매 참여 → 낙찰 후 명도 → 매각·임대로 수익 실현 순으로 진행됩니다.', type: 'normal' },
    ],
    related: [
      { title: '경매 시뮬레이터 활용법', href: '/guide/auction-simulator', category: '도구' },
      { title: 'AI NPL 분석 가이드', href: '/guide/npl-analysis', category: '심화' },
      { title: '거래 전체 프로세스', href: '/guide/deal-process', category: '기본' },
    ],
  },

  'getting-started': {
    title: '회원가입 & 시작하기',
    description: 'NPLatform에 가입하고 첫 매물을 탐색하기까지의 과정을 안내합니다.',
    time: '5분',
    difficulty: '쉬움',
    category: '기본',
    date: '2026.04.12',
    sections: [
      { id: 'signup', heading: '1. 회원가입', body: 'NPLatform 홈페이지에서 「무료로 시작하기」 버튼을 클릭하세요. 이메일 인증 후 기본 프로필(이름·역할·소속)을 입력하면 가입이 완료됩니다.\n\n역할은 투자자, 대부업체, 매도자(금융기관/AMC) 중 선택합니다. 역할에 따라 활성화되는 기능이 다릅니다.', type: 'normal' },
      { id: 'first-search', heading: '2. 첫 매물 탐색', body: '상단 「거래소」 메뉴 → 「매물 탐색」 탭을 클릭하세요. 카드 뷰에서 NPL 매물 목록이 표시됩니다.\n\n• 좌측 필터: 담보 유형(아파트/오피스텔/상가/토지), 지역, 기관 유형, 매각 방식\n• AI 등급(S/A/B/C), 할인율, 자료 완성도 필터도 사용 가능\n• 리스트 뷰 전환: 우측 상단 뷰 토글 버튼으로 카드/리스트를 전환합니다.', type: 'tip' },
      { id: 'detail', heading: '3. 매물 상세 확인', body: '매물 카드를 클릭하면 상세 페이지로 이동합니다. 채권 정보, 담보물 정보, 권리관계를 확인할 수 있으며, AI 등급과 분석 결과도 표시됩니다.\n\n더 자세한 정보(감정평가서, 등기부 등)는 본인인증(L1) 또는 NDA 체결(L2) 후 열람할 수 있습니다.', type: 'normal' },
      { id: 'next', heading: '4. 다음 단계', body: '관심 매물을 찾았다면 다음 기능을 활용하세요.\n\n• 「분석 > 경매 시뮬레이터」에서 수익률을 시뮬레이션\n• 「분석 > 시장 현황」의 AI 도구에서 NPL 수익성 분석 실행\n• 「거래소 > 입찰」에서 관심 매물에 입찰가 제출\n• 「딜룸 > AI 매칭」에서 AI가 추천하는 매물 확인', type: 'tip' },
    ],
    related: [
      { title: '플랫폼 둘러보기', href: '/guide/platform-tour', category: '기본' },
      { title: 'NPL 입문 가이드', href: '/guide/npl-basics', category: '기본' },
      { title: '투자자 가이드', href: '/guide/investor', category: '투자자' },
    ],
  },

  'deal-process': {
    title: '딜룸 거래 프로세스 가이드',
    description: '관심표명부터 계약 체결까지 딜룸 5단계를 상세히 안내합니다.',
    time: '12분',
    difficulty: '보통',
    category: '거래 프로세스',
    date: '2026.04.12',
    sections: [
      { id: 'overview', heading: '1. 딜룸이란?', body: '딜룸은 매도자와 매수자가 안전하게 거래를 진행하는 가상 공간입니다. 「딜룸 > 진행 중」 탭에서 현재 진행 중인 딜룸을 확인하고 관리합니다.\n\n매수자가 매물에 관심을 표명하면 딜룸이 자동 생성되며, 5단계(관심표명 → NDA → 실사 → 오퍼 → 계약)로 진행됩니다.', type: 'normal' },
      { id: 'step1', heading: '2. 1단계: 관심표명 (LOI)', body: '매물 상세 페이지에서 「관심표명」 버튼을 클릭합니다. 투자 의향서를 작성하면 매도자에게 전달되며, 매도자가 수락하면 다음 단계로 진행됩니다.\n\n이 단계에서는 L0(공개) 정보만 열람 가능합니다.', type: 'normal' },
      { id: 'step2', heading: '3. 2단계: NDA 체결', body: '매도자가 관심표명을 수락하면 비밀유지계약(NDA) 체결 단계로 넘어갑니다. 딜룸 내에서 전자서명으로 NDA를 체결하면 L2 등급 정보(채무자 정보, 상세 권리관계)가 공개됩니다.', type: 'tip' },
      { id: 'step3', heading: '4. 3단계: 실사 (Due Diligence)', body: 'NDA 체결 후 실사 자료를 열람합니다. 딜룸 내 문서함에서 감정평가서, 등기부등본, 권리분석서 등을 확인할 수 있습니다.\n\n「분석 > AI 실사 보고서」 탭에서 AI가 생성한 종합 실사 리포트도 활용하세요.', type: 'normal' },
      { id: 'step4', heading: '5. 4단계: 오퍼 교환', body: '실사가 완료되면 매수 오퍼를 제출합니다. 딜룸 내 메시지 기능으로 가격 협상을 진행하며, 매도자와 합의에 도달하면 최종 오퍼를 확정합니다.', type: 'normal' },
      { id: 'step5', heading: '6. 5단계: 계약 체결', body: '최종 오퍼가 수락되면 계약서를 작성합니다. 「분석 > 시장 현황」의 AI 도구에서 계약서 AI 검토, 계약서 생성 기능을 활용할 수 있습니다.\n\n에스크로(안전결제) 서비스를 이용하면 잔금 정산까지 안전하게 처리됩니다. 거래 완료 후 「딜룸 > 완료」 탭에서 거래 내역을 확인합니다.', type: 'tip' },
    ],
    related: [
      { title: '매도자 가이드', href: '/guide/seller', category: '매도자' },
      { title: '투자자 가이드', href: '/guide/investor', category: '투자자' },
      { title: '요금제 안내', href: '/pricing', category: '기본' },
    ],
  },

  'auction-simulator': {
    title: '경매 시뮬레이터 활용 가이드',
    description: '「분석 > 경매 시뮬레이터」에서 낙찰가·배당·수익률을 시뮬레이션하는 방법을 안내합니다.',
    time: '8분',
    difficulty: '보통',
    category: '분석 도구',
    date: '2026.04.12',
    sections: [
      { id: 'access', heading: '1. 메뉴 접근', body: '상단 「분석」 메뉴 → 「경매 시뮬레이터」 탭을 클릭합니다.', type: 'normal' },
      { id: 'input', heading: '2. 기본 정보 입력', body: '좌측 입력 패널에서 다음 항목을 입력합니다.\n\n• 감정가 — 법원 감정가 (원)\n• 최저매각가 — 경매 최저가 (보통 감정가의 80%)\n• 낙찰가율 — 예상 낙찰가율 (%) 슬라이더로 조정\n• 유찰 횟수 — 0~5회 선택 (유찰 시 20%씩 감소)\n• 담보물 유형 — 아파트/오피스텔/상가/토지 등 선택', type: 'normal' },
      { id: 'distribution', heading: '3. 배당 시뮬레이션', body: '선순위 채권, 임차보증금, 세금 등을 입력하면 배당 순위별 배당액을 자동 계산합니다. 배당표에서 각 채권자의 배당액과 미배당액을 확인할 수 있습니다.\n\n당해 채권(내 채권)의 배당액이 곧 예상 회수금입니다.', type: 'tip' },
      { id: 'tax', heading: '4. 세금 계산', body: '낙찰 시 발생하는 취득세, 등록세, 교육세, 농어촌특별세를 자동 계산합니다. 담보물 유형(주거용/비주거용)과 지역에 따라 세율이 다르게 적용됩니다.', type: 'normal' },
      { id: 'sensitivity', heading: '5. 민감도 분석', body: '낙찰가율 × 매입률(또는 다른 변수) 2차원 히트맵으로 수익률 변동을 한눈에 파악합니다. 초록색 영역은 수익, 빨간색 영역은 손실 구간입니다.', type: 'tip' },
      { id: 'monte', heading: '6. Monte Carlo 시뮬레이션', body: '낙찰가율·유찰횟수·소요기간을 변수로 10,000회 시뮬레이션합니다. 수익률 분포 히스토그램과 P10/P50/P90 수익률, 손실확률(%)을 확인할 수 있습니다.', type: 'normal' },
    ],
    related: [
      { title: 'NPL 수익성 분석', href: '/guide/profitability', category: '분석 도구' },
      { title: '실사 리포트 가이드', href: '/guide/due-diligence', category: '분석 도구' },
      { title: 'NPL 입문 가이드', href: '/guide/npl-basics', category: '기본' },
    ],
  },

  'due-diligence': {
    title: 'AI 실사 리포트 가이드',
    description: '「분석 > AI 실사 보고서」에서 AI가 생성하는 종합 실사 리포트를 활용하는 방법을 안내합니다.',
    time: '10분',
    difficulty: '보통',
    category: '분석 도구',
    date: '2026.04.12',
    sections: [
      { id: 'access', heading: '1. 메뉴 접근', body: '상단 「분석」 메뉴 → 「AI 실사 보고서」 탭을 클릭합니다. 분석이 완료된 매물 목록에서 원하는 매물을 선택하면 리포트를 확인할 수 있습니다.', type: 'normal' },
      { id: 'structure', heading: '2. 리포트 구성', body: 'AI 실사 리포트는 7개 섹션으로 구성됩니다.\n\n① 투자 의견 요약 — STRONG_BUY/BUY/HOLD/SELL/STOP 등급과 핵심 근거\n② 담보물 분석 — 소재지, 유형, 시세 동향, 입지 평가\n③ 법률 분석 — 권리관계, 선순위 채권, 점유 현황, 법적 리스크\n④ 재무 분석 — NPL 수익성(ROI/IRR), 시나리오, Monte Carlo\n⑤ 시장 분석 — 지역 시장 동향, 수급 현황, 가격 전망\n⑥ 리스크 종합 — 리스크 매트릭스(영향도×확률)\n⑦ AI 투자 의견 — 종합 평가와 투자 전략 제안', type: 'tip' },
      { id: 'grade', heading: '3. 투자 등급 이해', body: '리포트 상단에 표시되는 투자 등급은 다음을 의미합니다.\n\n• STRONG_BUY — 매우 우수한 투자 기회, 즉시 검토 권장\n• BUY — 양호한 투자 기회, 일부 리스크 존재\n• HOLD — 추가 분석 필요, 성급한 판단 자제\n• SELL — 리스크 대비 수익률 부족\n• STOP — 높은 리스크, 투자 비권장', type: 'normal' },
      { id: 'financial', heading: '4. 재무 분석 섹션 활용', body: '재무 분석 탭에서 NPL 수익성 분석 결과(순수익, ROI, IRR, 회수기간)와 BULL/BASE/BEAR 3개 시나리오 비교를 확인합니다. 더 상세한 분석이 필요하면 「분석 > 시장 현황」의 AI 도구에서 「NPL 수익성 분석」을 직접 실행하세요.', type: 'normal' },
      { id: 'pdf', heading: '5. PDF 다운로드', body: '리포트 상단의 「PDF 다운로드」 버튼을 클릭하면 전체 리포트를 PDF 파일로 저장할 수 있습니다. 내부 투자위원회 보고자료로 활용 가능합니다.', type: 'tip' },
    ],
    related: [
      { title: 'NPL 수익성 분석', href: '/guide/profitability', category: '분석 도구' },
      { title: '경매 시뮬레이터 가이드', href: '/guide/auction-simulator', category: '분석 도구' },
      { title: '투자자 가이드', href: '/guide/investor', category: '투자자' },
    ],
  },

  'listing-register': {
    title: '매물 등록 가이드',
    description: '「거래소 > 매물 등록」에서 6단계 위저드로 NPL 채권을 등록하는 방법을 안내합니다.',
    time: '10분',
    difficulty: '보통',
    category: '매물 관리',
    date: '2026.04.12',
    sections: [
      { id: 'access', heading: '1. 메뉴 접근', body: '상단 「거래소」 메뉴 → 「매물 등록」 탭을 클릭합니다. 6단계 등록 위저드가 시작됩니다.', type: 'normal' },
      { id: 'steps', heading: '2. 6단계 등록 위저드', body: '① 기관 유형·연락처 — 기관명, 담당자, 연락처 입력\n② 담보물 정보 — 소재지(주소 검색), 담보물 유형, 전용면적, 감정가, 감정일\n③ 채권 정보 — 채권잔액, 매각희망가, 할인율 (할인율은 자동 계산됨)\n④ 채권 상세·권리관계 — 약정금리, 연체금리, 연체시작일, 근저당순위, 임차인 정보\n⑤ 서류 업로드 — 감정평가서, 등기부등본, 권리분석서 등 첨부\n⑥ 최종 검토 — 입력 내용 확인 후 제출\n\n각 단계에서 필수 항목을 모두 입력해야 다음 단계로 넘어갈 수 있습니다.', type: 'tip' },
      { id: 'masking', heading: '3. 자동 마스킹', body: '매물 제출 시 자동 마스킹 파이프라인이 실행됩니다. 채무자 성명, 상세 지번, 동/호수 등 개인정보가 자동으로 가려집니다. 별도의 마스킹 작업이 필요 없습니다.\n\nDPO(개인정보보호책임자) 검수 후 L0(공개) 티어로 공개됩니다.', type: 'normal' },
      { id: 'bulk', heading: '4. 대량 등록', body: '수백 건의 매물을 일괄 등록하려면 「거래소 > 대량 등록」 탭을 이용하세요. 화면의 「샘플 CSV 다운로드」 버튼으로 템플릿을 받아 필수 필드를 채우고 업로드합니다.', type: 'tip' },
      { id: 'manage', heading: '5. 등록 후 관리', body: '등록한 매물은 「거래소 > 매물 탐색」에서 확인할 수 있습니다. 매수자가 관심을 표명하면 「딜룸 > 진행 중」에서 딜룸이 자동 생성됩니다.\n\n매물 수정·삭제는 매물 상세 페이지에서 가능합니다(거래 진행 중인 매물은 수정 불가).', type: 'normal' },
    ],
    related: [
      { title: '매도자 가이드', href: '/guide/seller', category: '매도자' },
      { title: '딜룸 거래 프로세스', href: '/guide/deal-process', category: '거래' },
      { title: '대부업체 가이드', href: '/guide/institution', category: '기관' },
    ],
  },

  'npl-analysis': {
    title: 'AI NPL 분석 가이드',
    description: 'NPLatform의 AI 분석 기능(등급 평가, 리스크 점수, 투자 의견)의 활용법을 안내합니다.',
    time: '10분',
    difficulty: '보통',
    category: '심화 학습',
    date: '2026.04.12',
    sections: [
      { id: 'overview', heading: '1. AI 분석 개요', body: 'NPLatform은 매물 등록 시 AI가 자동으로 투자 등급(A~E), 리스크 점수, 분석 의견을 생성합니다. 결정론적 계산(채권액·배당·수익률)과 AI 예측(낙찰가율·회수율)이 결합된 하이브리드 분석입니다.', type: 'normal' },
      { id: 'tools', heading: '2. AI 분석 도구 목록', body: '「분석 > 시장 현황」의 하단 AI 도구 바로가기에서 다음 도구를 사용할 수 있습니다.\n\n• NPL 수익성 분석 — ROI/IRR/배당표/시나리오 분석\n• AI Copilot — Claude 기반 대화형 투자 상담\n• 실사 리포트 — 담보·법률·재무·시장 종합 실사\n• 경매 시뮬레이터 — 낙찰가율·배당·Monte Carlo\n• OCR 문서인식 — 등기부등본·감정평가서 자동 추출\n• 계약서 AI 검토 — 조항별 위험도 분석\n• 계약서 생성 — 4종 템플릿 자동 생성', type: 'tip' },
      { id: 'grade', heading: '3. 투자 등급 해석', body: 'AI 투자 등급은 담보가치비율(LTV), 할인율, 권리관계 복잡도, 시장 유동성 등을 종합하여 산출됩니다.\n\n• A등급 — 우수 (할인율 높고, 권리관계 단순, 유동성 양호)\n• B등급 — 양호 (일부 리스크 존재하나 수익성 확보 가능)\n• C등급 — 보통 (추가 분석 필요)\n• D등급 — 주의 (리스크 요인 다수)\n• E등급 — 위험 (투자 비권장)', type: 'normal' },
      { id: 'copilot', heading: '4. AI Copilot 활용', body: '「분석 > 시장 현황」의 AI 도구에서 「AI Copilot」을 클릭하면 Claude 기반 AI와 대화하며 투자 전략을 상담할 수 있습니다.\n\n예시 질문:\n• "이 매물의 적정 매입가는?"\n• "강남 아파트 NPL 최근 낙찰가율 추세는?"\n• "선순위 채권이 3건인데 리스크는?"', type: 'tip' },
    ],
    related: [
      { title: 'NPL 수익성 분석', href: '/guide/profitability', category: '분석 도구' },
      { title: '실사 리포트 가이드', href: '/guide/due-diligence', category: '분석 도구' },
      { title: 'NPL 투자 심리 가이드', href: '/guide/psychology', category: '심화 학습' },
    ],
  },

  'platform-tour': {
    title: '플랫폼 둘러보기',
    description: 'NPLatform의 메뉴 구조와 핵심 기능을 한눈에 파악하는 빠른 투어 가이드입니다.',
    time: '5분',
    difficulty: '쉬움',
    category: '기본',
    date: '2026.04.12',
    sections: [
      { id: 'exchange', heading: '1. 거래소 메뉴', body: '상단 「거래소」 메뉴를 클릭하면 하위 탭이 표시됩니다.\n\n• 매물 탐색 — 카드/리스트 뷰로 NPL 매물을 검색하고, AI 등급(S/A/B/C)·할인율·자료 완성도로 필터링합니다.\n• 입찰 — 관심 매물에 입찰가를 제출합니다.\n• 매물 등록 — 6단계 위저드로 내 채권을 등록합니다. 제출 시 자동 마스킹이 적용됩니다.\n• 대량 등록 — Excel/CSV로 수백 건을 일괄 등록합니다.\n• 매수 수요 — 원하는 매물 조건을 등록하면 AI가 매칭해줍니다.', type: 'normal' },
      { id: 'deals', heading: '2. 딜룸 메뉴', body: '상단 「딜룸」 메뉴에서 딜룸을 관리합니다.\n\n• 진행 중 — 칸반/목록 뷰로 현재 거래를 관리합니다. 관심표명 → NDA → 실사 → 오퍼 → 계약 5단계로 진행됩니다.\n• 완료 — 종료된 거래의 수익률과 내역을 확인합니다.\n• AI 매칭 — AI가 내 투자 성향에 맞는 매물을 자동 추천합니다.\n• 팀 투자 — 공동투자 팀을 구성하고 포트폴리오를 함께 관리합니다.', type: 'tip' },
      { id: 'insights', heading: '3. 분석 메뉴', body: '상단 「분석」 메뉴에서 분석 도구를 사용합니다.\n\n• 분석 대시보드 — AI 분석 현황과 도구 바로가기를 확인합니다.\n• NPL 분석 — 개별 매물의 AI 분석 결과(등급·리스크·ROI)를 조회합니다.\n• NPL 가격지수 — NBI 주간 낙찰가율 지수와 시장 동향을 확인합니다.\n• AI Copilot — Claude 기반 AI와 대화하며 투자 전략을 상담합니다.\n• 경매 시뮬레이터 — 낙찰가율·유찰횟수·배당을 시뮬레이션합니다.\n• OCR 문서인식 — 등기부등본·감정평가서를 AI로 자동 추출합니다.\n• 실사 리포트 — 담보·법률·재무·시장 종합 실사 보고서를 생성합니다.', type: 'tip' },
      { id: 'my', heading: '4. 마이 페이지 메뉴', body: '상단 「마이 페이지」 메뉴에서 개인 설정을 관리합니다.\n\n• 대시보드 — 관심 매물, 진행 중인 거래, 알림을 한눈에 확인합니다.\n• 포트폴리오 — 관심 매물 목록과 투자 현황을 관리합니다.\n• 설정 — 프로필 수정, 보안(2FA), 결제 정보, 알림 설정을 변경합니다.', type: 'normal' },
    ],
    related: [
      { title: '회원가입 & 시작하기', href: '/guide/getting-started', category: '기본' },
      { title: 'NPL 입문 가이드', href: '/guide/npl-basics', category: '기본' },
      { title: '매도자 가이드', href: '/guide/seller', category: '매도자' },
    ],
  },

  'institution': {
    title: '대부업체 가이드',
    description: '금융기관·부동산 펀드 등 대부업체의 NPLatform 활용 방법을 안내합니다.',
    time: '10분',
    difficulty: '중요',
    category: '기관',
    date: '2026.04.10',
    sections: [
      { id: 'register', heading: '1. 기관 계정 등록', body: '회원가입 시 역할 선택에서 「대부업체」를 선택하세요. 담당자 이메일 인증 후 관리자 승인이 완료되면 기관 전용 기능(대량 등록, API 연동 등)이 활성화됩니다.', type: 'normal' },
      { id: 'bulk', heading: '2. 대량 매물 등록', body: '「거래소 > 대량 등록」 메뉴에서 Excel/CSV 템플릿을 다운로드하고, 채권잔액·매각희망가·감정가 등 필수 필드를 채워 업로드하세요. 수백 건의 매물을 일괄 등록할 수 있습니다.', type: 'tip' },
      { id: 'api', heading: '3. API 연동', body: '「마이 페이지 > 설정」에서 API 키를 발급받아 내부 시스템과 연동하세요. RESTful API로 매물 조회·등록·상태 변경이 가능하며, 웹훅으로 실시간 알림을 받을 수 있습니다. 자세한 문서는 「개발자 API」 페이지에서 확인하세요.', type: 'tip' },
      { id: 'reporting', heading: '4. 포트폴리오 리포팅', body: '「마이 페이지 > 포트폴리오」에서 보유 채권 전체 현황, 매각 성과, 수수료 정산 리포트를 확인할 수 있습니다. PDF 다운로드도 지원됩니다.', type: 'normal' },
    ],
    related: [
      { title: '대량 등록 가이드', href: '/guide/listing-register', category: '매물 관리' },
      { title: '파트너 추천 프로그램', href: '/guide/partner-referral', category: '파트너' },
      { title: '개발자 API', href: '/developer', category: '개발자' },
    ],
  },

  'seller': {
    title: '매도자 가이드',
    description: '금융기관·AMC의 NPL 매물 등록부터 딜룸 운영, 매각 완료까지 전체 프로세스를 안내합니다.',
    time: '12분',
    difficulty: '보통',
    category: '매도자',
    date: '2026.04.12',
    sections: [
      { id: 'register', heading: '1. 매물 등록 (거래소 > 매물 등록)', body: '상단 「거래소」 메뉴에서 「매물 등록」 탭을 클릭하면 6단계 위저드가 시작됩니다.\n\n① 기관 유형 · 연락처 → ② 담보물 정보(주소·유형·면적·감정가) → ③ 채권 정보(채권잔액·매각희망가·할인율) → ④ 채권 상세·권리관계(이자율·연체일·근저당·임차인) → ⑤ 서류 업로드(감정평가서·등기부·권리분석서) → ⑥ 최종 검토 후 제출.\n\n각 단계에서 필수 항목을 모두 입력해야 다음 단계로 넘어갈 수 있습니다.', type: 'normal' },
      { id: 'bulk', heading: '2. 대량 등록 (거래소 > 대량 등록)', body: '「거래소 > 대량 등록」 탭에서 Excel/CSV 파일로 수백 건의 매물을 일괄 등록할 수 있습니다. 화면의 「샘플 CSV 다운로드」 버튼으로 템플릿을 받아 채권잔액·매각희망가·감정가·담보유형 등 필수 필드를 채우세요.', type: 'tip' },
      { id: 'masking', heading: '3. 자동 마스킹 파이프라인', body: '매물 제출 시 자동 마스킹 파이프라인이 실행됩니다. 채무자 성명·상세 지번·동/호수가 자동으로 가려지며, DPO(개인정보보호책임자) 검수 후 L0(공개) 티어로 공개됩니다. 사용자가 별도로 마스킹 작업을 할 필요 없습니다.', type: 'normal' },
      { id: 'tier', heading: '4. 4단계 접근 통제 (L0~L3)', body: '매물 정보는 아래 4단계로 보호됩니다.\n\n• L0 공개 — 담보물 유형·지역·채권잔액·할인율 (누구나 열람)\n• L1 본인인증 — 감정평가서·등기부 요약 (본인인증 완료 시)\n• L2 NDA — 채무자 정보·상세 권리관계 (NDA 체결 + 전문투자자)\n• L3 LOI — 전체 원본 서류 (LOI 제출 + 매도자 승인)', type: 'tip' },
      { id: 'deal', heading: '5. 딜룸 운영 (딜룸 > 진행 중)', body: '매수자가 관심을 표명하면 「딜룸 > 진행 중」 탭에서 딜룸이 자동 생성됩니다. 관심표명 → NDA 체결 → 실사 → 오퍼 교환 → 계약 서명 5단계로 진행되며, 문서 공유와 메시지가 딜룸 내에서 모두 처리됩니다.', type: 'normal' },
      { id: 'fee', heading: '6. 수수료 구조', body: '매도·매수 각 0.9% 상한의 수수료가 적용됩니다. 기본 수수료율 0.3%에서 시작하며, 에스크로(안전결제) 이용 시 0.3%가 별도 부과됩니다. 수수료는 거래 완료(잔금 정산) 시 정산됩니다. 자세한 내용은 「요금제」 페이지를 확인하세요.', type: 'normal' },
    ],
    related: [
      { title: '대량 등록 가이드', href: '/guide/listing-register', category: '매물 관리' },
      { title: '딜룸 프로세스', href: '/guide/deal-process', category: '거래' },
      { title: '요금제 안내', href: '/pricing', category: '기본' },
    ],
  },

  'investor': {
    title: '투자자 가이드',
    description: 'NPL 매물 탐색부터 AI 분석, 수익성 예측, 입찰까지 투자자가 활용할 수 있는 모든 기능을 안내합니다.',
    time: '15분',
    difficulty: '보통',
    category: '투자자',
    date: '2026.04.12',
    sections: [
      { id: 'search', heading: '1. 매물 탐색 (거래소 > 매물 탐색)', body: '상단 「거래소」 메뉴의 「매물 탐색」 탭에서 카드/리스트 뷰로 매물을 탐색합니다.\n\n• 필터: 담보 유형, 지역, 기관 유형, 매각 방식, 자료 완성도\n• 정렬: 최신순, 할인율 높은순, 완성도 높은순, 채권잔액 큰순\n• AI 검색: 「AI」 버튼을 켜면 자연어로 검색 가능 (예: "강남 아파트 할인율 30% 이상")\n• 페이지 하단에서 페이지당 표시 개수(10/30/50/100)를 선택할 수 있습니다.', type: 'normal' },
      { id: 'analysis', heading: '2. AI 분석 (분석 > NPL 분석)', body: '「분석 > NPL 분석」 탭에서 개별 매물의 AI 분석 결과를 조회합니다.\n\n• 투자 등급 (A~E), 리스크 점수, AI 분석 의견\n• 「재무 분석」 탭: ROI/IRR, 시나리오(BULL/BASE/BEAR), Monte Carlo 결과, 배당표\n• 「AI 분석 실행」 버튼을 클릭하면 결정론적 계산이 즉시 수행됩니다.', type: 'tip' },
      { id: 'profitability', heading: '3. NPL 수익성 분석 (분석 > 분석 대시보드 > NPL 수익성 분석)', body: '「분석 > 분석 대시보드」의 AI 도구에서 「NPL 수익성 분석」을 클릭합니다.\n\n4단계 입력 위저드:\n① 채권 정보 — 채권기관·채무자·원금·이자율·연체시작일\n② 담보물 — 주소·유형·면적·감정가\n③ 권리관계 — 근저당 순위·설정액·선순위 채권·임차인\n④ 딜 조건 — 매입률·질권비율·경매 시나리오(낙찰가율·유찰횟수)\n\n결과: 순수익, ROI, IRR, 회수기간, 손익분기 낙찰가율, 배당표, BULL/BASE/BEAR 시나리오 비교', type: 'tip' },
      { id: 'simulator', heading: '4. 경매 시뮬레이터 (분석 > 경매 시뮬레이터)', body: '「분석 > 경매 시뮬레이터」 탭에서 감정가·최저매각가를 입력하고 낙찰가율·유찰횟수·배당 순위를 조정하며 다양한 시나리오를 시뮬레이션합니다. 세금 계산, 민감도 분석(히트맵), Monte Carlo 시뮬레이션이 포함됩니다.', type: 'normal' },
      { id: 'dd', heading: '5. 실사 리포트 (분석 > 실사 리포트)', body: '「분석 > 실사 리포트」 탭에서 AI가 생성한 종합 실사 보고서를 확인합니다.\n\n보고서 구성: 투자 의견(STRONG_BUY~STOP) → 담보물 분석 → 법률 분석 → 재무 분석(NPL 수익성 포함) → 시장 분석 → 리스크 종합 → AI 투자 의견\n\nPDF 다운로드도 지원됩니다.', type: 'normal' },
      { id: 'bid', heading: '6. 입찰 & 딜룸 (거래소 > 입찰 / 딜룸 > 진행 중)', body: '분석이 완료되면 「거래소 > 입찰」 탭에서 매물 상세 페이지의 입찰 버튼을 클릭하여 입찰합니다. 「딜룸 > AI 매칭」 탭에서 내 투자 성향에 맞는 매물을 AI가 자동 추천해주기도 합니다. 입찰 후 「딜룸 > 진행 중」에서 딜룸이 자동 생성됩니다.', type: 'normal' },
    ],
    related: [
      { title: 'NPL 입문 가이드', href: '/guide/npl-basics', category: '기본' },
      { title: '경매 시뮬레이터 가이드', href: '/guide/auction-simulator', category: '도구' },
      { title: '실사 리포트 가이드', href: '/guide/due-diligence', category: '분석' },
    ],
  },

  'profitability': {
    title: 'NPL 수익성 분석 가이드',
    description: '분석 > 분석 대시보드 > NPL 수익성 분석 도구의 사용법을 안내합니다.',
    time: '10분',
    difficulty: '보통',
    category: '분석 도구',
    date: '2026.04.12',
    sections: [
      { id: 'access', heading: '1. 메뉴 접근 방법', body: '상단 「분석」 메뉴 → 「분석 대시보드」 탭 → 하단 AI 도구 바로가기에서 「NPL 수익성 분석」 카드를 클릭합니다. 또는 「분석 > NPL 분석」에서 개별 매물의 「재무 분석」 탭에서도 수익성 분석 결과를 확인할 수 있습니다.', type: 'normal' },
      { id: 'input', heading: '2. 4단계 데이터 입력', body: '위저드 형태로 4단계에 걸쳐 데이터를 입력합니다.\n\n① 채권 정보 — 채권기관명, 채무자명, 대출원금, 잔여원금, 약정금리, 연체금리, 연체시작일\n② 담보물 — 소재지, 담보물 유형(아파트/오피스텔/상가/토지 등), 전용면적, 감정가, 감정일\n③ 권리관계 — 근저당 순위·설정액, 선순위 채권(유형·금액), 임차인(보증금·대항력)\n④ 딜 조건 — 매입률(%), 질권비율(%), 질권이자율(%), 경매 시나리오(예상 낙찰가율·유찰횟수·소요기간)', type: 'normal' },
      { id: 'bond', heading: '3. 채권액 자동 산출', body: '잔여원금에 약정이자(원금 × 약정금리 × 기간)와 지연손해금(원금 × 연체금리 × 연체기간)을 자동 계산하여 총 채권액을 산출합니다. 연체시작일부터 분석 실행일까지의 기간이 반영됩니다.', type: 'normal' },
      { id: 'distribution', heading: '4. 배당표 시뮬레이션', body: '경매 낙찰가에서 집행비용 → 세금(국세·지방세) → 선순위 근저당 → 임차보증금 → 당해 채권 순으로 배당을 시뮬레이션합니다. 결과 화면에서 각 순위별 채권자, 채권액, 배당액, 회수율을 테이블로 확인할 수 있습니다.', type: 'tip' },
      { id: 'roi', heading: '5. 수익률 분석 결과', body: '분석 결과 페이지에서 다음 KPI를 확인합니다.\n\n• 순수익 — 회수금에서 총투입비용을 뺀 금액\n• ROI — 자기자본 대비 투자수익률(%)\n• IRR — 월별 현금흐름 기반 내부수익률(%)\n• 회수기간 — 투자금 회수까지 예상 개월 수\n• 손익분기 낙찰가율 — 수익이 0이 되는 최소 낙찰가율(%)\n\nBULL(낙찰가율 +10%) / BASE(기본) / BEAR(낙찰가율 -10%) 3개 시나리오로 비교됩니다.', type: 'tip' },
      { id: 'monte', heading: '6. Monte Carlo 시뮬레이션', body: '낙찰가율(±15%)·유찰횟수(0~3회)·소요기간(±3개월)을 변수로 10,000회 시뮬레이션합니다. 결과에서 P10(하위 10%)/P50(중앙값)/P90(상위 10%) 수익률과 손실확률(%)을 확인할 수 있습니다.', type: 'normal' },
    ],
    related: [
      { title: '경매 시뮬레이터 가이드', href: '/guide/auction-simulator', category: '도구' },
      { title: '실사 리포트 가이드', href: '/guide/due-diligence', category: '분석' },
      { title: '투자자 가이드', href: '/guide/investor', category: '투자자' },
    ],
  },

  'partner-referral': {
    title: '파트너 추천 프로그램 가이드',
    description: '추천코드로 수익을 창출하는 방법과 정산 구조를 안내합니다.',
    time: '8분',
    difficulty: '쉬움',
    category: '파트너',
    date: '2026.03.15',
    sections: [
      {
        id: 'register',
        heading: '1. 파트너 등록',
        body: '하단 푸터의 「파트너 신청」 링크를 클릭하여 신청서를 작성하세요. 승인 후 고유 추천코드가 발급됩니다.',
        type: 'normal',
      },
      {
        id: 'share',
        heading: '2. 추천코드 공유',
        body: '블로그, SNS, 카카오톡 등 어디서든 추천코드를 공유하세요. 코드를 통해 가입한 사용자가 첫 구독 시 수익이 발생합니다.',
        type: 'tip',
      },
      {
        id: 'revenue',
        heading: '3. 수익 구조',
        body: '추천 가입 → 구독 전환 시 구독료의 20%를 지급합니다. 월별 정산으로 계좌 입금됩니다.',
        type: 'normal',
      },
      {
        id: 'leaderboard',
        heading: '4. 리더보드 & 보너스',
        body: '월간 추천 순위 상위 10명에게 추가 보너스를 지급합니다. 「마이 페이지 > 포트폴리오」에서 파트너 실적과 순위를 확인하세요.',
        type: 'tip',
      },
    ],
    related: [
      { title: '요금제 안내', href: '/pricing', category: '기본' },
      { title: '매도자 가이드', href: '/guide/seller', category: '매도자' },
      { title: '서비스 가이드 허브', href: '/guide', category: '기본' },
    ],
  },
}

interface Props {
  params: Promise<{ topic: string }>
}

export default function GuideTopicPage({ params }: Props) {
  const { topic } = use(params)
  const content = GUIDE_CONTENT[topic]
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  if (!content) notFound()

  const difficultyColor: Record<string, string> = {
    '쉬움': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    '보통': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    '중요': 'bg-red-500/10 text-red-400 border border-red-500/20',
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className={`flex items-center gap-2 ${DS.text.caption} mb-6`}>
            <Link href="/guide" className="hover:text-[var(--color-text-primary)] transition-colors">가이드</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--color-text-primary)]">{content.category}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`text-[0.75rem] font-semibold px-2.5 py-1 rounded-full ${difficultyColor[content.difficulty] ?? 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]'}`}>
              {content.difficulty}
            </span>
            <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>{content.category}</span>
          </div>
          <h1 className={DS.text.pageTitle}>{content.title}</h1>
          <p className={`${DS.text.body} mt-2 max-w-2xl`}>{content.description}</p>
          <div className={`flex flex-wrap items-center gap-5 mt-5 ${DS.text.caption}`}>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{content.time} 소요</span>
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{content.sections.length}개 섹션</span>
            <span className="flex items-center gap-1.5">최종 수정: {content.date}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex gap-10">
          {/* Sidebar TOC -- sticky */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className={`sticky top-6 ${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.label} mb-3`}>목차</p>
              <ul className="space-y-1">
                {content.sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`block ${DS.text.caption} py-1 pl-2 border-l-2 border-transparent hover:border-[var(--color-brand-mid)] hover:text-[var(--color-text-primary)] transition-colors`}
                    >
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main article */}
          <div className="flex-1 min-w-0">
            <div className="max-w-3xl mx-auto space-y-6">
              {content.sections.map((section) => {
                if (section.type === 'tip') {
                  return (
                    <div key={section.id} id={section.id} className="bg-blue-500/10 border-l-4 border-[var(--color-brand-mid)] p-4 rounded-r-xl">
                      <h2 className={`${DS.text.cardSubtitle} mb-2`}>{section.heading}</h2>
                      <p className="text-[0.8125rem] text-blue-300 leading-relaxed">{section.body}</p>
                    </div>
                  )
                }
                if (section.type === 'warning') {
                  return (
                    <div key={section.id} id={section.id} className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl">
                      <h2 className={`${DS.text.cardSubtitle} text-amber-400 mb-2`}>{section.heading}</h2>
                      <p className="text-[0.8125rem] text-amber-400/80 leading-relaxed">{section.body}</p>
                    </div>
                  )
                }
                return (
                  <div key={section.id} id={section.id} className={`${DS.card.base} ${DS.card.padding}`}>
                    <h2 className={`${DS.text.cardTitle} mb-3`}>{section.heading}</h2>
                    <p className={DS.text.body}>{section.body}</p>
                  </div>
                )
              })}

              {/* Feedback */}
              <div className={`${DS.card.base} ${DS.card.padding} text-center`}>
                <p className={`${DS.text.cardTitle} mb-4`}>도움이 되었나요?</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setFeedback('up')}
                    className={`${DS.button.secondary} ${feedback === 'up' ? '!bg-[var(--color-brand-dark)] !text-white !border-[var(--color-brand-dark)]' : ''}`}
                  >
                    <ThumbsUp className="w-4 h-4" /> 도움됐어요
                  </button>
                  <button
                    onClick={() => setFeedback('down')}
                    className={`${DS.button.secondary} ${feedback === 'down' ? '!bg-red-500/10 !text-red-400 !border-red-500/20' : ''}`}
                  >
                    <ThumbsDown className="w-4 h-4" /> 아쉬워요
                  </button>
                </div>
                {feedback && (
                  <p className={`mt-3 ${DS.text.captionLight}`}>
                    {feedback === 'up' ? '소중한 피드백 감사합니다.' : '더 나은 콘텐츠를 만들겠습니다.'}
                  </p>
                )}
              </div>

              {/* Related guides */}
              <div>
                <p className={`${DS.text.cardTitle} mb-4`}>관련 가이드</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {content.related.map((rel) => (
                    <Link key={rel.href} href={rel.href} className={`${DS.card.interactive} ${DS.card.padding} group`}>
                      <span className={`${DS.text.label} text-[var(--color-brand-mid)] mb-2 block`}>{rel.category}</span>
                      <p className={`${DS.text.bodyBold} group-hover:text-[var(--color-brand-mid)] leading-snug transition-colors`}>{rel.title}</p>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-mid)] mt-2 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer nav */}
            <div className={`max-w-3xl mx-auto mt-10 pt-6 ${DS.divider.default} flex items-center justify-between`}>
              <Link href="/guide" className={`flex items-center gap-2 ${DS.text.caption} hover:text-[var(--color-text-primary)] transition-colors`}>
                <ArrowLeft className="w-4 h-4" /> 가이드 허브
              </Link>
              <Link href="/support" className={`flex items-center gap-1.5 ${DS.text.link}`}>
                <MessageSquare className="w-4 h-4" /> 문의하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
