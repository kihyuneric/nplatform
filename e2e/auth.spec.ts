import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=로그인')).toBeVisible()
  })

  test('dev login page loads', async ({ page }) => {
    await page.goto('/dev-login')
    await expect(page.locator('text=테스트')).toBeVisible()
  })

  test('mfa setup page loads', async ({ page }) => {
    await page.goto('/mfa-setup')
    await expect(page.locator('text=2단계 인증')).toBeVisible()
  })

  test('guide page loads', async ({ page }) => {
    await page.goto('/guide')
    await expect(page.locator('text=가이드')).toBeVisible()
  })

  test('language selector works', async ({ page }) => {
    await page.goto('/')
    // Find language selector
    const langBtn = page.locator('text=KO')
    if (await langBtn.isVisible()) {
      await langBtn.click()
    }
  })

  test('404 page works', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await page.waitForTimeout(2000)
  })

  test('security settings loads', async ({ page }) => {
    await page.goto('/settings/security')
    await expect(page.locator('text=보안')).toBeVisible()
  })
})
