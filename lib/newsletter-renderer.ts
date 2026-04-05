import type { LegacyNewsletterData } from './newsletter-data'
import type { NewsletterData } from './ebook-types'

const PURPLE = '#7C3AED'
const PURPLE_LIGHT = '#F3F0FF'
const GRAY = '#666666'
const BORDER = '#E5E7EB'

// ============================================================
// Phase 5-4: AI 뉴스레터 HTML 렌더러 (온톨로지 위치 포함)
// ============================================================

const TYPE_LABELS: Record<string, string> = {
  daily_lesson: '오늘의 학습',
  case_study: '사례 분석',
  expert_compare: '전문가 비교',
  learning_tip: '학습 팁',
  weekly_summary: '주간 요약',
}

export function renderAINewsletterHtml(data: NewsletterData): string {
  const dateStr = new Date(data.generated_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
  const typeLabel = TYPE_LABELS[data.newsletter_type] || data.newsletter_type

  const keyTakeaways = (data.ai_content.key_takeaways || [])
    .map(kt => `<div style="padding:6px 0;font-size:13px;">✅ ${esc(kt)}</div>`)
    .join('')

  const ontologySection = data.ontology_context ? `
    <div style="background:${PURPLE_LIGHT};border-radius:12px;padding:16px 20px;margin:20px 0;border-left:4px solid ${PURPLE};">
      <div style="font-weight:700;font-size:14px;color:${PURPLE};margin-bottom:8px;">온톨로지 기반 학습 위치</div>
      <div style="font-size:13px;margin-bottom:4px;">
        📍 <strong>${esc(data.ontology_context.roadmap_position.level)}</strong> 과정
        (${data.ontology_context.roadmap_position.order_in_level}/${data.ontology_context.roadmap_position.total_in_level})
        · ${esc(data.ontology_context.roadmap_position.lecture_level)} 레벨
      </div>
      ${data.ontology_context.prerequisites.length > 0 ? `
        <div style="font-size:12px;color:${GRAY};margin-top:4px;">
          선수: ${data.ontology_context.prerequisites.map(p => esc(p)).join(', ')}
        </div>` : ''}
      ${data.ontology_context.successors.length > 0 ? `
        <div style="font-size:12px;color:${GRAY};margin-top:4px;">
          후속: ${data.ontology_context.successors.map(s => esc(s)).join(', ')}
        </div>` : ''}
      ${data.ontology_context.keywords.length > 0 ? `
        <div style="font-size:12px;color:${GRAY};margin-top:6px;">
          🔑 핵심 키워드: ${data.ontology_context.keywords.map(k => esc(k)).join(', ')}
        </div>` : ''}
    </div>` : ''

  const relatedSection = data.related_concepts && data.related_concepts.length > 0 ? `
    <div style="margin:16px 0;">
      <div style="font-size:13px;color:${GRAY};">
        🔗 관련 개념: ${data.related_concepts.map(r => esc(r.concept_name)).join(', ')}
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>부동산 투자 교육 뉴스레터</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'맑은 고딕','Malgun Gothic',sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,${PURPLE},#6D28D9);padding:32px 24px;text-align:center;">
      <h1 style="color:#FFFFFF;font-size:22px;margin:0 0 8px 0;">🏠 부동산 투자 교육 뉴스레터</h1>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;">${esc(dateStr)}</div>
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:20px;padding:4px 14px;margin-top:8px;">
        <span style="color:#FFFFFF;font-size:12px;">📚 ${esc(typeLabel)}</span>
      </div>
    </div>

    <div style="padding:24px;">
      <!-- Headline -->
      <h2 style="font-size:20px;color:#1F2937;margin:0 0 16px 0;line-height:1.4;">${esc(data.ai_content.headline)}</h2>

      <!-- Body -->
      <div style="font-size:14px;line-height:1.8;color:#374151;margin-bottom:20px;">
        ${esc(data.ai_content.body).replace(/\n/g, '<br>')}
      </div>

      <!-- Key Takeaways -->
      ${keyTakeaways ? `
      <div style="background:#F0FDF4;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#166534;">✅ 핵심 포인트</div>
        ${keyTakeaways}
      </div>` : ''}

      <!-- Ontology Position -->
      ${ontologySection}

      <!-- Related Concepts -->
      ${relatedSection}

      <!-- Call to Action -->
      <div style="text-align:center;margin:24px 0;">
        <div style="background:${PURPLE};color:#FFFFFF;display:inline-block;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          ${esc(data.ai_content.call_to_action)}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;padding:20px 24px;text-align:center;border-top:1px solid ${BORDER};">
      <div style="font-size:11px;color:#9CA3AF;">
        📖 NPLatform 부동산 전문가 ${data.target_capsule?.expert_count || 0}명의<br>
        강의를 AI가 종합 분석하여 생성했습니다.
      </div>
    </div>
  </div>
</body>
</html>`
}

// ============================================================
// Legacy 뉴스레터 렌더러 (backward compat)
// ============================================================

export function renderNewsletterHtml(data: LegacyNewsletterData): string {
  const trendingRows = data.trending_concepts
    .map((c, i) => `
      <tr style="border-bottom:1px solid ${BORDER};">
        <td style="padding:8px 12px;text-align:center;font-weight:bold;color:${PURPLE};">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:600;">${esc(c.concept_name)}</td>
        <td style="padding:8px 12px;color:${GRAY};">${esc(c.domain_name)}</td>
        <td style="padding:8px 12px;text-align:center;">${c.expert_count}</td>
        <td style="padding:8px 12px;text-align:center;">${c.video_count}</td>
      </tr>`)
    .join('')

  const analysisCards = data.new_analyses
    .map(a => `
      <div style="background:#F9FAFB;border-radius:8px;padding:12px 16px;margin-bottom:8px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${esc(a.video_title)}</div>
        <div style="font-size:12px;color:${GRAY};">${esc(a.channel_name)} · ${esc(a.lecture_type)} · 매핑 개념 ${a.concept_count}개</div>
      </div>`)
    .join('')

  const coverageBars = data.coverage_update.domain_rates
    .map(d => `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">
          <span>${esc(d.domain_name)}</span>
          <span style="font-weight:600;">${d.rate}%</span>
        </div>
        <div style="background:#E5E7EB;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background:${PURPLE};height:100%;width:${d.rate}%;border-radius:4px;"></div>
        </div>
      </div>`)
    .join('')

  const newsItems = data.news_digest.slice(0, 5)
    .map(n => {
      const dirColor = n.direction === '상승' ? '#10B981' : n.direction === '하락' ? '#EF4444' : GRAY
      const dirIcon = n.direction === '상승' ? '▲' : n.direction === '하락' ? '▼' : '•'
      return `
        <div style="border-bottom:1px solid ${BORDER};padding:12px 0;">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;">
            <span style="color:${dirColor};margin-right:4px;">${dirIcon}</span>
            ${esc(n.title)}
          </div>
          <div style="font-size:12px;color:${GRAY};">${esc(n.provider)} · ${esc(n.published_at)}</div>
          ${n.summary ? `<div style="font-size:12px;color:#888;margin-top:4px;">${esc(n.summary.slice(0, 120))}${n.summary.length > 120 ? '...' : ''}</div>` : ''}
        </div>`
    })
    .join('')

  const featuredSection = data.featured_capsule ? `
    <div style="margin-top:32px;">
      <h2 style="font-size:18px;color:${PURPLE};margin-bottom:16px;border-bottom:2px solid ${PURPLE};padding-bottom:8px;">추천 캡슐</h2>
      <div style="background:${PURPLE_LIGHT};border-radius:12px;padding:20px;border-left:4px solid ${PURPLE};">
        <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${esc(data.featured_capsule.capsule_title)}</div>
        <div style="font-size:12px;color:${PURPLE};margin-bottom:8px;">${esc(data.featured_capsule.level)} 레벨</div>
        <div style="font-size:13px;color:${GRAY};line-height:1.5;">${esc(data.featured_capsule.overview_snippet)}</div>
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>부동산 온톨로지 뉴스레터</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'맑은 고딕','Malgun Gothic',sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,${PURPLE},#6D28D9);padding:32px 24px;text-align:center;">
      <h1 style="color:#FFFFFF;font-size:24px;margin:0 0 8px 0;">부동산 온톨로지 뉴스레터</h1>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;">${esc(data.period_start)} ~ ${esc(data.period_end)}</div>
    </div>

    <div style="padding:24px;">
      <!-- Trending Concepts -->
      ${data.trending_concepts.length > 0 ? `
      <h2 style="font-size:18px;color:${PURPLE};margin-bottom:16px;border-bottom:2px solid ${PURPLE};padding-bottom:8px;">트렌딩 개념 Top ${data.trending_concepts.length}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
        <thead>
          <tr style="background:${PURPLE_LIGHT};">
            <th style="padding:8px 12px;text-align:center;width:40px;">순위</th>
            <th style="padding:8px 12px;text-align:left;">개념</th>
            <th style="padding:8px 12px;text-align:left;">도메인</th>
            <th style="padding:8px 12px;text-align:center;">전문가</th>
            <th style="padding:8px 12px;text-align:center;">영상</th>
          </tr>
        </thead>
        <tbody>${trendingRows}</tbody>
      </table>` : ''}

      <!-- New Analyses -->
      ${data.new_analyses.length > 0 ? `
      <h2 style="font-size:18px;color:${PURPLE};margin-bottom:16px;border-bottom:2px solid ${PURPLE};padding-bottom:8px;">최근 분석 영상</h2>
      ${analysisCards}
      <div style="margin-bottom:24px;"></div>` : ''}

      <!-- Coverage Update -->
      <h2 style="font-size:18px;color:${PURPLE};margin-bottom:16px;border-bottom:2px solid ${PURPLE};padding-bottom:8px;">커버리지 현황</h2>
      <div style="background:${PURPLE_LIGHT};border-radius:12px;padding:16px 20px;margin-bottom:8px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:${PURPLE};">${data.coverage_update.overall_rate}%</div>
        <div style="font-size:12px;color:${GRAY};">전체 커버리지</div>
      </div>
      <div style="margin-bottom:24px;">${coverageBars}</div>

      <!-- News Digest -->
      ${data.news_digest.length > 0 ? `
      <h2 style="font-size:18px;color:${PURPLE};margin-bottom:16px;border-bottom:2px solid ${PURPLE};padding-bottom:8px;">뉴스 다이제스트</h2>
      ${newsItems}
      <div style="margin-bottom:24px;"></div>` : ''}

      <!-- Featured Capsule -->
      ${featuredSection}
    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;padding:20px 24px;text-align:center;border-top:1px solid ${BORDER};">
      <div style="font-size:11px;color:#9CA3AF;">
        부동산 온톨로지 플랫폼 · ${esc(data.generated_at)} 생성<br>
        이 뉴스레터는 자동 생성되었습니다.
      </div>
    </div>
  </div>
</body>
</html>`
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
