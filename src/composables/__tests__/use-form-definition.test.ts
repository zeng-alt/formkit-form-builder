// @vitest-environment happy-dom
// ═══ 窄只读上下文单测：provideFormDefinition / useFormDefinition ══════════════════
// 覆盖点：
// 1. provider 子树内能读到定义，definition 变化时派生 computed 跟着变。
// 2. 子树外调用直接报错（对齐 useFormBuilderState 的严格化做法，见
//    src/state/__tests__/multi-instance.test.ts）。
import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { provideFormDefinition, useFormDefinition } from '@/composables/use-form-definition'
import { DSL_VERSION } from '@/types/dsl'
import type { FormDefinition } from '@/types/dsl'

function makeDefinition(overrides: Partial<FormDefinition>): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'def-a',
    name: 'FormA',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
    ...overrides,
  }
}

const Consumer = defineComponent({
  name: 'FormDefinitionConsumer',
  setup() {
    const { formId, formVersion, formName } = useFormDefinition()
    return () => h('div', `${formId.value}|${formVersion.value}|${formName.value}`)
  },
})

describe('provideFormDefinition / useFormDefinition', () => {
  it('provider 子树内能读到定义派生的只读信息', () => {
    const source = ref(makeDefinition({ id: 'def-a', version: 1, name: 'FormA' }))
    const Host = defineComponent({
      setup() {
        provideFormDefinition(source)
        return () => h(Consumer)
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.text()).toBe('def-a|1|FormA')
    wrapper.unmount()
  })

  it('definition 变化时，消费方读到的 computed 跟着变', async () => {
    const source = ref(makeDefinition({ id: 'def-a', version: 1, name: 'FormA' }))
    const Host = defineComponent({
      setup() {
        provideFormDefinition(source)
        return () => h(Consumer)
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.text()).toBe('def-a|1|FormA')

    source.value = makeDefinition({ id: 'def-b', version: 2, name: 'FormB' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toBe('def-b|2|FormB')
    wrapper.unmount()
  })

  it('子树外调用 useFormDefinition() 直接报错', () => {
    expect(() => mount(Consumer)).toThrow(/useFormDefinition\(\) 必须在/)
  })
})
