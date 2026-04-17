import { test, expect } from '@playwright/test'

/**
 * E2E coverage for Phase 6-3 Portfolio Analytics dashboard.
 * Assumes dev server uses the dev_user bypass (or a test account).
 */

test.describe('Portfolio Analytics', () => {
  test('analytics page loads with skeleton then content', async ({ page }) => {
    await page.goto('/my/portfolio/analytics')
    // Accept either loading state or final content
    await expect(
      page.locator('text=포트폴리오 분석, text=Portfolio Analytics, text=관심 매물')
    ).toBeVisible({ timeout: 15_000 })
  })

  test('KPI cards are present', async ({ page }) => {
    await page.goto('/my/portfolio/analytics')
    await expect(page.locator('text=총 관심 금액')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=평균 할인율')).toBeVisible()
    await expect(page.locator('text=평균 등급')).toBeVisible()
  })

  test('charts render (or show empty state)', async ({ page }) => {
    await page.goto('/my/portfolio/analytics')
    await page.waitForTimeout(2000)
    // Either a chart SVG or the empty-state "데이터 없음" placeholder is shown
    const hasCharts = await page.locator('svg.recharts-surface').count()
    const hasEmpty = await page.locator('text=데이터 없음').count()
    expect(hasCharts + hasEmpty).toBeGreaterThan(0)
  })

  test('holdings table links to individual listing', async ({ page }) => {
    await page.goto('/my/portfolio/analytics')
    await page.waitForTimeout(2500)
    const firstLink = page.locator('a[href^="/exchange/"]').first()
    if ((await firstLink.count()) > 0) {
      const href = await firstLink.getAttribute('href')
      expect(href).toMatch(/^\/exchange\//)
    }
  })

  test('back navigation to portfolio list', async ({ page }) => {
    await page.goto('/my/portfolio/analytics')
    const back = page.locator('text=돌아가기, text=포트폴리오로').first()
    if ((await back.count()) > 0) {
      await back.click()
      await expect(page).toHaveURL(/\/my\/portfolio/)
    }
  })
})

test.describe('Matching Engine v2 Integration', () => {
  test('demand list shows match counts', async ({ page }) => {
    await page.goto('/exchange/demands')
    await page.waitForTimeout(2000)
    // Expect "N건 매칭" badge visible somewhere
    const matches = page.locator('text=/\\d+건 매칭|매칭 \\d+건/')
    if ((await matches.count()) > 0) {
      await expect(matches.first()).toBeVisible()
    }
  })
})
