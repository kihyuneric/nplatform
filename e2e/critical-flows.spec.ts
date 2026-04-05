import { test, expect } from "@playwright/test"

test.describe("Critical Flows", () => {
  test("1. Homepage loads with hero section", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/NPLatform/)
    // Verify hero section exists
    const hero = page.locator("section").first()
    await expect(hero).toBeVisible()
  })

  test("2. Exchange browsing - listing cards appear", async ({ page }) => {
    await page.goto("/exchange")
    // Wait for listing cards to render
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
    // Click first card
    await cards.first().click()
    // Should navigate to a detail page
    await expect(page).not.toHaveURL("/exchange")
  })

  test("3. Listing registration - form and submit button exist", async ({ page }) => {
    await page.goto("/exchange/sell")
    // Verify form fields are present
    const inputs = page.locator("input, textarea, select")
    await expect(inputs.first()).toBeVisible({ timeout: 10000 })
    // Verify submit button exists
    const submitBtn = page.locator('button[type="submit"], button:has-text("등록"), button:has-text("제출")')
    await expect(submitBtn.first()).toBeVisible()
  })

  test("4. Professional search - professional cards appear", async ({ page }) => {
    await page.goto("/services/experts")
    // Wait for professional cards to render
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
  })

  test("5. Guide access - role cards visible", async ({ page }) => {
    await page.goto("/guide")
    // Verify 5+ role cards appear
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })
})
