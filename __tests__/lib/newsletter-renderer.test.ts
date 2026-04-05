import { describe, it, expect } from 'vitest'
import { renderAINewsletterHtml } from '@/lib/newsletter-renderer'
import type { NewsletterData } from '@/lib/ebook-types'

describe('newsletter-renderer', () => {
  describe('renderAINewsletterHtml', () => {
    const dummyNewsletter: NewsletterData = {
      generated_at: '2026-03-14T09:00:00.000Z',
      newsletter_type: 'daily_lesson',
      title: '오늘의 부동산 학습: 등기부등본 읽는 법',
      ai_content: {
        headline: '등기부등본, 이것만 알면 됩니다',
        body: '등기부등본은 부동산의 신분증과 같습니다. 이 문서를 통해 소유권, 근저당, 전세권 등 부동산에 설정된 모든 권리를 확인할 수 있습니다.',
        key_takeaways: [
          '등기부등본은 표제부, 갑구, 을구로 구성',
          '갑구는 소유권, 을구는 저당권 관련',
          '권리분석 시 말소기준권리가 핵심',
        ],
        call_to_action: '더 자세한 내용은 NPLatform에서 확인하세요!',
      },
      target_capsule: {
        concept_id: 42,
        capsule_title: '등기부등본 해석',
        level: '중급',
        overview: '등기부등본의 구조와 해석 방법',
        expert_count: 8,
      },
      ontology_context: {
        keywords: ['등기부', '소유권', '저당권', '전세권'],
        prerequisites: ['부동산 기초 용어'],
        successors: ['경매 권리분석'],
        roadmap_position: {
          level: '중급',
          lecture_level: 'L2',
          order_in_level: 15,
          total_in_level: 47,
        },
      },
      related_concepts: [
        { concept_name: '권리분석', domain_name: '경매' },
        { concept_name: '부동산 등기법', domain_name: '법률' },
      ],
      learning_path_position: {
        level: '중급',
        lecture_level: 'L2',
        progress_hint: '15/47 강의',
      },
    }

    it('should render valid HTML', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
    })

    it('should include headline', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('등기부등본, 이것만 알면 됩니다')
    })

    it('should include body content', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('부동산의 신분증')
    })

    it('should include key takeaways', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('표제부, 갑구, 을구')
      expect(html).toContain('말소기준권리')
    })

    it('should include ontology context - level info', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('중급')
      expect(html).toContain('L2')
    })

    it('should include keywords', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('등기부')
      expect(html).toContain('소유권')
    })

    it('should include expert count attribution', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('8명')
    })

    it('should include call to action', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('NPLatform')
    })

    it('should NOT expose individual channel names', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      // Should use generic attribution, not individual names
      expect(html).toContain('전문가')
      // No individual youtuber names should appear
    })

    it('should include related concepts', () => {
      const html = renderAINewsletterHtml(dummyNewsletter)
      expect(html).toContain('권리분석')
      expect(html).toContain('부동산 등기법')
    })

    it('should render without ontology context gracefully', () => {
      const minimal: NewsletterData = {
        generated_at: '2026-03-14',
        newsletter_type: 'daily_lesson',
        title: '테스트',
        ai_content: {
          headline: '헤드라인',
          body: '본문',
          key_takeaways: [],
          call_to_action: 'CTA',
        },
      }
      const html = renderAINewsletterHtml(minimal)
      expect(html).toContain('헤드라인')
      expect(html).toContain('본문')
    })

    it('should render weekly_summary type', () => {
      const weekly: NewsletterData = {
        ...dummyNewsletter,
        newsletter_type: 'weekly_summary',
        title: '이번 주 요약',
        weekly_stats: {
          concepts_covered: 5,
          newsletters_sent: 6,
          trending_concepts: [
            { concept_name: '경매 기초', domain_name: '경매', expert_count: 10 },
          ],
        },
      }
      const html = renderAINewsletterHtml(weekly)
      expect(html).toContain('<html')
    })
  })
})
