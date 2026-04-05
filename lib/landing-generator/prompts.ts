// ===== AI 스토리텔링 프롬프트 =====

export function buildSystemPrompt() {
  return `당신은 고전환율 랜딩페이지 전문 카피라이터입니다.
사용자가 입력한 교육 과정 주제를 기반으로 완벽한 랜딩페이지 스토리텔링을 생성합니다.

심리학 원칙을 적극 활용하세요:
- FOMO (Fear of Missing Out): 놓치면 후회할 기회
- 사회적 증거: 다른 수강생들의 성공 사례
- 권위: 강사의 전문성과 실적
- 희소성: 한정 모집, 마감 임박
- 손실 회피: 지금 시작하지 않으면 잃는 것
- 가격 앵커링: 원래 가격 대비 할인

반드시 아래 JSON 구조로만 응답하세요. 다른 텍스트 없이 JSON만 반환합니다.`
}

export function buildUserPrompt(topic: string, targetAudience?: string, tone?: string) {
  const audience = targetAudience || '부동산 투자에 관심 있는 30-50대 직장인'
  const toneDesc = tone === 'urgent' ? '긴급하고 압박감 있는' :
    tone === 'friendly' ? '친근하고 따뜻한' :
    tone === 'storytelling' ? '이야기체로 몰입감 있는' :
    '전문적이고 신뢰감 있는'

  return `주제: "${topic}"
대상: ${audience}
톤: ${toneDesc}

아래 JSON 구조로 랜딩페이지 콘텐츠를 생성해주세요:

{
  "meta": {
    "title": "페이지 제목 (SEO용)",
    "description": "페이지 설명 (160자 이내)",
    "keywords": ["키워드1", "키워드2", ...],
    "imageKeywords": ["hero 이미지 검색어(영어)", "pain 이미지 검색어(영어)", "solution 검색어(영어)", "curriculum 검색어(영어)", "instructor 검색어(영어)", "background 검색어(영어)"]
  },
  "hero": {
    "headline": "강력한 메인 헤드라인 (2줄 이내)",
    "subheadline": "보조 헤드라인 (구체적 혜택 언급)",
    "ctaText": "CTA 버튼 텍스트"
  },
  "painPoints": {
    "title": "섹션 제목 (공감 유도)",
    "items": [
      { "icon": "이모지", "title": "고민 제목", "description": "구체적 고민 설명" },
      { "icon": "이모지", "title": "고민 제목", "description": "구체적 고민 설명" },
      { "icon": "이모지", "title": "고민 제목", "description": "구체적 고민 설명" }
    ]
  },
  "solution": {
    "title": "해결책 섹션 제목",
    "subtitle": "이 과정이 다른 이유",
    "features": [
      { "icon": "이모지", "title": "특장점 제목", "description": "특장점 설명" },
      { "icon": "이모지", "title": "특장점 제목", "description": "특장점 설명" },
      { "icon": "이모지", "title": "특장점 제목", "description": "특장점 설명" },
      { "icon": "이모지", "title": "특장점 제목", "description": "특장점 설명" }
    ]
  },
  "curriculum": {
    "title": "커리큘럼 섹션 제목",
    "steps": [
      { "step": 1, "title": "단계 제목", "description": "내용 설명", "duration": "소요시간" },
      { "step": 2, "title": "단계 제목", "description": "내용 설명", "duration": "소요시간" },
      { "step": 3, "title": "단계 제목", "description": "내용 설명", "duration": "소요시간" },
      { "step": 4, "title": "단계 제목", "description": "내용 설명", "duration": "소요시간" }
    ]
  },
  "testimonials": {
    "title": "수강 후기 섹션 제목",
    "items": [
      { "name": "이름", "role": "직업/신분", "content": "구체적 후기 (3문장)", "rating": 5 },
      { "name": "이름", "role": "직업/신분", "content": "구체적 후기 (3문장)", "rating": 5 },
      { "name": "이름", "role": "직업/신분", "content": "구체적 후기 (3문장)", "rating": 5 }
    ]
  },
  "instructor": {
    "name": "강사 이름",
    "title": "강사 직함",
    "bio": "강사 소개 (3문장)",
    "credentials": ["경력1", "경력2", "경력3", "경력4"]
  },
  "pricing": {
    "title": "수강료 섹션 제목",
    "originalPrice": "원래 가격",
    "salePrice": "할인 가격",
    "discount": "할인율",
    "benefits": ["혜택1", "혜택2", "혜택3", "혜택4", "혜택5"],
    "deadline": "마감 안내 문구"
  },
  "faq": {
    "title": "자주 묻는 질문",
    "items": [
      { "question": "질문1", "answer": "답변1" },
      { "question": "질문2", "answer": "답변2" },
      { "question": "질문3", "answer": "답변3" },
      { "question": "질문4", "answer": "답변4" },
      { "question": "질문5", "answer": "답변5" }
    ]
  },
  "finalCta": {
    "headline": "마지막 CTA 헤드라인",
    "subheadline": "마지막 설득 문구",
    "ctaText": "최종 CTA 버튼 텍스트",
    "urgencyText": "긴급성 메시지"
  }
}

주의사항:
- 모든 텍스트는 한국어로 작성
- imageKeywords는 영어로 (Unsplash 검색용)
- 실제 교육 과정처럼 구체적이고 설득력 있게 작성
- JSON만 반환하고 다른 텍스트는 넣지 마세요`
}
