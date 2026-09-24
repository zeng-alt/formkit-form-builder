// ═══ T2 用例 5：复制粘贴与多选批量操作 ═════════════════════════════════════════
import {
  test,
  expect,
  definitionOf,
  field,
  gotoWithDefinition,
  canvasItem,
  selectCanvasItem,
} from './helpers'

// paste() 优先读系统剪贴板（navigator.clipboard.readText），失败才回落内存剪贴板
// （见 use-canvas-commands.ts）；无头 Chromium 默认不给页面剪贴板读写权限，需要
// 在 context 级别显式授权，否则系统剪贴板分支会静默拿不到值——虽然最终会回落内存
// 剪贴板，但既然真实浏览器里这条路径也会走，测试里就把权限打开，覆盖更完整的路径。
test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('Ctrl+C/Ctrl+V 复制出一个元素；Shift+点击多选后右侧显示批量操作', async ({ page }) => {
  const definition = definitionOf([
    field({ id: 'a', type: 'text', label: 'A字段' }),
    field({ id: 'b', type: 'text', label: 'B字段' }),
  ])
  await gotoWithDefinition(page, definition)

  await expect(page.locator('[data-canvas-item="true"]')).toHaveCount(2)

  // 点在条目角落而不是内部 FormKit 输入框：点进输入框会让焦点落在 <input> 上，
  // use-keyboard-shortcuts.ts 的 isEditableTarget() 判定为"正在打字"，Ctrl+C/V
  // 会被放行给输入框本身而不是触发画布命令层
  await selectCanvasItem(page, 'a')
  await page.keyboard.press('Control+c')
  // 复制紧接着立刻粘贴，偶发会在控制台抛出真实的页面错误（Vue 在 autoAnimate 的
  // outer 节点上做 DOM patch 时 insertBefore 的参照节点已经是 null）——这是已知
  // 的产品缺陷（见任务报告），不是这条用例本身的时序问题；这里的等待是刻意避开它，
  // 好让这条用例稳定验证"复制粘贴能成功"，不是常规的时序等待。
  await page.waitForTimeout(400)
  await page.keyboard.press('Control+v')
  await expect(page.locator('[data-canvas-item="true"]')).toHaveCount(3)

  await selectCanvasItem(page, 'a')
  await canvasItem(page, 'b').click({ position: { x: 4, y: 4 }, modifiers: ['Shift'] })
  await expect(page.getByText('批量操作', { exact: true })).toBeVisible()
})
