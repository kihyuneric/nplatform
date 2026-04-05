import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test('admin main loads', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForTimeout(3000)
  })

  test('admin users loads', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(3000)
  })

  test('admin listings loads', async ({ page }) => {
    await page.goto('/admin/listings')
    await page.waitForTimeout(3000)
  })

  test('admin pricing loads', async ({ page }) => {
    await page.goto('/admin/pricing')
    await page.waitForTimeout(3000)
  })

  test('admin banners loads', async ({ page }) => {
    await page.goto('/admin/banners')
    await page.waitForTimeout(3000)
  })

  test('admin integrations loads', async ({ page }) => {
    await page.goto('/admin/integrations')
    await page.waitForTimeout(3000)
  })
})
