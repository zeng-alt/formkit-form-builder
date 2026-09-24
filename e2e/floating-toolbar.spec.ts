// ═══ T2 用例 3：浮动工具条与容器（不被祖先 overflow 裁剪 + 按钮顶边对齐）══════════
import { test, expect, definitionOf, gotoWithDefinition, canvasItem } from './helpers'

const naiveButton = (id: string) => ({
  id,
  key: id,
  category: 'static',
  type: 'naiveButton',
  renderAs: 'cmp',
  name: id,
  label: '按钮',
})
const submitButton = (id: string) => ({
  id,
  key: id,
  category: 'static',
  type: 'submit',
  renderAs: 'cmp',
  name: id,
  label: '提交',
})
const textField = (id: string, label: string) => ({
  id,
  key: id,
  category: 'field',
  type: 'text',
  renderAs: 'cmp',
  name: id,
  label,
})

test('按钮组子项浮动工具条完整可见，且「按钮」「提交」顶边对齐', async ({ page }) => {
  const definition = definitionOf([
    {
      id: 'bg1',
      key: 'bg1',
      category: 'container',
      type: 'buttonGroup',
      renderAs: 'cmp',
      dataType: 'array',
      children: [
        naiveButton('btn1'),
        naiveButton('btn2'),
        submitButton('sub1'),
        submitButton('sub2'),
      ],
    } as any,
    {
      id: 'ig1',
      key: 'ig1',
      category: 'container',
      type: 'inputGroup',
      renderAs: 'cmp',
      dataType: 'object',
      children: [textField('txt1', '姓名1'), textField('txt2', '姓名2')],
    } as any,
  ])
  await gotoWithDefinition(page, definition)

  await expect(page.locator('[data-button-group-key]')).toHaveCount(1)
  await expect(page.locator('[data-input-group-key]')).toHaveCount(1)

  // 选中按钮组内的一个子项（点左上角，避免点在按钮本身触发点击行为）
  await canvasItem(page, 'btn1').click({ position: { x: 4, y: 4 } })

  const toolbar = page.locator('[data-testid="canvas-floating-toolbar"]')
  await expect(toolbar).toBeVisible()

  // 工具条矩形没有被任何祖先的 overflow 裁掉：中心点 elementFromPoint 命中的应该
  // 就是工具条自己（被裁剪时命中的会是祖先容器背后的其它元素）
  const hit = await toolbar.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const centerEl = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return !!centerEl?.closest('[data-testid="canvas-floating-toolbar"]')
  })
  expect(hit).toBe(true)

  // 按钮组里「按钮」和「提交」顶边对齐（误差 ≤ 1px）
  const btn1Box = await canvasItem(page, 'btn1').locator('button').first().boundingBox()
  const sub1Box = await canvasItem(page, 'sub1').locator('button').first().boundingBox()
  expect(btn1Box).not.toBeNull()
  expect(sub1Box).not.toBeNull()
  expect(Math.abs((btn1Box?.y ?? 0) - (sub1Box?.y ?? 0))).toBeLessThanOrEqual(1)
})
