import { expect, test } from '@playwright/test'

test('published CSS isolates host styles and covers teleported previews', async ({ page }) => {
  await page.goto('/style-isolation.html')
  await expect(page.locator('.n-modal-container.formkit-builder-scope .n-card')).toBeVisible()
  await expect(page.locator('#host')).toHaveCSS('margin-top', '4px')
  await expect(page.locator('#inside')).toHaveCSS('margin-top', '16px')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(1, 2, 3)')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.locator('.n-modal-container .py-4')).toHaveCSS('padding-top', '16px')
  await expect(page.locator('.n-modal-container.formkit-builder-scope')).toHaveClass(/dark/)
})
