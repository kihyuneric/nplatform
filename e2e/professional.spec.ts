import { test, expect } from '@playwright/test'

test.describe('Professional Services', () => {
  test('marketplace loads', async ({ page }) => {
    await page.goto('/professional')
    await expect(page.locator('text=전문가')).toBeVisible()
  })

  test('law page loads', async ({ page }) => {
    await page.goto('/professional/law')
    await expect(page.locator('text=법률')).toBeVisible()
  })

  test('tax page loads', async ({ page }) => {
    await page.goto('/professional/tax')
    await expect(page.locator('text=세무')).toBeVisible()
  })

  test('profile page loads', async ({ page }) => {
    await page.goto('/professional/1')
    await page.waitForTimeout(2000)
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/professional/register')
    await expect(page.locator('text=등록')).toBeVisible()
  })
})
