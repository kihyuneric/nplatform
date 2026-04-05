import { NextRequest, NextResponse } from 'next/server'

const UNSPLASH_BASE = 'https://api.unsplash.com'

interface UnsplashPhoto {
  urls: { regular: string; small: string }
  alt_description: string
  user: { name: string }
}

export async function POST(req: NextRequest) {
  try {
    const { keywords }: { keywords: string[] } = await req.json()

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 })
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY

    if (!accessKey) {
      // Unsplash API 키가 없으면 placeholder 이미지 반환
      const sections = ['hero', 'painPoints', 'solution', 'curriculum', 'instructor', 'background']
      const placeholders: Record<string, string> = {}
      sections.forEach((section, i) => {
        const keyword = keywords[i] || keywords[0]
        // 고해상도 무료 placeholder
        placeholders[section] = `https://images.unsplash.com/photo-${getPlaceholderId(section)}?w=1200&h=800&fit=crop&auto=format`
      })
      return NextResponse.json({ images: placeholders })
    }

    const sections = ['hero', 'painPoints', 'solution', 'curriculum', 'instructor', 'background']
    const images: Record<string, string> = {}

    await Promise.all(
      sections.map(async (section, i) => {
        const keyword = keywords[i] || keywords[0]
        try {
          const res = await fetch(
            `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`,
            { headers: { Authorization: `Client-ID ${accessKey}` } }
          )
          const data = await res.json()
          if (data.results && data.results.length > 0) {
            const photo: UnsplashPhoto = data.results[0]
            images[section] = photo.urls.regular
          } else {
            images[section] = `https://images.unsplash.com/photo-${getPlaceholderId(section)}?w=1200&h=800&fit=crop`
          }
        } catch {
          images[section] = `https://images.unsplash.com/photo-${getPlaceholderId(section)}?w=1200&h=800&fit=crop`
        }
      })
    )

    return NextResponse.json({ images })
  } catch (error: unknown) {
    console.error('Image search error:', error)
    return NextResponse.json({ error: '이미지 검색 실패' }, { status: 500 })
  }
}

/** 섹션별 Unsplash 기본 이미지 ID */
function getPlaceholderId(section: string): string {
  const ids: Record<string, string> = {
    hero: '1486406146926-c627a92ad1ab',        // modern building
    painPoints: '1454165804606-c023b3e9d12d',   // stressed person
    solution: '1560520653-9e0e4c89eb11',        // success celebration
    curriculum: '1524178232363-1fb2b075b655',    // classroom
    instructor: '1507003211169-0a1dd7228f2d',    // professional
    background: '1486325212027-8a9f4b0304e4',   // city skyline
  }
  return ids[section] || ids.hero
}
