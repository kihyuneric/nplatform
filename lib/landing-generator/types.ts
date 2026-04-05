// ===== 랜딩페이지 생성기 타입 정의 =====

/** 생성 요청 입력 */
export interface GenerateRequest {
  topic: string
  targetAudience?: string
  tone?: 'professional' | 'friendly' | 'urgent' | 'storytelling'
  colorTheme?: ColorTheme
}

/** AI가 생성하는 스토리텔링 전체 구조 */
export interface GeneratedStory {
  meta: {
    title: string
    description: string
    keywords: string[]
    imageKeywords: string[]
  }
  hero: {
    headline: string
    subheadline: string
    ctaText: string
  }
  painPoints: {
    title: string
    items: { icon: string; title: string; description: string }[]
  }
  solution: {
    title: string
    subtitle: string
    features: { icon: string; title: string; description: string }[]
  }
  curriculum: {
    title: string
    steps: { step: number; title: string; description: string; duration: string }[]
  }
  testimonials: {
    title: string
    items: { name: string; role: string; content: string; rating: number }[]
  }
  instructor: {
    name: string
    title: string
    bio: string
    credentials: string[]
  }
  pricing: {
    title: string
    originalPrice: string
    salePrice: string
    discount: string
    benefits: string[]
    deadline: string
  }
  faq: {
    title: string
    items: { question: string; answer: string }[]
  }
  finalCta: {
    headline: string
    subheadline: string
    ctaText: string
    urgencyText: string
  }
}

/** 이미지 섹션별 매핑 */
export interface SectionImages {
  hero: string
  painPoints: string
  solution: string
  curriculum: string
  instructor: string
  background: string
  [key: string]: string
}

/** 생성 단계 */
export type GenerationStep = 'input' | 'generating' | 'images' | 'preview'

/** 전체 랜딩 데이터 */
export interface LandingPageData {
  story: GeneratedStory
  images: SectionImages
  colorTheme: ColorTheme
  createdAt: string
}

/** 컬러 테마 */
export type ColorTheme = 'navy' | 'forest' | 'warm' | 'modern' | 'royal'

export const COLOR_THEMES: Record<ColorTheme, {
  name: string
  primary: string
  primaryDark: string
  accent: string
  bg: string
  bgAlt: string
  text: string
  textMuted: string
  gradient: string
}> = {
  navy: {
    name: '네이비 블루',
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    accent: '#F59E0B',
    bg: '#FFFFFF',
    bgAlt: '#F8FAFC',
    text: '#0F172A',
    textMuted: '#64748B',
    gradient: 'from-blue-600 to-blue-800',
  },
  forest: {
    name: '포레스트 그린',
    primary: '#059669',
    primaryDark: '#047857',
    accent: '#D97706',
    bg: '#FFFFFF',
    bgAlt: '#F0FDF4',
    text: '#064E3B',
    textMuted: '#6B7280',
    gradient: 'from-emerald-600 to-emerald-800',
  },
  warm: {
    name: '웜 오렌지',
    primary: '#EA580C',
    primaryDark: '#C2410C',
    accent: '#0EA5E9',
    bg: '#FFFFFF',
    bgAlt: '#FFF7ED',
    text: '#1C1917',
    textMuted: '#78716C',
    gradient: 'from-orange-500 to-red-600',
  },
  modern: {
    name: '모던 다크',
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    accent: '#06B6D4',
    bg: '#0F172A',
    bgAlt: '#1E293B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    gradient: 'from-violet-600 to-purple-800',
  },
  royal: {
    name: '로얄 골드',
    primary: '#B45309',
    primaryDark: '#92400E',
    accent: '#1D4ED8',
    bg: '#FFFFFF',
    bgAlt: '#FFFBEB',
    text: '#1C1917',
    textMuted: '#78716C',
    gradient: 'from-amber-600 to-yellow-700',
  },
}
