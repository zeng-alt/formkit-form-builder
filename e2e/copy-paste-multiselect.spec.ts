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

  // 给后面的字段 b 的 FormKit 外层元素打个标记：粘贴插在 a 之后，b 只是下标后移，
  // 它的字段不应该被卸载重建（曾因画布条目内 FormKitSchema 用下标做 key 而整个重建，
  // 复制后立刻粘贴时偶发 insertBefore of null 的页面错误）
  await canvasItem(page, 'b')
    .locator('.formkit-outer')
    .first()
    .evaluate((el) => ((el as HTMLElement).dataset.e2eMark = 'kept'))

  // 点在条目角落而不是内部 FormKit 输入框：点进输入框会让焦点落在 <input> 上，
  // use-keyboard-shortcuts.ts 的 isEditableTarget() 判定为"正在打字"，Ctrl+C/V
  // 会被放行给输入框本身而不是触发画布命令层
  await selectCanvasItem(page, 'a')
  // 复制后立刻粘贴，中间不等待：这正是之前偶发页面错误的操作节奏
  await page.keyboard.press('Control+c')
  await page.keyboard.press('Control+v')
  await expect(page.locator('[data-canvas-item="true"]')).toHaveCount(3)
  await expect(canvasItem(page, 'b').locator('.formkit-outer[data-e2e-mark="kept"]')).toHaveCount(1)

  await selectCanvasItem(page, 'a')
  await canvasItem(page, 'b').click({ position: { x: 4, y: 4 }, modifiers: ['Shift'] })
  await expect(page.getByText('批量操作', { exact: true })).toBeVisible()
})
