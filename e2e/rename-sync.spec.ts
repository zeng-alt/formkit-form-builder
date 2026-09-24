// ═══ T2 用例 7：改名同步引用 ═══════════════════════════════════════════════════
import {
  test,
  expect,
  definitionOf,
  field,
  eqExpr,
  gotoWithDefinition,
  selectCanvasItem,
  focusBlankCanvasArea,
  readStoredDefinition,
} from './helpers'
import type { FieldNode } from '../src/types/dsl'

test('把 a 改名为 a2 后，b 的 visibleIf 同步更新引用；撤销一次后两者一起恢复', async ({ page }) => {
  const definition = definitionOf([
    field({ id: 'a', type: 'text', label: 'A字段' }),
    field({ id: 'b', type: 'text', label: 'B字段', visibleIf: eqExpr('a', 'x') }),
  ])
  await gotoWithDefinition(page, definition)

  await selectCanvasItem(page, 'a')
  const nameInput = page.getByPlaceholder('字段名')
  await nameInput.fill('a2')

  // 改名同步引用有 600ms 防抖才弹 toast（见 NameInput.vue scheduleRenameToast），
  // 用 toast 出现作为"已经同步完成"的信号，而不是写死等待时长
  await expect(page.getByText(/已同步更新/)).toBeVisible()

  await expect
    .poll(async () => {
      const stored = await readStoredDefinition(page)
      const bNode = stored.root.children.find((c) => c.id === 'b') as FieldNode | undefined
      return bNode?.visibleIf
    })
    .toEqual(eqExpr('a2', 'x'))

  // 撤销一次：改名同步引用是一次提交（一个历史条目），撤销要把 a 的名字和 b 的
  // 引用一起还原，而不是只回退其中一半
  await focusBlankCanvasArea(page)
  await page.keyboard.press('Control+z')

  await expect
    .poll(async () => {
      const stored = await readStoredDefinition(page)
      const aNode = stored.root.children.find((c) => c.id === 'a') as FieldNode | undefined
      const bNode = stored.root.children.find((c) => c.id === 'b') as FieldNode | undefined
      return { aName: aNode?.name, bVisibleIf: bNode?.visibleIf }
    })
    .toEqual({ aName: 'a', bVisibleIf: eqExpr('a', 'x') })
})
