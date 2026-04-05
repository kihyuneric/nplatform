import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nplatform.co.kr'

  // 공개 정적 페이지 (신규 통합 URL 기준)
  const staticPages: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '',                         priority: 1.0,  freq: 'daily'   },
    { path: '/exchange',                priority: 0.95, freq: 'hourly'  },
    { path: '/exchange/sell',           priority: 0.8,  freq: 'weekly'  },
    { path: '/exchange/demands',        priority: 0.8,  freq: 'daily'   },
    { path: '/exchange/institutions',   priority: 0.7,  freq: 'weekly'  },
    { path: '/analysis',                priority: 0.85, freq: 'daily'   },
    { path: '/analysis/simulator',      priority: 0.8,  freq: 'weekly'  },
    { path: '/services',                priority: 0.8,  freq: 'daily'   },
    { path: '/services/experts',        priority: 0.75, freq: 'daily'   },
    { path: '/services/community',      priority: 0.7,  freq: 'daily'   },
    { path: '/services/learn',          priority: 0.7,  freq: 'weekly'  },
    { path: '/services/learn/courses',  priority: 0.65, freq: 'weekly'  },
    { path: '/services/learn/glossary', priority: 0.6,  freq: 'monthly' },
    { path: '/pricing',                 priority: 0.8,  freq: 'weekly'  },
    { path: '/guide',                   priority: 0.75, freq: 'weekly'  },
    { path: '/guide/buyer',             priority: 0.65, freq: 'weekly'  },
    { path: '/guide/seller',            priority: 0.65, freq: 'weekly'  },
    { path: '/guide/partner',           priority: 0.6,  freq: 'weekly'  },
    { path: '/support',                 priority: 0.6,  freq: 'weekly'  },
    { path: '/notices',                 priority: 0.6,  freq: 'daily'   },
    { path: '/news',                    priority: 0.7,  freq: 'daily'   },
    { path: '/terms/service',           priority: 0.4,  freq: 'monthly' },
    { path: '/terms/privacy',           priority: 0.4,  freq: 'monthly' },
  ]

  return staticPages.map(({ path, priority, freq }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: freq,
    priority,
  }))
}
