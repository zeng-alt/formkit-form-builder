// @vitest-environment happy-dom
// ═══ 回归测试：Alert「显示图标」开关必须真的能关掉图标 ═══════════════════════════
// 背景：showIcon 命中 FormKit useInput.ts 的 pseudoProps 表（/^[a-zA-Z-]+(?:-icon|Icon)$/），
// 会被拦截、不会流入 context.attrs，因此也不会出现在 useSchemaAttrs 镜像出的
// config/props 里——落进的是 context.showIcon（见 NaiveAlert.vue 顶部注释、任务报告
// 里贴的实测输出）。NAlert 的 showIcon 默认是 true，静默丢失转发时表现为：开关看似
// 能拨，图标却怎么都关不掉。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FormKitFrameworkContext } from '@formkit/core'
import NaiveAlert from '@/components/ui/structure/NaiveAlert.vue'

function contextOf(showIcon?: boolean): FormKitFrameworkContext {
  return {
    attrs: { title: 'Title', content: 'Alert', theme: 'default' },
    _value: '',
    showIcon,
  } as unknown as FormKitFrameworkContext
}

describe('NaiveAlert：显示图标开关', () => {
  it('showIcon:false 时图标元素不应存在（修复前为红）', () => {
    const wrapper = mount(NaiveAlert, { props: { context: contextOf(false) } })
    expect(wrapper.find('.n-alert__icon').exists()).toBe(false)
    wrapper.unmount()
  })

  it('showIcon:true 时图标元素应存在', () => {
    const wrapper = mount(NaiveAlert, { props: { context: contextOf(true) } })
    expect(wrapper.find('.n-alert__icon').exists()).toBe(true)
    wrapper.unmount()
  })

  it('showIcon 未设置时默认显示图标（与 NAlert 自身默认值一致）', () => {
    const wrapper = mount(NaiveAlert, { props: { context: contextOf(undefined) } })
    expect(wrapper.find('.n-alert__icon').exists()).toBe(true)
    wrapper.unmount()
  })
})
