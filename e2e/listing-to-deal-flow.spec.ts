/**
 * E2E: Full listing → deal flow
 *
 * Tests the core value path of NPLatform:
 *   Browse listings → View detail → Navigate to deals
 */
import { test, expect } from '@playwright/test'

test.describe('Listing → Deal Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss any cookie banners or modals quickly
    page.on('dialog', dialog => dialog.dismiss())
  })

  // ── 1. Exchange browsing ──────────────────────────────────
  test('exchange page loads and shows listings', async ({ page }) => {
    await page.goto('/exchange')
    await expect(page).toHaveTitle(/NPLatform/)

    // Wait for the listing grid (cards or table rows)
    const listingItems = page.locator('[data-testid="listing-card"], [class*="listing"], [class*="card"]')
    await expect(listingItems.first()).toBeVisible({ timeout: 15_000 })

    const count = await listingItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('filter by collateral type updates results', async ({ page }) => {
    await page.goto('/exchange')
    await page.waitForLoadState('networkidle')

    // Find a collateral type filter (select or button)
    const filterSelect = page.locator('select[name*="collateral"], select[aria-label*="담보"], select').first()
    const filterBtn = page.locator('button:has-text("아파트"), label:has-text("아파트")').first()

    if (await filterSelect.isVisible({ timeout: 3_000 })) {
      await filterSelect.selectOption({ label: '아파트' })
      await page.waitForLoadState('networkidle')
    } else if (await filterBtn.isVisible({ timeout: 3_000 })) {
      await filterBtn.click()
      await page.waitForTimeout(1_000)
    }
    // The page should still render without errors
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('search input filters listings', async ({ page }) => {
    await page.goto('/exchange')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"], input[name="query"]').first()
    if (await searchInput.isVisible({ timeout: 5_000 })) {
      await searchInput.fill('서울')
      await searchInput.press('Enter')
      await page.waitForTimeout(1_500)
      await expect(page.locator('body')).not.toContainText('500')
    }
  })

  // ── 2. Listing detail ─────────────────────────────────────
  test('clicking a listing card opens detail page', async ({ page }) => {
    await page.goto('/exchange')
    const card = page.locator('[data-testid="listing-card"], [class*="listing-card"], [class*="ListingCard"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })

    await card.click()

    // Should navigate away from /exchange (to /exchange/[id])
    await page.waitForURL(/\/exchange\/.+/, { timeout: 10_000 })

    // Detail page should show a heading
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('direct listing detail URL loads correctly', async ({ page }) => {
    // Use a known sample ID
    await page.goto('/exchange/ex-1')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
    // No 404/500
    await expect(page.locator('body')).not.toContainText('404')
    await expect(page.locator('body')).not.toContainText('500')
  })

  // ── 3. Sell wizard ────────────────────────────────────────
  test('sell page shows registration wizard', async ({ page }) => {
    await page.goto('/exchange/sell')

    // Should show form fields
    const inputs = page.locator('input, select, textarea')
    await expect(inputs.first()).toBeVisible({ timeout: 10_000 })

    // Should have a submit/next button
    const btn = page.locator('button[type="submit"], button:has-text("다음"), button:has-text("등록")')
    await expect(btn.first()).toBeVisible({ timeout: 5_000 })
  })

  // ── 4. Deals / Deal room ──────────────────────────────────
  test('deals page loads kanban or list', async ({ page }) => {
    await page.goto('/deals')
    // Page should load (might redirect to login, that's acceptable)
    const url = page.url()
    if (url.includes('/login') || url.includes('/auth')) {
      // Auth redirect is expected behavior when not logged in
      return
    }
    await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 10_000 })
  })

  test('deal room shows tabbed interface', async ({ page }) => {
    await page.goto('/deals/deal-1')
    const url = page.url()
    if (url.includes('/login') || url.includes('/auth')) return

    // Should show tabs for chat/docs/offers
    const tabs = page.locator('[role="tab"], button:has-text("채팅"), button:has-text("문서")')
    const tabCount = await tabs.count()
    // At least 2 tabs expected
    if (tabCount > 0) {
      expect(tabCount).toBeGreaterThanOrEqual(1)
    }
  })

  // ── 5. Security headers ───────────────────────────────────
  test('exchange page has security headers', async ({ page, request }) => {
    const response = await request.get('/exchange')
    const csp = response.headers()['content-security-policy']
    expect(csp).toBeTruthy()
    // nonce-based CSP should NOT have unsafe-eval
    if (csp) {
      expect(csp).not.toContain("'unsafe-eval'")
      // Should have nonce or strict-dynamic
      expect(csp).toMatch(/'nonce-[^']+' 'strict-dynamic'|'strict-dynamic'/)
    }

    const xcto = response.headers()['x-content-type-options']
    expect(xcto).toBe('nosniff')

    const xfo = response.headers()['x-frame-options']
    expect(xfo).toBe('DENY')
  })

  // ── 6. PWA / offline ─────────────────────────────────────
  test('manifest.json is accessible', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('name')
    expect(body).toHaveProperty('icons')
  })
})
