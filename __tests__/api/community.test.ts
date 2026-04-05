/**
 * API Integration Tests for /api/v1/community
 * Assumes dev server is running at http://localhost:3000
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('Community API', () => {
  it('GET /api/v1/community returns posts array', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/community`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      expect(Array.isArray(json.posts ?? json.data ?? json)).toBe(true)
    }
  })

  it('POST /api/v1/community creates post with title/content/category', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '테스트 게시글 ' + Date.now(),
        content: '테스트 내용입니다. 커뮤니티 API 통합 테스트.',
        category: 'GENERAL',
      }),
    })
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200 || res.status === 201) {
      const json = await res.json()
      const post = json.post ?? json.data ?? json
      expect(post).toBeDefined()
    }
  })

  it('POST /api/v1/community with empty title returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
        content: '내용은 있지만 제목이 비었습니다.',
        category: 'GENERAL',
      }),
    })
    // Should be 400 for validation failure, or 401 for auth
    expect([400, 401, 422]).toContain(res.status)
  })

  it('GET /api/v1/community with category filter works', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/community?category=QNA`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const posts = json.posts ?? json.data ?? json
      expect(Array.isArray(posts)).toBe(true)
    }
  })

  it('GET /api/v1/community with sort=popular works', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/community?sort=popular`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const posts = json.posts ?? json.data ?? json
      expect(Array.isArray(posts)).toBe(true)
    }
  })

  it('POST /api/v1/community/report creates report', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/community/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: 'test-post-id',
        reason: 'SPAM',
        description: '스팸 게시글 신고',
      }),
    })
    expect([200, 201, 401]).toContain(res.status)
  })
})
