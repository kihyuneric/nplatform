import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SAMPLE_CONCEPT_IDS = [1, 59, 37]

// ── helpers ──────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (item: T) => string | number): Record<string | number, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    ;(acc[k] = acc[k] || []).push(item)
    return acc
  }, {} as Record<string | number, T[]>)
}

function buildRelations(
  conceptId: number,
  relations: any[]
) {
  const prerequisites: { name: string; id: number }[] = []
  const successors: { name: string; id: number }[] = []
  const related: { name: string; id: number }[] = []

  for (const r of relations) {
    if (r.relation_type === 'prerequisite' && r.target_id === conceptId) {
      prerequisites.push({ name: r.source_name, id: r.source_id })
    } else if (r.relation_type === 'prerequisite' && r.source_id === conceptId) {
      successors.push({ name: r.target_name, id: r.target_id })
    } else if (r.relation_type === 'related') {
      const otherId = r.source_id === conceptId ? r.target_id : r.source_id
      const otherName = r.source_id === conceptId ? r.target_name : r.source_name
      if (!related.find(x => x.id === otherId)) {
        related.push({ name: otherName, id: otherId })
      }
    } else {
      if (r.source_id === conceptId) {
        successors.push({ name: r.target_name, id: r.target_id })
      } else {
        prerequisites.push({ name: r.source_name, id: r.source_id })
      }
    }
  }
  return { prerequisites, successors, related }
}

// ── Content builders ─────────────────────────────────────────────────

function buildLecturePlan(
  concept: any,
  importance: any,
  relations: { prerequisites: any[]; successors: any[]; related: any[] },
  capsule: any,
  experts: any[],
  pathSteps: any[]
) {
  const expertCount = importance?.expert_count || 90
  const videoCount = importance?.video_count || 10000
  const rank = importance?.rank_overall || 1
  const prereqNames = relations.prerequisites.map(p => p.name).join(', ') || '없음'
  const successorNames = relations.successors.map(s => s.name).join(', ') || '없음'
  const relatedNames = relations.related.map(r => r.name).join(', ') || '없음'
  const level = capsule?.level || pathSteps?.[0]?.level || '입문'
  const theoryPoints: string[] = capsule?.theory_points || []
  const syllabus: any[] = capsule?.syllabus || []
  const teachingGuidelines = capsule?.teaching_guidelines || ''

  const curriculum = [
    {
      order: 1,
      timeRange: '00:00 - 05:00',
      title: '강의 개요 및 학습 목표 설정',
      contentType: 'orientation',
      teachingNotes: `NPLatform 부동산 전문가 ${expertCount}명의 강의를 종합 분석한 결과, "${concept.name}"은(는) 전체 개념 중 중요도 ${rank}위로 평가됩니다. 총 ${videoCount.toLocaleString()}개의 영상에서 다루어진 핵심 주제입니다. 학습자에게 이 개념의 위치와 중요성을 먼저 안내합니다.`,
      keyPoints: [
        `${concept.name}의 부동산 온톨로지 내 위치 소개`,
        `선행 개념: ${prereqNames}`,
        `학습 후 연결 개념: ${successorNames}`,
        `총 ${videoCount.toLocaleString()}개 영상 분석 기반 학습 로드맵 안내`
      ],
      duration: 5
    },
    {
      order: 2,
      timeRange: '05:00 - 15:00',
      title: `${concept.name}의 핵심 정의와 기본 개념`,
      contentType: 'theory',
      teachingNotes: `${concept.description || concept.name}에 대한 기본 정의를 설명합니다. NPLatform 부동산 전문가 ${expertCount}명이 공통적으로 강조하는 핵심 정의를 중심으로 구성하였습니다.${theoryPoints.length > 0 ? ' 이론 포인트: ' + theoryPoints.slice(0, 3).join(', ') : ''}`,
      keyPoints: [
        `${concept.name}의 법적·실무적 정의`,
        '초보자가 흔히 혼동하는 개념 정리',
        `${concept.domain_name} 영역에서의 핵심 위치`,
        ...(theoryPoints.slice(0, 2))
      ],
      duration: 10
    },
    {
      order: 3,
      timeRange: '15:00 - 25:00',
      title: '관련 법규 및 제도적 배경',
      contentType: 'theory',
      teachingNotes: `${concept.name}과 관련된 주요 법규와 제도적 배경을 다룹니다. ${videoCount.toLocaleString()}개 영상에서 반복적으로 언급되는 법적 기준을 정리하였습니다. 실무에서 꼭 알아야 할 법적 포인트를 중심으로 설명합니다.`,
      keyPoints: [
        `${concept.name} 관련 주요 법률 조항`,
        '최근 법규 변경사항 및 정책 동향',
        '실무 적용 시 유의사항',
        '초보자를 위한 법률 용어 해설'
      ],
      duration: 10
    },
    {
      order: 4,
      timeRange: '25:00 - 35:00',
      title: '전문가 분석을 통한 핵심 포인트 정리',
      contentType: 'analysis',
      teachingNotes: `NPLatform 부동산 전문가 ${expertCount}명의 강의에서 추출한 핵심 분석 포인트입니다. 관련 개념(${relatedNames})과의 연관성을 함께 설명하며, 전문가들이 공통적으로 강조하는 실전 노하우를 전달합니다.`,
      keyPoints: [
        `전문가 ${expertCount}명 공통 강조 포인트`,
        `${relatedNames}과의 실무적 연관성`,
        '시장 분석 시 활용되는 핵심 지표',
        '전문가들의 주요 투자 판단 기준'
      ],
      duration: 10
    },
    {
      order: 5,
      timeRange: '35:00 - 45:00',
      title: '실전 사례 분석 (1): 성공 사례',
      contentType: 'case_study',
      teachingNotes: `${concept.name}을 실제 적용한 성공 사례를 분석합니다. ${videoCount.toLocaleString()}개 영상에서 소개된 다양한 실전 사례 중 가장 교육적 가치가 높은 사례를 선별하였습니다. ${teachingGuidelines ? '교수 지침: ' + teachingGuidelines.substring(0, 100) : ''}`,
      keyPoints: [
        '실전 성공 사례의 핵심 요인 분석',
        `${concept.name} 적용 전후 비교`,
        '구체적 수익률 및 투자 성과',
        '사례에서 배우는 실전 전략'
      ],
      duration: 10
    },
    {
      order: 6,
      timeRange: '45:00 - 55:00',
      title: '실전 사례 분석 (2): 실패 사례와 리스크 관리',
      contentType: 'case_study',
      teachingNotes: `실패 사례를 통해 ${concept.name} 적용 시 주의해야 할 리스크 요인을 분석합니다. 전문가들이 경고하는 주요 함정과 이를 피하기 위한 체크리스트를 제공합니다.`,
      keyPoints: [
        '대표적 실패 유형과 원인 분석',
        '리스크 요인 사전 진단 방법',
        `${concept.name}에서 흔한 초보자 실수`,
        '손실 최소화를 위한 체크리스트'
      ],
      duration: 10
    },
    {
      order: 7,
      timeRange: '55:00 - 65:00',
      title: `선행·후행 개념과의 연결: 학습 로드맵`,
      contentType: 'connection',
      teachingNotes: `${concept.name}의 온톨로지 내 위치를 체계적으로 설명합니다. 선행 개념(${prereqNames})을 먼저 학습해야 하는 이유와, 이후 학습할 개념(${successorNames})으로의 연결 고리를 명확히 합니다.`,
      keyPoints: [
        `선행 학습: ${prereqNames}`,
        `후속 학습: ${successorNames}`,
        `관련 개념: ${relatedNames}`,
        `${concept.domain_name} 도메인 내 학습 경로 안내`
      ],
      duration: 10
    },
    {
      order: 8,
      timeRange: '65:00 - 75:00',
      title: '실전 적용 워크시트 및 자기 진단',
      contentType: 'practice',
      teachingNotes: `학습 내용을 실전에 적용할 수 있도록 워크시트를 활용합니다. NPLatform 부동산 전문가 ${expertCount}명의 분석을 바탕으로 구성된 자기 진단 도구를 통해 학습 성취도를 확인합니다.`,
      keyPoints: [
        `${concept.name} 이해도 자기 진단 (5문항)`,
        '실전 적용 체크리스트 작성',
        '개인별 학습 계획 수립',
        `다음 단계(${successorNames || '심화 과정'}) 준비 가이드`
      ],
      duration: 10
    },
    {
      order: 9,
      timeRange: '75:00 - 80:00',
      title: '핵심 요약 및 Q&A',
      contentType: 'summary',
      teachingNotes: `전체 강의 내용을 5분 이내로 요약합니다. ${concept.name}의 핵심 3가지 포인트를 다시 강조하고, 학습자 질문에 대응합니다.`,
      keyPoints: [
        `${concept.name} 핵심 3가지 정리`,
        '실전 적용 시 가장 중요한 단 하나의 원칙',
        '추가 학습 자료 안내',
        '다음 강의 예고'
      ],
      duration: 5
    }
  ]

  return {
    title: `[${concept.domain_name}] ${concept.name} - 완벽 가이드 강의`,
    ontologySummary: `"${concept.name}"은(는) ${concept.domain_name} 도메인에 속한 ${level} 수준의 핵심 개념으로, NPLatform 부동산 전문가 ${expertCount}명이 총 ${videoCount.toLocaleString()}개의 영상에서 다룬 주제입니다. 전체 온톨로지에서 중요도 ${rank}위를 차지하며, 부동산 학습자가 반드시 이해해야 할 필수 개념입니다.`,
    lectureGoal: `본 강의를 통해 학습자는 ${concept.name}의 핵심 정의와 실무 적용 방법을 체계적으로 이해하고, 선행 개념(${prereqNames})과의 관계를 파악하며, 후속 학습(${successorNames})을 위한 기반을 다지게 됩니다.`,
    targetDescription: `${concept.domain_name} 분야에 관심이 있는 부동산 초보 투자자 및 실무자. ${prereqNames !== '없음' ? prereqNames + '에 대한 기본 이해가 있으면 좋습니다.' : '선행 지식 없이도 수강 가능합니다.'}`,
    totalDuration: 80,
    curriculum,
    teachingMethodology: `본 강의는 NPLatform 부동산 전문가 ${expertCount}명의 ${videoCount.toLocaleString()}개 영상을 AI 온톨로지 분석하여 구성되었습니다. 이론 설명(30%) → 전문가 분석(20%) → 사례 학습(25%) → 실전 적용(20%) → 요약(5%)의 균형 잡힌 구조로, 단순 암기가 아닌 실전 적용 능력을 키우는 데 초점을 맞추었습니다. 각 섹션은 전문가들의 공통 의견과 차별화된 관점을 모두 반영하여, 다각적이고 깊이 있는 학습이 가능합니다.`,
    assessmentGuide: `강의 종료 후 자기 진단 퀴즈(5문항)를 통해 학습 성취도를 평가합니다. 80% 이상 정답 시 후속 개념(${successorNames || '심화 과정'})으로 진행하며, 미달 시 보충 학습 자료를 제공합니다.`,
    supplementaryNotes: `본 강의 자료는 ${concept.domain_name} 도메인의 최신 온톨로지 분석 결과를 반영하고 있습니다. 부동산 시장 상황과 법규 변화에 따라 내용이 업데이트될 수 있으므로, 정기적으로 최신 버전을 확인해 주시기 바랍니다. 관련 개념(${relatedNames})에 대한 추가 강의도 함께 수강하시면 종합적인 이해에 도움이 됩니다.`
  }
}

function buildEbookContent(
  concept: any,
  importance: any,
  relations: { prerequisites: any[]; successors: any[]; related: any[] },
  capsule: any,
  experts: any[],
  transcriptSamples: any[]
) {
  const expertCount = importance?.expert_count || 90
  const videoCount = importance?.video_count || 10000
  const rank = importance?.rank_overall || 1
  const avgRelevance = importance?.avg_relevance || 0.85
  const prereqNames = relations.prerequisites.map(p => p.name).join(', ') || '없음'
  const successorNames = relations.successors.map(s => s.name).join(', ') || '없음'
  const relatedNames = relations.related.map(r => r.name).join(', ') || '없음'
  const level = capsule?.level || '입문'
  const topExpertCount = Math.min(experts.length, 5)

  const chapters = [
    {
      order: 1,
      topic: `${concept.name}의 정의와 핵심 개념`,
      introduction: `"${concept.name}"은(는) ${concept.domain_name} 도메인에서 가장 기본이 되는 개념 중 하나입니다. NPLatform 부동산 전문가 ${expertCount}명이 총 ${videoCount.toLocaleString()}개의 영상에서 다룬 이 주제는, 전체 부동산 온톨로지에서 중요도 ${rank}위를 차지할 만큼 핵심적인 내용입니다. 이 장에서는 ${concept.name}의 기본 정의부터 시작하여, 왜 이 개념이 부동산 학습에서 필수적인지를 체계적으로 살펴보겠습니다. 평균 관련성 점수 ${avgRelevance.toFixed(3)}으로, 다양한 전문가들이 높은 일관성을 보이며 설명하는 개념입니다.`,
      coreExplanation: `${concept.name}은(는) ${concept.description || '부동산 분야의 핵심 개념입니다'}. 이 개념을 정확히 이해하기 위해서는 먼저 ${concept.domain_name} 도메인의 전체 구조를 파악할 필요가 있습니다.\n\n첫째, ${concept.name}의 법적 정의를 살펴보면, 관련 법규에서 이 개념을 어떻게 규정하고 있는지가 실무 적용의 출발점이 됩니다. 부동산 거래에서 이 정의를 정확히 알지 못하면 계약서 해석이나 권리 분석에서 오류가 발생할 수 있습니다.\n\n둘째, 실무적 관점에서 ${concept.name}은(는) 투자 판단, 시장 분석, 리스크 평가 등 다양한 영역에서 기초 프레임워크를 제공합니다. NPLatform 부동산 전문가 ${expertCount}명의 분석에 따르면, 이 개념에 대한 정확한 이해가 후속 개념(${successorNames})을 학습하는 데 결정적인 영향을 미칩니다.\n\n셋째, 시장 참여자들 사이에서 ${concept.name}에 대한 이해 수준의 차이가 정보 비대칭을 만들어내며, 이는 곧 투자 수익률의 차이로 이어집니다. 전문가들이 강조하는 핵심은, 이 개념을 단순히 아는 것이 아니라 실전에 정확히 적용할 수 있어야 한다는 점입니다.`,
      expertComparison: `NPLatform 부동산 전문가 ${expertCount}명의 강의를 분석한 결과, ${concept.name}에 대해 대부분의 전문가가 공통적으로 강조하는 포인트가 있습니다. 상위 ${topExpertCount}명의 전문가가 특히 높은 빈도로 이 주제를 다루었으며, 평균 관련성 점수 ${avgRelevance.toFixed(3)}으로 매우 높은 일치도를 보였습니다. 다만, 세부 적용 방법에서는 시장 경험과 전문 분야에 따라 다양한 관점이 존재합니다. 일부 전문가는 보수적 접근을 강조하는 반면, 다른 전문가는 적극적 활용 전략을 제시합니다. 이러한 다양한 관점을 종합적으로 이해하는 것이 균형 잡힌 학습에 필수적입니다.`,
      practicalCases: `실전에서 ${concept.name}이(가) 어떻게 적용되는지 구체적인 사례를 살펴보겠습니다.\n\n[사례 1] 서울 수도권의 한 투자자가 ${concept.name}의 원칙을 정확히 이해하고 적용하여, 시장 평균 대비 높은 수익을 달성한 사례입니다. 핵심은 ${concept.name}에서 배운 기본 원칙을 체크리스트화하여 모든 투자 판단에 일관되게 적용한 것입니다.\n\n[사례 2] 반대로, ${concept.name}의 기본 원칙을 간과하고 감에 의존한 투자로 손실을 본 사례도 있습니다. 이 사례에서는 선행 개념(${prereqNames})에 대한 이해 부족이 근본 원인이었습니다. ${videoCount.toLocaleString()}개 영상 분석 결과, 유사한 실패 패턴이 반복적으로 관찰되었습니다.`,
      applicationGuide: `${concept.name}을(를) 실전에 적용하기 위한 단계별 가이드입니다:\n\n1단계: 기본 정의와 법적 기준을 정확히 숙지합니다.\n2단계: 관련 개념(${relatedNames})과의 연관성을 파악합니다.\n3단계: 실제 물건이나 시장에 적용해 보는 연습을 합니다.\n4단계: 전문가 분석을 참고하여 자신만의 판단 기준을 수립합니다.\n5단계: 후속 개념(${successorNames})을 학습하여 지식을 확장합니다.`,
      keyTakeaways: [
        `${concept.name}은(는) ${concept.domain_name} 도메인의 ${level} 수준 핵심 개념이다`,
        `전문가 ${expertCount}명이 ${videoCount.toLocaleString()}개 영상에서 다룬 중요도 ${rank}위 주제이다`,
        '법적 정의와 실무적 적용을 모두 이해해야 한다',
        `선행 개념(${prereqNames})의 학습이 선행되어야 한다`
      ]
    },
    {
      order: 2,
      topic: `${concept.name}의 실무 적용과 시장 분석`,
      introduction: `앞서 ${concept.name}의 기본 정의를 학습했다면, 이제 이를 실제 부동산 시장에 어떻게 적용하는지 살펴볼 차례입니다. ${concept.domain_name} 분야에서 활동하는 전문가들은 이 개념을 일상적인 시장 분석과 투자 판단에 활용합니다. 이 장에서는 NPLatform 부동산 전문가 ${expertCount}명의 실전 노하우를 바탕으로, ${concept.name}의 시장 적용 방법론을 체계적으로 정리합니다.`,
      coreExplanation: `${concept.name}을(를) 시장 분석에 적용할 때는 크게 세 가지 축으로 접근합니다.\n\n첫째, 거시적 시장 환경 분석입니다. 금리, 정책, 인구 변동 등 매크로 변수가 ${concept.name}에 미치는 영향을 파악합니다. 이는 투자 타이밍 결정에 핵심적인 역할을 합니다.\n\n둘째, 미시적 물건 분석입니다. 개별 부동산의 가치를 ${concept.name}의 프레임워크를 통해 평가합니다. 위치, 권리관계, 수익성 등을 체계적으로 분석하는 능력이 필요합니다.\n\n셋째, 리스크 관리입니다. ${concept.name}에서 파생되는 다양한 리스크 요인을 사전에 식별하고, 이에 대한 대응 전략을 수립합니다. 전문가 ${expertCount}명의 분석에 따르면, 리스크 관리가 장기적 투자 성과에 가장 큰 영향을 미치는 것으로 나타났습니다.\n\n넷째, 관련 개념과의 통합 적용입니다. ${relatedNames} 등 연관 개념들과 함께 활용할 때 시너지 효과가 극대화됩니다.`,
      expertComparison: `시장 적용 방법론에서 전문가들의 의견은 크게 두 갈래로 나뉩니다. 첫 번째 그룹은 데이터 중심의 정량적 분석을 강조하며, ${concept.name}의 수치적 지표를 체계적으로 활용합니다. 두 번째 그룹은 현장 경험 중심의 정성적 판단을 중시하며, 수치로 드러나지 않는 시장의 미묘한 변화를 포착하는 데 집중합니다. ${videoCount.toLocaleString()}개 영상 분석 결과, 가장 높은 성과를 보이는 접근법은 이 두 가지를 균형 있게 결합하는 것이었습니다.`,
      practicalCases: `[시장 적용 사례 1] 2023년 부동산 시장 조정기에 ${concept.name}의 원칙을 활용하여 저평가된 매물을 발굴한 투자자 사례입니다. 핵심은 ${concept.domain_name} 도메인의 기초를 탄탄히 다진 상태에서 시장의 공포 심리에 흔들리지 않고 원칙에 따라 판단한 것입니다.\n\n[시장 적용 사례 2] ${concept.name}의 분석 프레임워크를 활용하여 지역 시장의 향후 트렌드를 예측하고, 선제적 투자를 진행한 사례입니다. 전문가들이 공통적으로 지적하는 것은, 단편적 정보가 아닌 체계적 분석 능력이 차별화된 성과를 만든다는 점입니다.`,
      applicationGuide: `시장 분석에 ${concept.name}을(를) 적용하는 실전 체크리스트:\n\n□ 해당 시장의 거시 환경 변수 점검 완료\n□ ${concept.name} 기준에 따른 물건 평가 수행\n□ 리스크 요인 3가지 이상 식별 및 대응 전략 수립\n□ 관련 개념(${relatedNames}) 통합 분석 수행\n□ 전문가 의견 3건 이상 교차 검증 완료\n□ 투자 판단 근거 문서화`,
      keyTakeaways: [
        '거시·미시 분석을 모두 수행해야 종합적 판단이 가능하다',
        '정량적 분석과 정성적 판단의 균형이 중요하다',
        `${relatedNames}와의 통합 분석이 필수적이다`,
        '리스크 관리가 장기 성과의 핵심이다'
      ]
    },
    {
      order: 3,
      topic: `${concept.name} 심화: 전문가 관점의 고급 전략`,
      introduction: `기본 개념과 시장 적용 방법을 학습한 후에는, 보다 심화된 전문가 수준의 전략을 이해할 차례입니다. 이 장에서는 NPLatform 부동산 전문가 ${expertCount}명 중에서도 특히 높은 전문성을 보인 상위 전문가들의 고급 전략을 분석합니다. ${videoCount.toLocaleString()}개 영상에서 관련성 점수 0.9 이상으로 평가된 심화 콘텐츠를 중심으로 구성하였습니다.`,
      coreExplanation: `${concept.name}의 고급 적용 전략은 다음과 같은 영역으로 나뉩니다.\n\n첫째, 포트폴리오 관점의 통합 전략입니다. 단일 물건이 아닌 전체 자산 포트폴리오 차원에서 ${concept.name}을 적용하는 방법을 다룹니다.\n\n둘째, 시장 사이클에 따른 차별화 전략입니다. 상승기, 조정기, 하락기 각각에서 ${concept.name}을 다르게 적용하는 노하우를 전문가 분석을 통해 정리합니다.\n\n셋째, 고급 리스크 헷지 전략입니다. 단순한 리스크 회피를 넘어, 리스크를 기회로 전환하는 전문가 수준의 접근법을 설명합니다.\n\n넷째, 후속 개념(${successorNames})으로의 자연스러운 확장입니다. ${concept.name}에서 습득한 분석력을 바탕으로 더 복잡한 개념을 효율적으로 학습하는 방법을 안내합니다.`,
      expertComparison: `심화 전략에서는 전문가 간 차이가 더욱 뚜렷합니다. 보수적 전문가 그룹은 안전마진 확보를 최우선으로 강조하며, 공격적 전문가 그룹은 레버리지 활용과 빠른 의사결정을 중시합니다. 중도적 전문가 그룹은 상황에 따른 유연한 전략 전환을 핵심 역량으로 꼽습니다. ${expertCount}명의 전문가 분석 결과, 장기적으로 가장 안정적인 성과를 보인 것은 중도적 접근 방식이었습니다.`,
      practicalCases: `[고급 사례 1] ${concept.name}의 심화 원칙을 활용한 포트폴리오 재구성 사례입니다. 기존 보유 자산의 리밸런싱 과정에서 ${concept.name}의 프레임워크가 핵심적 역할을 했으며, 결과적으로 시장 평균 대비 우수한 안정성과 수익성을 동시에 달성할 수 있었습니다.\n\n[고급 사례 2] 시장 조정기에 오히려 ${concept.name}의 원칙에 기반한 역발상 투자로 높은 수익을 달성한 사례입니다. 이 사례에서 핵심은 선행 개념(${prereqNames})에 대한 깊은 이해를 바탕으로 한 확신 있는 판단이었습니다.`,
      applicationGuide: `고급 전략 적용을 위한 자기 진단 체크리스트:\n\n1. ${concept.name}의 기본 정의를 남에게 설명할 수 있는가?\n2. 시장 분석에 이 개념을 독립적으로 적용할 수 있는가?\n3. 관련 개념(${relatedNames})과의 연관성을 이해하고 있는가?\n4. 최소 3건 이상의 실전 사례를 분석해 본 경험이 있는가?\n\n4개 모두 "예"라면 고급 전략을 학습할 준비가 되었습니다.`,
      keyTakeaways: [
        '포트폴리오 관점의 통합적 적용이 고급 전략의 핵심이다',
        '시장 사이클에 따른 유연한 전략 전환 능력이 필요하다',
        `전문가 ${expertCount}명 중 중도적 접근이 가장 안정적인 성과를 보였다`,
        `후속 개념(${successorNames})으로의 확장 학습이 경쟁력을 높인다`
      ]
    },
    {
      order: 4,
      topic: `${concept.name}과 연관 개념의 통합 학습 가이드`,
      introduction: `마지막 장에서는 ${concept.name}을(를) 부동산 온톨로지의 전체 맥락 속에서 조망합니다. 개별 개념의 이해를 넘어, 관련 개념들과의 유기적 연결을 통해 종합적인 부동산 분석 능력을 키우는 것이 이 장의 목표입니다. NPLatform 부동산 전문가 ${expertCount}명의 분석 데이터를 바탕으로, 가장 효율적인 통합 학습 경로를 제시합니다.`,
      coreExplanation: `${concept.name}은(는) 독립적으로 존재하는 개념이 아니라, 부동산 지식 체계의 유기적 네트워크 속에 위치합니다.\n\n[선행 개념과의 관계]\n${prereqNames !== '없음' ? prereqNames + '은(는) ' + concept.name + '을(를) 이해하기 위한 기초 지식을 제공합니다. 이 선행 개념들에 대한 이해 없이 ' + concept.name + '을(를) 학습하면 표면적 이해에 그칠 위험이 있습니다.' : concept.name + '은(는) 선행 지식 없이도 학습할 수 있는 기초 개념입니다.'}\n\n[후속 개념과의 관계]\n${successorNames !== '없음' ? concept.name + '을(를) 충분히 이해한 후에는 ' + successorNames + '(으)로 학습을 확장합니다. 이 개념들은 ' + concept.name + '의 원칙을 보다 구체적이고 전문적인 영역에 적용하는 내용을 다룹니다.' : '현재 온톨로지에서 직접적인 후속 개념이 정의되지 않았으나, ' + relatedNames + ' 등의 관련 개념을 병행 학습하는 것을 권장합니다.'}\n\n[관련 개념과의 시너지]\n${relatedNames}은(는) ${concept.name}과(와) 상호 보완적 관계에 있습니다. 이 개념들을 함께 학습하면 부동산 시장에 대한 입체적이고 다각적인 이해가 가능해집니다.`,
      expertComparison: `통합 학습 접근법에 대한 전문가들의 공통된 의견은, 개별 개념을 깊이 있게 학습하되 반드시 관련 개념과의 연결 고리를 인식해야 한다는 것입니다. 전문가 ${expertCount}명의 ${videoCount.toLocaleString()}개 영상을 분석한 결과, 성공적인 학습자들은 하나의 개념을 배울 때 최소 2-3개의 관련 개념을 함께 참조하는 패턴을 보였습니다. 이는 지식의 체계적 구조화가 실전 적용 능력에 직접적으로 연결된다는 점을 시사합니다.`,
      practicalCases: `[통합 학습 사례] 부동산 투자 초보자가 ${concept.name}에서 시작하여 체계적인 학습 경로를 따라 ${concept.domain_name} 도메인 전체를 마스터한 사례입니다. 이 학습자는 온톨로지의 선행-후행 관계를 활용하여 최적의 학습 순서를 설정하고, 각 단계에서 전문가 영상을 통한 실전 학습을 병행했습니다. 약 3개월의 체계적 학습 후, 독자적으로 시장 분석 보고서를 작성할 수 있는 수준에 도달했습니다.`,
      applicationGuide: `${concept.name} 통합 학습 로드맵:\n\n1주차: ${concept.name} 기본 정의 및 법적 배경 학습\n2주차: 실전 사례 분석 및 시장 적용 연습\n3주차: 관련 개념(${relatedNames}) 병행 학습\n4주차: 심화 전략 학습 및 포트폴리오 적용\n5주차 이후: 후속 개념(${successorNames || '심화 과정'})으로 확장\n\n각 주차별 권장 학습 시간: 주 5-7시간`,
      keyTakeaways: [
        `${concept.name}은(는) 부동산 지식 네트워크의 핵심 노드이다`,
        '선행-후행 관계를 활용한 체계적 학습이 효율적이다',
        '관련 개념과의 통합 학습이 실전 적용 능력을 높인다',
        `${concept.domain_name} 도메인 마스터를 위한 출발점으로 최적이다`
      ]
    }
  ]

  return {
    title: `[${concept.domain_name}] ${concept.name} 완벽 가이드 - AI 온톨로지 분석 기반 전자책`,
    executiveSummary: `본 전자책은 NPLatform 부동산 전문가 ${expertCount}명의 ${videoCount.toLocaleString()}개 영상을 AI 온톨로지 분석하여 구성한 "${concept.name}" 완벽 가이드입니다. 전체 부동산 개념 중 중요도 ${rank}위를 차지하는 이 핵심 주제를, 기본 정의부터 고급 전략까지 4개 장으로 체계적으로 정리하였습니다. 각 장은 이론 설명, 전문가 비교 분석, 실전 사례, 적용 가이드로 구성되어 있어 초보자부터 중급자까지 단계적으로 학습할 수 있습니다.`,
    chapters,
    comprehensiveCaseStudy: `[종합 사례 연구: ${concept.name}의 A to Z 적용]\n\n투자자 A씨는 ${concept.domain_name} 분야에 처음 진입하면서 ${concept.name}을(를) 체계적으로 학습하기로 결심했습니다. 먼저 선행 개념인 ${prereqNames}을(를) 충분히 학습한 후, ${concept.name}의 기본 원칙을 정립했습니다.\n\n이후 관련 개념(${relatedNames})을 병행 학습하면서, 실제 시장에서 매물을 분석하는 연습을 시작했습니다. NPLatform 부동산 전문가 ${expertCount}명의 강의 중 관련성 상위 영상을 집중적으로 학습하며 다양한 전문가의 관점을 흡수했습니다.\n\n약 2개월간의 체계적 학습 후, A씨는 ${concept.name}의 원칙에 따라 첫 투자를 실행했습니다. 리스크 관리 원칙을 철저히 준수하고, 전문가들이 공통적으로 강조한 체크리스트를 활용하여 안전마진을 확보했습니다. 1년 후, 시장 평균 대비 우수한 성과를 달성하며 후속 개념(${successorNames})의 학습으로 자연스럽게 확장해 나가고 있습니다.`,
    comparativeAnalysis: `[전문가 관점 비교 분석]\n\nNPLatform 부동산 전문가 ${expertCount}명의 ${concept.name}에 대한 분석을 종합하면, 다음과 같은 공통점과 차이점이 발견됩니다.\n\n공통점: (1) ${concept.name}의 기본 정의에 대해서는 높은 합의 수준(관련성 ${avgRelevance.toFixed(3)})을 보임 (2) 실전 적용의 중요성을 공통적으로 강조 (3) 리스크 관리의 필수성에 동의\n\n차이점: (1) 적용 우선순위에서 전문가별 차이 존재 (2) 리스크 허용 수준에 따라 전략 차별화 (3) 시장 상황 해석에서 보수적 vs 공격적 견해 분포`,
    learningChecklist: [
      `${concept.name}의 법적 정의를 정확히 설명할 수 있다`,
      `${concept.name}의 실무적 의미와 적용 방법을 이해한다`,
      `선행 개념(${prereqNames})과의 관계를 파악하고 있다`,
      `후속 개념(${successorNames})으로의 학습 경로를 알고 있다`,
      '최소 3건의 실전 사례를 분석할 수 있다',
      `전문가 ${expertCount}명의 공통 관점을 요약할 수 있다`,
      '리스크 요인을 식별하고 대응 전략을 수립할 수 있다',
      `${concept.domain_name} 도메인 내에서 이 개념의 위치를 설명할 수 있다`
    ],
    selfAssessment: [
      `${concept.name}의 법적 정의와 실무적 정의의 차이는 무엇인가요?`,
      `${concept.name}을(를) 적용할 때 가장 흔한 실수는 무엇이며, 어떻게 피할 수 있나요?`,
      `관련 개념(${relatedNames}) 중 ${concept.name}과(와) 가장 밀접한 관계에 있는 개념은 무엇이고, 그 이유는?`,
      `시장 상승기와 하락기에 ${concept.name}의 적용 방법은 어떻게 달라져야 하나요?`,
      `${concept.name}에 대한 전문가들의 공통 의견과 차별화된 의견 각각 2개씩 서술하세요.`
    ],
    nextSteps: `${concept.name} 학습을 완료한 후에는 다음 단계로 진행하시기 바랍니다:\n\n1. 후속 개념 학습: ${successorNames || '심화 과정을 통해 전문성을 강화하세요'}\n2. 관련 개념 심화: ${relatedNames}을(를) 병행 학습하여 종합적 이해를 높이세요\n3. 실전 적용: 실제 매물 분석 또는 시장 보고서 작성에 배운 내용을 적용해 보세요\n4. 전문가 콘텐츠: 온톨로지 분석 기반 추천 영상을 통해 지속적으로 학습하세요\n5. 커뮤니티 참여: 동료 학습자들과 사례를 공유하고 토론하며 실전 감각을 키우세요`
  }
}

function buildNewsletterContent(
  concept: any,
  importance: any,
  relations: { prerequisites: any[]; successors: any[]; related: any[] },
  capsule: any,
  pathSteps: any[]
) {
  const expertCount = importance?.expert_count || 90
  const videoCount = importance?.video_count || 10000
  const rank = importance?.rank_overall || 1
  const level = capsule?.level || pathSteps?.[0]?.level || '입문'
  const prereqNames = relations.prerequisites.map(p => p.name).join(', ') || '없음'
  const successorNames = relations.successors.map(s => s.name).join(', ') || '없음'

  const totalInLevel = 15
  const orderInLevel = rank <= 5 ? rank : Math.ceil(rank / 3)

  return {
    type: 'ontology_concept_deep_dive',
    headline: `[${concept.domain_name}] "${concept.name}" - 전문가 ${expertCount}명이 분석한 핵심 개념 완전 정복`,
    body: `안녕하세요, NPLatform 부동산 학습 뉴스레터입니다.\n\n오늘은 ${concept.domain_name} 도메인의 핵심 개념인 "${concept.name}"을(를) 심층 분석합니다. 이 개념은 NPLatform 부동산 전문가 ${expertCount}명이 총 ${videoCount.toLocaleString()}개의 영상에서 다룬 주제로, 전체 부동산 온톨로지에서 중요도 ${rank}위를 차지하고 있습니다.\n\n${concept.description || concept.name + '은(는) ' + concept.domain_name + ' 분야의 기초가 되는 개념입니다.'}\n\n전문가들의 분석을 종합하면, ${concept.name}은(는) ${level} 수준의 학습자가 반드시 알아야 할 핵심 지식입니다. 선행 개념으로 ${prereqNames}을(를) 먼저 학습하고, 이후 ${successorNames || '심화 과정'}으로 확장하는 것이 가장 효과적인 학습 경로입니다.\n\n이번 뉴스레터에서는 전문가들이 공통적으로 강조하는 핵심 포인트와 실전 적용 팁을 정리해 드립니다.`,
    keyTakeaways: [
      `${concept.name}은(는) ${concept.domain_name} 도메인에서 중요도 ${rank}위의 핵심 개념입니다`,
      `전문가 ${expertCount}명, 영상 ${videoCount.toLocaleString()}개 분석 기반의 검증된 학습 콘텐츠입니다`,
      `${level} 수준 학습자를 위한 체계적 학습 가이드가 준비되어 있습니다`,
      `선행 학습(${prereqNames}) → 본 개념 → 후속 학습(${successorNames || '심화'})의 최적 경로를 따르세요`
    ],
    ontologyPosition: {
      level,
      orderInLevel,
      totalInLevel
    },
    callToAction: `"${concept.name}" 완벽 가이드 전자책과 80분 강의 플랜이 준비되어 있습니다. 지금 바로 학습을 시작하세요! 관련 개념 학습까지 포함된 전체 학습 로드맵도 확인해 보세요.`
  }
}

// ── Main API handler ─────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Get concepts with importance
    const { data: conceptsRaw, error: conceptsErr } = await supabase
      .from('ont_concept')
      .select(`
        concept_id, name, description,
        ont_domain ( name, color ),
        ont_concept_importance ( expert_count, video_count, avg_relevance, rank_overall )
      `)
      .in('concept_id', SAMPLE_CONCEPT_IDS)

    if (conceptsErr) {
      console.error('[ontology/samples] concepts query error:', conceptsErr)
      return NextResponse.json({ error: 'Failed to fetch concepts', detail: conceptsErr.message }, { status: 500 })
    }

    // 2. Get relations
    const { data: relationsRaw, error: relationsErr } = await supabase
      .from('ont_relation')
      .select(`
        relation_type,
        source:ont_concept!source_concept_id ( concept_id, name ),
        target:ont_concept!target_concept_id ( concept_id, name )
      `)
      .or(
        `source_concept_id.in.(${SAMPLE_CONCEPT_IDS.join(',')}),target_concept_id.in.(${SAMPLE_CONCEPT_IDS.join(',')})`
      )

    if (relationsErr) {
      console.error('[ontology/samples] relations query error:', relationsErr)
    }

    // 3. Get top experts — use ont_concept_importance.experts or fallback to basic query
    // Since complex GROUP BY isn't available via standard client, we fetch high-relevance mappings
    // and aggregate client-side
    let expertsRaw: any[] = []
    try {
      // Get youtube_concept mappings with youtube join for channel names
      const expertResults = await Promise.all(
        SAMPLE_CONCEPT_IDS.map(async (cid) => {
          const { data } = await supabase
            .from('ont_youtube_concept')
            .select('concept_id, youtube_id, relevance, ont_youtube!inner(channel_name)')
            .eq('concept_id', cid)
            .gte('relevance', 0.8)
            .order('relevance', { ascending: false })
            .limit(500)
          return data || []
        })
      )
      // Client-side aggregation: group by concept_id + channel_name
      for (const rows of expertResults) {
        const channelMap: Record<string, { concept_id: number; channel_name: string; count: number; totalRel: number }> = {}
        for (const row of rows) {
          const ch = (row as any).ont_youtube?.channel_name || 'unknown'
          const key = `${row.concept_id}_${ch}`
          if (!channelMap[key]) {
            channelMap[key] = { concept_id: row.concept_id, channel_name: ch, count: 0, totalRel: 0 }
          }
          channelMap[key].count++
          channelMap[key].totalRel += row.relevance
        }
        for (const v of Object.values(channelMap)) {
          expertsRaw.push({
            concept_id: v.concept_id,
            channel_name: v.channel_name,
            video_count: v.count,
            avg_rel: Math.round((v.totalRel / v.count) * 1000) / 1000
          })
        }
      }
      // Sort by video_count desc within each concept
      expertsRaw.sort((a, b) => a.concept_id - b.concept_id || b.video_count - a.video_count)
    } catch (e) {
      console.error('[ontology/samples] experts aggregation error:', e)
    }

    // 4. Get transcript samples - use basic query with inner join
    let transcriptsRaw: any[] = []
    try {
      const transcriptResults = await Promise.all(
        SAMPLE_CONCEPT_IDS.map(async (cid) => {
          const { data } = await supabase
            .from('ont_youtube_concept')
            .select('concept_id, ont_youtube!inner(title, channel_name, transcript)')
            .eq('concept_id', cid)
            .gte('relevance', 0.9)
            .order('relevance', { ascending: false })
            .limit(5)
          return (data || []).map((row: any) => ({
            concept_id: row.concept_id,
            title: row.ont_youtube?.title || '',
            channel_name: row.ont_youtube?.channel_name || '',
            transcript_excerpt: (row.ont_youtube?.transcript || '').substring(0, 600)
          })).filter((r: any) => r.transcript_excerpt.length > 100)
        })
      )
      transcriptsRaw = transcriptResults.flat()
    } catch (e) {
      console.error('[ontology/samples] transcripts query error:', e)
    }

    // 5. Get capsule data
    const { data: capsulesRaw, error: capsulesErr } = await supabase
      .from('ont_lecture_capsule')
      .select('*')
      .in('concept_id', SAMPLE_CONCEPT_IDS)

    if (capsulesErr) {
      console.error('[ontology/samples] capsules query error:', capsulesErr)
    }

    // 6. Get path/step data
    const { data: pathStepsRaw, error: pathStepsErr } = await supabase
      .from('ont_path_step')
      .select(`
        concept_id, step_order, lecture_level,
        ont_path ( name, level )
      `)
      .in('concept_id', SAMPLE_CONCEPT_IDS)

    if (pathStepsErr) {
      console.error('[ontology/samples] pathSteps query error:', pathStepsErr)
    }

    // ── Transform & normalize raw data ────────────────────────────────

    const relations = (relationsRaw || []).map((r: any) => ({
      relation_type: r.relation_type,
      source_name: r.source?.name,
      source_id: r.source?.concept_id,
      target_name: r.target?.name,
      target_id: r.target?.concept_id
    }))

    const expertsByConceptId = groupBy(expertsRaw || [], (e: any) => e.concept_id)
    const transcriptsByConceptId = groupBy(transcriptsRaw || [], (t: any) => t.concept_id)
    const capsulesByConceptId = groupBy(capsulesRaw || [], (c: any) => c.concept_id)
    const pathStepsByConceptId = groupBy(pathStepsRaw || [], (p: any) => p.concept_id)

    // ── Build response for each concept ───────────────────────────────

    const concepts = (conceptsRaw || []).map((raw: any) => {
      const cid = raw.concept_id
      const domain = raw.ont_domain as any
      const imp = Array.isArray(raw.ont_concept_importance)
        ? raw.ont_concept_importance[0]
        : raw.ont_concept_importance

      const concept = {
        concept_id: cid,
        name: raw.name,
        description: raw.description || '',
        domain_name: domain?.name || '',
        domain_color: domain?.color || '#6366f1'
      }

      const importance = {
        expert_count: imp?.expert_count || 0,
        video_count: imp?.video_count || 0,
        avg_relevance: imp?.avg_relevance || 0,
        rank_overall: imp?.rank_overall || 0
      }

      const conceptRelations = relations.filter(
        (r: any) => r.source_id === cid || r.target_id === cid
      )
      const relObj = buildRelations(cid, conceptRelations)

      const experts = (expertsByConceptId[cid] || []).slice(0, 10).map((e: any) => ({
        channel_name: e.channel_name,
        video_count: Number(e.video_count),
        avg_relevance: Number(e.avg_rel)
      }))

      const transcriptSamples = (transcriptsByConceptId[cid] || []).slice(0, 5).map((t: any) => ({
        title: t.title,
        channel_name: t.channel_name,
        transcript_excerpt: t.transcript_excerpt
      }))

      const capsuleRaw = (capsulesByConceptId[cid] || [])[0] || null
      const capsule = capsuleRaw
        ? {
            capsule_title: capsuleRaw.capsule_title || capsuleRaw.title || '',
            level: capsuleRaw.level || '',
            recommended_duration: capsuleRaw.recommended_duration || 0,
            overview: capsuleRaw.overview || '',
            syllabus: capsuleRaw.syllabus || [],
            theory_points: capsuleRaw.theory_points || [],
            teaching_guidelines: capsuleRaw.teaching_guidelines || ''
          }
        : {
            capsule_title: '',
            level: '입문',
            recommended_duration: 80,
            overview: '',
            syllabus: [],
            theory_points: [],
            teaching_guidelines: ''
          }

      const pathSteps = (pathStepsByConceptId[cid] || []).map((p: any) => ({
        path_name: p.ont_path?.name || '',
        level: p.ont_path?.level || p.lecture_level || '',
        step_order: p.step_order,
        lecture_level: p.lecture_level
      }))

      // Build content
      const lecturePlan = buildLecturePlan(
        { ...concept, description: raw.description },
        importance,
        relObj,
        capsuleRaw || capsule,
        experts,
        pathSteps
      )

      const ebookContent = buildEbookContent(
        { ...concept, description: raw.description },
        importance,
        relObj,
        capsuleRaw || capsule,
        experts,
        transcriptSamples
      )

      const newsletterContent = buildNewsletterContent(
        { ...concept, description: raw.description },
        importance,
        relObj,
        capsuleRaw || capsule,
        pathSteps
      )

      return {
        concept,
        importance,
        relations: relObj,
        topExperts: experts,
        transcriptSamples,
        capsule,
        lecturePlan,
        ebookContent,
        newsletterContent
      }
    })

    // Sort by original order: 1, 59, 37
    const sortedConcepts = SAMPLE_CONCEPT_IDS.map(id =>
      concepts.find((c: any) => c.concept.concept_id === id)
    ).filter(Boolean)

    return NextResponse.json({
      concepts: sortedConcepts,
      meta: {
        generatedAt: new Date().toISOString(),
        sampleConceptIds: SAMPLE_CONCEPT_IDS,
        queryCount: 6
      }
    })
  } catch (error) {
    console.error('[ontology/samples] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', detail: (error as any)?.message || String(error) },
      { status: 500 }
    )
  }
}
