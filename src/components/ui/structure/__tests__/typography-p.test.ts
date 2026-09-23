// @vitest-environment happy-dom
// ═══ 段落主题：编辑面板的「主题」选项必须真的改变段落颜色 ═══════════════════════
// 段落编辑器提供 default / primary / info / success / warning / error 主题，但 naive-ui
// 的 NP 只有 depth 一个自有 prop、没有 type——此前 <NP :type="theme"> 只会在 <p> 上
// 留下一个无意义的 HTML 属性，选什么主题都没有视觉效果。
//
// NText 不用 class 表达主题，而是写进内联 CSS 变量 --n-text-color。为避免在测试里
// 硬编码颜色值，以"裸挂载一个同参数的 NText"作为基准：段落渲染出的文字颜色必须与
// naive-ui 自身对同样 type / depth 渲染出的颜色一致。
import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { NText } from 'naive-ui'
import type { FormKitFrameworkContext } from '@formkit/core'
import NaiveTypographyP from '@/components/ui/structure/NaiveTypographyP.vue'

function contextOf(attrs: Record<string, unknown>): FormKitFrameworkContext {
  return { attrs, _value: '' } as unknown as FormKitFrameworkContext
}

const textColorOf = (el: Element | null | undefined) =>
  (el as HTMLElement | null | undefined)?.style.getPropertyValue('--n-text-color') ?? ''

function expectedColor(type: string, depth: number): string {
  const oracle = mount(() => h(NText, { type: type as never, depth: depth as never }, () => 'x'))
  const color = textColorOf(oracle.element)
  oracle.unmount()
  return color
}

function renderedColor(theme: string, depth: number): string {
  const wrapper = mount(NaiveTypographyP, {
    props: { context: contextOf({ text: '段落', theme, depth }) },
  })
  const color = textColorOf(wrapper.element.querySelector('.n-text'))
  wrapper.unmount()
  return color
}

describe('NaiveTypographyP：主题与深度', () => {
  it.each(['primary', 'info', 'success', 'warning', 'error'])(
    'theme=%s 时，段落文字颜色与 naive-ui 同主题文本一致',
    (theme) => {
      const expected = expectedColor(theme, 1)
      expect(expected).not.toBe('')
      expect(renderedColor(theme, 1)).toBe(expected)
    },
  )

  it('theme=default 时按 depth 着色', () => {
    for (const depth of [1, 2, 3]) {
      expect(renderedColor('default', depth)).toBe(expectedColor('default', depth))
    }
  })

  it('不同主题渲染出的颜色互不相同（主题确实生效，而不是全部落到默认色）', () => {
    const colors = new Set(['default', 'success', 'error'].map((t) => renderedColor(t, 1)))
    expect(colors.size).toBe(3)
  })
})

// 编辑面板的对齐选项是 start / center / end。此前 align 经透传落成 <p align="...">，而
// HTML 的 align 属性只认 left / right / center / justify——start / end 都是非法值会被
// 浏览器忽略，只有 center 生效。改由 CSS text-align 表达，它原生支持 start / end。
describe('NaiveTypographyP：对齐', () => {
  it.each(['start', 'center', 'end'])('align=%s 落到段落的 CSS text-align 上', (align) => {
    const wrapper = mount(NaiveTypographyP, {
      props: { context: contextOf({ text: '段落', theme: 'default', depth: 1, align }) },
    })
    const p = wrapper.element.tagName === 'P' ? wrapper.element : wrapper.element.querySelector('p')
    expect((p as HTMLElement).style.textAlign).toBe(align)
    // 不再依赖已废弃、且不接受 start / end 的 HTML align 属性
    expect(p!.hasAttribute('align')).toBe(false)
    wrapper.unmount()
  })
})
