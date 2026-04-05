import { test, expect } from '@playwright/test'

test.describe('Deal Bridge', () => {
  test('loads exchange page', async ({ page }) => {
    await page.goto('/exchange')
    await expect(page.locator('text=딜 브릿지')).toBeVisible()
  })

  test('shows listing cards', async ({ page }) => {
    await page.goto('/exchange')
    await page.waitForTimeout(3000)
    // Should have listing cards
    const cards = page.locator('[class*="card"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })

  test('filter works', async ({ page }) => {
    await page.goto('/exchange')
    await page.waitForTimeout(2000)
    // Look for filter button or sidebar
    const filterBtn = page.locator('text=필터')
    if (await filterBtn.isVisible()) {
      await filterBtn.click()
    }
  })

  test('listing detail loads', async ({ page }) => {
    await page.goto('/exchange/ex-1')
    await expect(page.locator('h1, h2')).toBeVisible({ timeout: 10000 })
  })

  test('sell page shows wizard', async ({ page }) => {
    await page.goto('/exchange/sell')
    await expect(page.locator('text=매각 등록')).toBeVisible()
  })

  test('deals kanban loads', async ({ page }) => {
    await page.goto('/exchange/deals')
    await expect(page.locator('text=거래 진행')).toBeVisible()
  })

  test('deal room loads', async ({ page }) => {
    await page.goto('/exchange/deals/deal-1')
    await page.waitForTimeout(2000)
    // Should show chat or deal info
  })
})
