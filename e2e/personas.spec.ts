import { expect, test } from '@playwright/test'

test('viewer cannot open approvals decide controls; director can', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible()

  // Executive Viewer persona
  await page.getByRole('button', { name: /Layla Al-Otaibi \(Viewer\)/i }).click()
  await page.getByRole('button', { name: /Sign in/i }).click()
  await expect(page).toHaveURL(/executive/)

  // Approvals nav should be hidden for viewer
  await expect(page.getByRole('link', { name: /Approvals/i })).toHaveCount(0)

  // Switch to Director via Admin is unavailable; logout and login as director
  await page.getByRole('button', { name: /Sign out/i }).click()
  await expect(page).toHaveURL(/login/)

  await page.getByRole('button', { name: /Dr\. Fahad Al-Mutairi/i }).click()
  await page.getByRole('button', { name: /Sign in/i }).click()
  await expect(page).toHaveURL(/executive/)
  await page.getByRole('link', { name: /Approvals/i }).click()
  await expect(page).toHaveURL(/approvals/)
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible()
})
