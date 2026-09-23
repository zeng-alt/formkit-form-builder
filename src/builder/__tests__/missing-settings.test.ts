// @vitest-environment happy-dom
// ═══ H2：设计器载入缺 settings 的定义不应白屏 ═══════════════════════════════════
// 背景同 src/renderer/__tests__/missing-settings.test.ts：FormDefinition.settings
// 类型上必填，但外部生成/手写的定义可能漏掉，schema-adapter 的 buildSchema 直接读
// settings.labelAlign 会抛错——这里挂载完整 BuilderMain（画布 setup 里会同步读
// formSchema），确认不会因此抛错导致整页空白。
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
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
  }
  return def as FormDefinition
}

describe('H2：设计器缺 settings 不白屏', () => {
  it('挂载 BuilderMain 不抛错，画布正常渲染出字段', async () => {
    const def = buildDefWithoutSettings()
    const wrapper = mount(BuilderMain, {
      props: { modelValue: def },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    expect(wrapper.text()).toContain('用户名')
    wrapper.unmount()
  })
})
