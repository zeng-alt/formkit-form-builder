// @vitest-environment happy-dom
// ═══ H2：定义缺少 settings 时不应白屏 ═══════════════════════════════════════════
// 背景：FormDefinition.settings 类型上必填，但外部生成/手写的定义可能漏掉。
// schema-adapter 的 buildSchema 直接读 settings.labelAlign，缺失时抛错——
// FormRenderer 的入口（definitionSnapshot / renderDefinition）统一走 ensureDslKeys
// 兜底默认 settings（与设计器同源），这里验证缺 settings 的定义也能正常渲染出字段。
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 4; i++) await nextTick()
}

function buildDefWithoutSettings(): FormDefinition {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.name = 'username'
  field.label = '用户名'
  const def: Partial<FormDefinition> = {
    version: DSL_VERSION,
    id: 'missing-settings',
    name: 'missing-settings',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [field],
    },
    // 故意不带 settings
  }
  return def as FormDefinition
}

describe('H2：缺 settings 的定义不白屏', () => {
  it('FormRenderer 能正常渲染出字段，不抛错', async () => {
    const def = buildDefWithoutSettings()
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()
    expect(wrapper.text()).toContain('用户名')
    expect(wrapper.find('input').exists()).toBe(true)
    wrapper.unmount()
  })
})
