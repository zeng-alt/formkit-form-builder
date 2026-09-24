// ═══ T2 用例 1、2：拖入选中 + 圆角/暗色样式 ═════════════════════════════════════
import {
  test,
  expect,
  definitionOf,
  field,
  gotoWithDefinition,
  rootDropArea,
  dragPaletteItem,
} from './helpers'

test('从空画布拖入「文本」：出现并选中，右侧显示属性面板，鼠标移开后根列表没有残留拖放高亮', async ({
  page,
}) => {
  await gotoWithDefinition(page, definitionOf([]))

  const root = rootDropArea(page)
  await dragPaletteItem(page, '字段', '文本', root, 0.5)

  await expect(page.locator('[data-canvas-item="true"]')).toHaveCount(1)
  // 选中 + 右侧属性面板：以「字段名」输入框可见作为判据（NameInput.vue，字段类节点才有）
  await expect(page.getByPlaceholder('字段名')).toBeVisible()

  // 鼠标移开画布，等它有机会清理拖放高亮（CANVAS_DROP_ZONE_CLASS 里带 ring-1，
  // 见 src/utils/dnd/drag-classes.ts；这里防的是"放下后紫色描边一直残留"的回归）
  await page.mouse.move(50, 50)
  await expect
    .poll(async () => {
      const cls = await root.getAttribute('class')
      return /\bring-1\b/.test(cls ?? '')
    })
    .toBe(false)
})

test('画布条目圆角不是 0px；暗色主题下运行时预览的折叠面板标题文字颜色不是黑色', async ({
  page,
}) => {
  const definition = definitionOf([
    {
      id: 'col1',
      key: 'col1',
      category: 'container',
      type: 'collapse',
      renderAs: 'cmp',
      label: '折叠面板',
      props: { defaultExpanded: true, disableCollapse: false, bordered: true },
      children: [field({ id: 'f1', type: 'text', label: '客户姓名' })],
    } as any,
  ])
  await gotoWithDefinition(page, definition, { colorScheme: 'dark' })

  const radius = await page.evaluate(() => {
    const li = document.querySelector('[data-canvas-item="true"]')
    return li ? getComputedStyle(li).borderRadius : null
  })
  expect(radius).not.toBe('0px')
  expect(radius).not.toBeNull()

  // 运行时预览（playground 右侧「渲染结果（FormRenderer...」面板，见该页面 App.vue）：
  // 折叠面板标题按钮 [aria-expanded] 的文字颜色，暗色主题下不应该是黑色
  const previewHeading = page.getByText('渲染结果（FormRenderer', { exact: false }).first()
  await previewHeading.scrollIntoViewIfNeeded()
  const previewPanel = page.locator('div.border-l').first()
  await expect
    .poll(() =>
      previewPanel.evaluate((panel) => {
        const btn = [...panel.querySelectorAll('button[aria-expanded]')].pop()
        return btn ? getComputedStyle(btn as Element).color : null
      }),
    )
    .not.toBe('rgb(0, 0, 0)')
})
