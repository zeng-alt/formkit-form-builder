// @vitest-environment happy-dom
// ═══ X：字段按需加载——FormRenderer 渲染含日期字段的表单 ═══════════════════════════
// 全局测试预热（src/test-setup/preload-lazy-elements.ts）会在每个测试文件开始前
// 把全部按需类型都加载一遍，是为了不让既有渲染测试的 nextTick 断言变得不稳定；
// 但这份用例恰恰要验证"加载中 → 加载完成"这个过渡本身，所以先用
// __resetLoadStateForTesting 把 date 的缓存清空，模拟它还没被加载过。
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import { NDatePicker } from 'naive-ui'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'
import { __resetLoadStateForTesting } from '@/elements/component-loader'

function buildDefinition(): FormDefinition {
  const field = getElementTypeDef('date')!.defaults() as FieldNode
  field.name = 'birthday'
  field.label = '生日'
  return {
    version: DSL_VERSION,
    id: 'lazy-date-test',
    name: 'lazy-date-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [field],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

/** 真实等待（微任务 + 少量宏任务），直到条件成立或超时——按需组件是真的 import()，
 *  单纯 nextTick 等不到它 resolve（见 test-setup 顶部注释）。 */
async function waitUntil(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitUntil 等待超时')
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

describe('FormRenderer 真实渲染：日期字段按需加载', () => {
  it('加载完成前不渲染日期字段，加载完成后正常显示，且没有未处理错误', async () => {
    __resetLoadStateForTesting('date')

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {} },
    })

    await nextTick()
    // 加载完成前：日期字段还没渲染出来（骨架占位撑住高度，而不是真正的输入控件）
    expect(wrapper.findComponent(NDatePicker).exists()).toBe(false)

    await waitUntil(() => wrapper.findComponent(NDatePicker).exists())

    expect(wrapper.findComponent(NDatePicker).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('组件加载失败')

    wrapper.unmount()
  })
})
