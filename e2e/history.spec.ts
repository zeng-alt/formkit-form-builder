// ═══ T2 用例 4：撤销 / 重做 + 历史面板 ═════════════════════════════════════════
import {
  test,
  expect,
  definitionOf,
  gotoWithDefinition,
  rootDropArea,
  dragPaletteItem,
  focusBlankCanvasArea,
  historyEntryButton,
} from './helpers'

test('拖入元素后 Ctrl+Z 消失、Ctrl+Shift+Z 恢复，历史面板能看到对应条目', async ({ page }) => {
  await gotoWithDefinition(page, definitionOf([]))
  const root = rootDropArea(page)

  await dragPaletteItem(page, '字段', '文本', root, 0.5)
  await expect(page.locator('[data-canvas-item="true"]')).toHaveCount(1)

  // 快捷键监听挂在 BuilderMain 根节点，靠事件冒泡触发——焦点必须落在它子树内的
  // 非文本控件上（见 helpers.ts focusBlankCanvasArea 的说明），否则 Ctrl+Z 不生效。
  await focusBlankCanvasArea(page)
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-canvas-item="true"]')).toHaveCount(0)

  await page.keyboard.press('Control+Shift+z')
  await expect(page.locator('[data-canvas-item="true"]')).toHaveCount(1)

  await historyEntryButton(page).click()
  // 拖拽插入落的 reason 是 'dnd'（见 history-reasons.ts），面板文案「拖拽排序」；
  // 最早的「初始状态」条目始终存在。两条都能看到即历史面板正常记录了这次操作。
  await expect(page.getByText('拖拽排序', { exact: true })).toBeVisible()
  await expect(page.getByText('初始状态', { exact: true })).toBeVisible()
})
