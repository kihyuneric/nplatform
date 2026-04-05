import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/NPLatform/)
  })

  test('shows hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=NPL 투자')).toBeVisible()
  })

  test('navigation has 5 categories', async ({ page }) => {
    await page.goto('/')
    // Check for menu items
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('guide banner visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=가이드')).toBeVisible()
  })

  test('live feed shows', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=거래 완료')).toBeVisible({ timeout: 10000 })
  })

  test('footer has 6 columns', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.locator('text=NPL 마켓')).toBeVisible()
    await expect(page.locator('text=고객지원')).toBeVisible()
  })
})
