// @vitest-environment happy-dom
// ═══ 空容器放下后高亮描边不残留 ═══════════════════════════════════════════════════
// dragover 会连续触发，plugin.ts 每次都给空容器加 dropZoneClass。库的 addClass 在类名已存在时
// 默认把它记进 privateClasses（当成元素自带的类），removeClass 随后跳过这些类：
// 拖进空画布放下后，紫色 ring 描边一直留在画布上。plugin.ts 调用时传 omitAppendPrivateClass=true。
import { describe, expect, it } from 'vitest'
import { addParentClass, dragAndDrop, removeClass } from '@formkit/drag-and-drop'
import { CANVAS_DROP_ZONE_CLASS } from '@/utils/dnd/drag-classes'

function registeredParent() {
  const parent = document.createElement('ul')
  document.body.appendChild(parent)
  dragAndDrop({ parent, getValues: () => [], setValues: () => {} })
  return parent
}

describe('dropZoneClass 清理', () => {
  it('重复添加（omitAppendPrivateClass=true）后仍能移除', () => {
    const parent = registeredParent()
    addParentClass([parent], CANVAS_DROP_ZONE_CLASS, true)
    addParentClass([parent], CANVAS_DROP_ZONE_CLASS, true)
    removeClass([parent], CANVAS_DROP_ZONE_CLASS)
    expect(parent.className).toBe('')
  })

  it('不传第三个参数时重复添加会残留（库的行为，说明为什么必须传 true）', () => {
    const parent = registeredParent()
    addParentClass([parent], CANVAS_DROP_ZONE_CLASS)
    addParentClass([parent], CANVAS_DROP_ZONE_CLASS)
    removeClass([parent], CANVAS_DROP_ZONE_CLASS)
    expect(parent.classList.contains('ring-1')).toBe(true)
  })
})
