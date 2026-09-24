// @vitest-environment happy-dom
// ═══ B1：表单级设置（size/disabled/readonly）通过 definition.settings 级联 ═════════
// 与既有的 form-disabled.test.ts（FormRenderer 自身 disabled prop 级联）互补：这里
// 验证的是新通道——settings.disabled/readonly/size 不经 FormKit 的 disabled 级联，
// 而是 use-schema-attrs.ts 直接读 useFormDefinition() 注入的表单定义（见该文件注释）。
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import { NInput, NSelect } from 'naive-ui'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function collectClasses(root: Element): Set<string> {
  const set = new Set<string>()
  root.classList.forEach((c) => set.add(c))
  root.querySelectorAll('*').forEach((el) => el.classList.forEach((c) => set.add(c)))
  return set
}

function deriveDisabledMarker(component: typeof NSelect): string {
  const on = mount(component, { props: { disabled: true } })
  const off = mount(component, { props: { disabled: false } })
  const diff = [...collectClasses(on.element)].filter((c) => !collectClasses(off.element).has(c))
  on.unmount()
  off.unmount()
  if (diff.length === 0) throw new Error('未能推导出禁用标记 class')
  return diff[0]!
}

function buildDefinition(children: FieldNode[]): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'form-settings-cascade',
    name: 'form-settings-cascade',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children,
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

describe('FormRenderer：settings.disabled 级联到每个字段', () => {
  it('settings.disabled=true 时，文本字段与下拉字段都应处于禁用态', async () => {
    const textField = getElementTypeDef('text')!.defaults() as FieldNode
    textField.name = 'txt'
    const selectField = getElementTypeDef('select')!.defaults() as FieldNode
    selectField.name = 'sel'

    const def = buildDefinition([textField, selectField])
    def.settings = { ...def.settings, disabled: true }

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()

    expect(wrapper.find('.n-input').classes()).toContain('n-input--disabled')
    const selectMarker = deriveDisabledMarker(NSelect)
    expect(collectClasses(wrapper.find('.n-select').element)).toContain(selectMarker)

    wrapper.unmount()
  })
})

describe('FormRenderer：settings.readonly 级联——原生支持只读的字段真只读，其余退化为禁用', () => {
  it('text 字段获得原生 readonly；select 字段没有只读语义，退化为禁用', async () => {
    const textField = getElementTypeDef('text')!.defaults() as FieldNode
    textField.name = 'txt'
    const selectField = getElementTypeDef('select')!.defaults() as FieldNode
    selectField.name = 'sel'

    const def = buildDefinition([textField, selectField])
    def.settings = { ...def.settings, readonly: true }

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()

    expect(wrapper.find('input[readonly]').exists()).toBe(true)
    const selectMarker = deriveDisabledMarker(NSelect)
    expect(collectClasses(wrapper.find('.n-select').element)).toContain(selectMarker)

    wrapper.unmount()
  })
})

describe('FormRenderer：settings.size 级联——字段自身未设置 size 时才继承', () => {
  it('未设置 size 的字段继承 settings.size；自身已设置 size 的字段保持不变', async () => {
    const inherited = getElementTypeDef('text')!.defaults() as FieldNode
    inherited.name = 'inherited'
    const ownSize = getElementTypeDef('text')!.defaults() as FieldNode
    ownSize.name = 'ownSize'
    ownSize.props = { ...ownSize.props, size: 'small' }

    const def = buildDefinition([inherited, ownSize])
    def.settings = { ...def.settings, size: 'large' }

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()

    const inputs = wrapper.findAllComponents(NInput)
    expect(inputs).toHaveLength(2)
    expect(inputs[0]!.classes()).toContain('n-input--large-size')
    expect(inputs[1]!.classes()).toContain('n-input--small-size')

    wrapper.unmount()
  })
})
