// ═══ T2 用例 6：条件必填 ═══════════════════════════════════════════════════════
// 用运行时预览（playground 右侧「渲染结果」FormRenderer 面板，见该页面 App.vue
// 里 :actions="true"）触发真实的表单提交：这个面板自带提交/重置按钮，点击后走
// FormKit 原生的"提交前先校验，未通过则拦截并展示错误提示"流程——不用顶栏「预览」
// 弹窗（BuilderPreview.vue），那个弹窗默认 actions=false，不带提交按钮。
import { test, expect, definitionOf, field, eqExpr, gotoWithDefinition } from './helpers'

test('开关关闭时提交成功；开关打开且收入说明为空时提交被拦截并出现必填提示', async ({ page }) => {
  const definition = definitionOf([
    field({
      id: 'flag1',
      type: 'naiveSwitch',
      renderAs: 'cmp',
      name: 'hasOtherIncome',
      label: '是否有其他收入',
    }),
    field({
      id: 'note1',
      type: 'text',
      renderAs: 'cmp',
      name: 'incomeNote',
      label: '收入说明',
      requiredIf: eqExpr('hasOtherIncome', true),
    }),
  ])
  await gotoWithDefinition(page, definition)

  const previewHeading = page.getByText('渲染结果（FormRenderer', { exact: false }).first()
  await previewHeading.scrollIntoViewIfNeeded()
  const previewPanel = page.locator('div.border-l').first()
  const submitBtn = previewPanel.getByRole('button', { name: '提交', exact: true })

  // ── 场景一：开关关闭，提交成功（onFormSubmit 用 alert 展示提交结果，见 App.vue）──
  let dialogMessage: string | null = null
  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message()
    await dialog.accept()
  })
  await submitBtn.click()
  await expect.poll(() => dialogMessage).not.toBeNull()

  // ── 场景二：打开开关，不填收入说明，提交应被拦截，不应该弹出提交成功的 dialog ──
  await previewPanel.locator('.n-switch').first().click()
  let dialogMessage2: string | null = null
  page.once('dialog', async (dialog) => {
    dialogMessage2 = dialog.message()
    await dialog.accept()
  })
  await submitBtn.click()
  await expect(previewPanel.locator('.formkit-message').first()).toBeVisible()
  expect(dialogMessage2).toBeNull()
})
