// @vitest-environment happy-dom
// ═══ B1：表单级设置——操作区按钮（禁用/只读时隐藏、按钮文字、显示重置） ═══════════
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function buildDefinition(): FormDefinition {
  const textField = getElementTypeDef('text')!.defaults() as FieldNode
  textField.name = 'txt'
  return {
    version: DSL_VERSION,
    id: 'form-settings-actions',
    name: 'form-settings-actions',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [textField],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

describe('FormRenderer：settings.disabled / readonly 时隐藏默认操作区按钮', () => {
  it('settings.disabled=true：不渲染提交/重置按钮', async () => {
    const def = buildDefinition()
    def.settings = { ...def.settings, disabled: true }
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {}, actions: true },
    })
    await settle()

    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('settings.readonly=true：不渲染提交/重置按钮', async () => {
    const def = buildDefinition()
    def.settings = { ...def.settings, readonly: true }
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {}, actions: true },
    })
    await settle()

    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('未禁用/只读：正常渲染提交/重置按钮', async () => {
    const def = buildDefinition()
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {}, actions: true },
    })
    await settle()

    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('FormRenderer：settings.submitText / resetText / showReset', () => {
  it('submitText / resetText 覆盖默认按钮文案', async () => {
    const def = buildDefinition()
    def.settings = { ...def.settings, submitText: '立即提交', resetText: '清空重填' }
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {}, actions: true },
    })
    await settle()

    expect(wrapper.text()).toContain('立即提交')
    expect(wrapper.text()).toContain('清空重填')
    wrapper.unmount()
  })

  it('showReset:false 时只隐藏重置按钮，提交按钮仍然显示', async () => {
    const def = buildDefinition()
    def.settings = { ...def.settings, showReset: false }
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {}, actions: true },
    })
    await settle()

    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    // 重置按钮没有专门的选择器标记，用按钮总数间接断言：默认两个按钮，隐藏后只剩一个
    expect(wrapper.findAll('button').length).toBe(1)
    wrapper.unmount()
  })
})
