// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：FormRenderer 子树里的 useFormDefinition() ══════════════════
// 覆盖 createMinimalFormBuilderState 被删除后的替代实现：FormRenderer 不再伪造一份
// 完整 FormBuilderState，只 provide 一个窄的 FormDefinition 上下文（见
// src/composables/use-form-definition.ts）。这里验证子树组件确实能读到 FormRenderer
// 传入的 definition 派生出的 formId / formVersion / formName —— 而不仅仅是类型能过。
import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { useFormDefinition } from '@/composables/use-form-definition'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { ContainerNode, FormDefinition } from '@/types/dsl'

// 探针组件：顶替 schemaLibrary 里 card 容器的预览组件，只读 useFormDefinition()
// 并把结果原样吐进 DOM 文本，不关心 card 本身的渲染细节。
const FormDefinitionProbe = defineComponent({
  name: 'FormDefinitionProbe',
  setup() {
    const { formId, formVersion, formName } = useFormDefinition()
    return () =>
      h('div', { 'data-testid': 'probe' }, `${formId.value}|${formVersion.value}|${formName.value}`)
  },
})

function buildDefinition(overrides: Partial<FormDefinition>): FormDefinition {
  const cardNode = getElementTypeDef('card')!.defaults() as ContainerNode
  cardNode.children = []
  return {
    version: DSL_VERSION,
    id: 'probe-form',
    name: 'probe-form-name',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [cardNode],
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
    ...overrides,
  }
}

describe('FormRenderer 真实渲染：子树内 useFormDefinition()', () => {
  it('能读到 FormRenderer definition prop 派生的 formId/formVersion/formName', () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildDefinition({ id: 'form-a', version: 3, name: 'FormA' }),
        schemaLibrary: { ...getPreviewSchemaLibrary(), card: FormDefinitionProbe },
      },
    })

    expect(wrapper.get('[data-testid="probe"]').text()).toBe('form-a|3|FormA')

    wrapper.unmount()
  })

  it('definition prop 变化时，子树读到的值跟着变（provide 的是稳定 ref，不是每次重建）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildDefinition({ id: 'form-a', version: 1, name: 'FormA' }),
        schemaLibrary: { ...getPreviewSchemaLibrary(), card: FormDefinitionProbe },
      },
    })
    expect(wrapper.get('[data-testid="probe"]').text()).toBe('form-a|1|FormA')

    await wrapper.setProps({
      definition: buildDefinition({ id: 'form-b', version: 2, name: 'FormB' }),
    })
    await nextTick()

    expect(wrapper.get('[data-testid="probe"]').text()).toBe('form-b|2|FormB')

    wrapper.unmount()
  })
})
