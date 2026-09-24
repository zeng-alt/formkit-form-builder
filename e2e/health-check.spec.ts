// ═══ T2 用例 8：表单体检 ═══════════════════════════════════════════════════════
import {
  test,
  expect,
  definitionOf,
  field,
  eqExpr,
  gotoWithDefinition,
  issuesEntryButton,
} from './helpers'

test('引用不存在字段时体检按钮出现角标，面板列出 1 条错误，点击后定位到对应元素', async ({
  page,
}) => {
  const definition = definitionOf([
    field({
      id: 'b',
      type: 'text',
      label: 'B字段（引用了不存在的字段）',
      visibleIf: eqExpr('missing', 'x'),
    }),
  ])
  await gotoWithDefinition(page, definition)

  const issuesBtn = issuesEntryButton(page)
  // 角标：BuilderHeader.vue 里 issueDotClass 驱动的圆点（rounded-full）
  await expect(issuesBtn.locator('span.rounded-full')).toBeVisible()

  await issuesBtn.click()
  await expect(page.getByText('错误（1）', { exact: false })).toBeVisible()

  await page
    .getByText(/引用了不存在的字段|不存在/)
    .first()
    .click()
  await expect(page.getByPlaceholder('字段名')).toHaveValue('b')
})
