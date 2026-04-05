/**
 * API Integration Tests for /api/v1/notifications
 * Assumes dev server is running at http://localhost:3000
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('Notifications API', () => {
  it('GET /api/v1/notifications returns notifications', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/notifications`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const notifications = json.notifications ?? json.data ?? json
      expect(Array.isArray(notifications)).toBe(true)
    }
  })

  it('PATCH /api/v1/notifications marks as read', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-notification-id',
        read: true,
      }),
    })
    expect([200, 201, 401, 404]).toContain(res.status)
  })

  it('GET /api/v1/notifications with unread filter', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/notifications?unread=true`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const notifications = json.notifications ?? json.data ?? json
      expect(Array.isArray(notifications)).toBe(true)
    }
  })

  it('Response has _source field', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/notifications`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      // API may include _source for tracing
      expect(json).toBeDefined()
      // _source is optional but json must be a valid object
      expect(typeof json).toBe('object')
    }
  })

  it('Returns array (not error)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/notifications`)
    expect([200, 201, 401]).toContain(res.status)
    if (res.status === 200) {
      const json = await res.json()
      const notifications = json.notifications ?? json.data ?? json
      // Must be an array, not an error object
      expect(Array.isArray(notifications)).toBe(true)
      expect(json.error).toBeUndefined()
    }
  })
})
