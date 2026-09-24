// @vitest-environment happy-dom
// ═══ E1：结构树 ↔ 画布联动小工具——DOM 层行为单测 ═══════════════════════════════
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  findCanvasItemEl,
  hideStructureHoverOverlay,
  scrollCanvasItemIntoView,
  showStructureHoverOverlay,
} from '@/utils/canvas-locate'

function makeCanvasItem(key: string, rect: Partial<DOMRect> = {}) {
  const el = document.createElement('li')
  el.setAttribute('data-item-key', key)
  el.getBoundingClientRect = () =>
    ({ top: 0, left: 0, width: 100, height: 40, bottom: 40, right: 100, ...rect }) as DOMRect
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  hideStructureHoverOverlay()
  // 只清掉测试自己创建的画布条目：悬停浮层节点是模块级单例、复用不销毁（同
  // hover-feedback.ts 的设计），不能连它一起清空，否则下个用例里 ensureHoverBox()
  // 会因为「已存在」而跳过重新挂载，留下一个脱离 document 的孤儿节点。
  document.querySelectorAll('[data-item-key]').forEach((el) => el.remove())
})

describe('findCanvasItemEl', () => {
  it('按 data-item-key 定位画布条目', () => {
    const el = makeCanvasItem('k1')
    expect(findCanvasItemEl('k1')).toBe(el)
  })

  it('找不到时返回 null，不抛错', () => {
    expect(findCanvasItemEl('not-exist')).toBeNull()
  })

  it('空 key 直接返回 null', () => {
    expect(findCanvasItemEl('')).toBeNull()
  })
})

describe('scrollCanvasItemIntoView', () => {
  it('找到对应元素时调用 scrollIntoView 并居中', () => {
    const el = makeCanvasItem('k2')
    const spy = vi.spyOn(el, 'scrollIntoView')
    const found = scrollCanvasItemIntoView('k2')
    expect(found).toBe(el)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth', block: 'center' }),
    )
  })

  it('找不到时不抛错，返回 null', () => {
    expect(scrollCanvasItemIntoView('missing')).toBeNull()
  })
})

describe('showStructureHoverOverlay / hideStructureHoverOverlay', () => {
  it('显示时创建浮层并贴合目标元素位置', () => {
    const el = makeCanvasItem('k3', { top: 10, left: 20, width: 80, height: 30 })
    showStructureHoverOverlay('k3')
    const box = document.querySelector('[data-structure-tree-overlay="hover"]') as HTMLElement
    expect(box).toBeTruthy()
    expect(box.style.display).toBe('block')
    expect(box.style.top).toBe('10px')
    expect(box.style.left).toBe('20px')
    expect(box.style.width).toBe('80px')
    expect(box.style.height).toBe('30px')
    void el
  })

  it('隐藏后浮层 display 变回 none（节点复用，不销毁）', () => {
    makeCanvasItem('k4')
    showStructureHoverOverlay('k4')
    hideStructureHoverOverlay()
    const box = document.querySelector('[data-structure-tree-overlay="hover"]') as HTMLElement
    expect(box.style.display).toBe('none')
  })

  it('目标元素不存在时不创建浮层（或已存在的浮层被隐藏）', () => {
    showStructureHoverOverlay('nope')
    const box = document.querySelector(
      '[data-structure-tree-overlay="hover"]',
    ) as HTMLElement | null
    if (box) expect(box.style.display).toBe('none')
  })
})
