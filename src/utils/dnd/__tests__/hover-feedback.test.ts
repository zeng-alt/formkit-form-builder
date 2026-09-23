// @vitest-environment happy-dom
// ═══ L2/L3：容器高亮标签 + 拒绝反馈浮层——DOM 层行为单测 ══════════════════════
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearHoverFeedback,
  hideContainerHighlight,
  hideRejectBadge,
  showContainerHighlight,
  showRejectBadge,
} from '@/utils/dnd/hover-feedback'

afterEach(() => {
  clearHoverFeedback()
})

describe('容器高亮标签', () => {
  it('显示时创建浮层并写入标签文案，位置贴着目标元素', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.getBoundingClientRect = () =>
      ({ top: 10, left: 20, width: 100, height: 50, bottom: 60, right: 120 }) as DOMRect

    showContainerHighlight(el, '放入：卡片容器')

    const label = document.querySelector('[data-dnd-overlay="container-label"]') as HTMLElement
    const box = document.querySelector('[data-dnd-overlay="container-highlight"]') as HTMLElement
    expect(label).toBeTruthy()
    expect(box).toBeTruthy()
    expect(label.textContent).toBe('放入：卡片容器')
    expect(label.style.display).toBe('block')
    expect(box.style.display).toBe('block')
    expect(box.style.width).toBe('100px')
    expect(box.style.height).toBe('50px')
  })

  it('隐藏后浮层 display 变回 none（节点复用，不销毁）', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 10, height: 10, bottom: 10, right: 10 }) as DOMRect
    showContainerHighlight(el, 'x')
    hideContainerHighlight()
    const label = document.querySelector('[data-dnd-overlay="container-label"]') as HTMLElement
    const box = document.querySelector('[data-dnd-overlay="container-highlight"]') as HTMLElement
    expect(label.style.display).toBe('none')
    expect(box.style.display).toBe('none')
  })
})

describe('拒绝反馈徽标', () => {
  it('显示标题与原因两行文案', () => {
    showRejectBadge(100, 200, '不能放在这里', '按钮组只能放按钮')
    const badge = document.querySelector('[data-dnd-overlay="reject-badge"]') as HTMLElement
    expect(badge.style.display).toBe('block')
    expect(badge.textContent).toBe('不能放在这里按钮组只能放按钮')
  })

  it('不传原因时只显示标题', () => {
    showRejectBadge(0, 0, '不能放在这里')
    const badge = document.querySelector('[data-dnd-overlay="reject-badge"]') as HTMLElement
    expect(badge.textContent).toBe('不能放在这里')
  })

  it('hideRejectBadge 后 display 变回 none', () => {
    showRejectBadge(0, 0, '不能放在这里')
    hideRejectBadge()
    const badge = document.querySelector('[data-dnd-overlay="reject-badge"]') as HTMLElement
    expect(badge.style.display).toBe('none')
  })
})

describe('clearHoverFeedback', () => {
  it('同时隐藏高亮与拒绝徽标', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    el.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 10, height: 10, bottom: 10, right: 10 }) as DOMRect
    showContainerHighlight(el, 'x')
    showRejectBadge(0, 0, '不能放在这里')
    clearHoverFeedback()
    expect(
      (document.querySelector('[data-dnd-overlay="container-label"]') as HTMLElement).style.display,
    ).toBe('none')
    expect(
      (document.querySelector('[data-dnd-overlay="reject-badge"]') as HTMLElement).style.display,
    ).toBe('none')
  })
})
