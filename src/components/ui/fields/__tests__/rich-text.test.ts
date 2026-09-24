// @vitest-environment happy-dom
// ═══ 富文本字段（richText）真实渲染集成测试 ═══════════════════════════════════
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

function buildDefinition(opts: { value?: string; disabled?: boolean; readonly?: boolean } = {}) {
  const field = getElementTypeDef('richText')!.defaults() as FieldNode
  field.name = 'bio'
  field.label = 'Bio'
  if (opts.value !== undefined) field.value = opts.value
  if (opts.disabled) field.props = { ...field.props, disabled: true }
  if (opts.readonly) field.props = { ...field.props, readonly: true }

  const def: FormDefinition = {
    version: DSL_VERSION,
    id: 'rich-text-test-form',
    name: 'rich-text-test-form',
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
  return def
}

describe('FormRenderer 真实渲染：富文本字段（richText）', () => {
  it('画布上渲染 contenteditable 编辑器 + 工具栏（默认全开）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {} },
    })
    await settle()

    const editor = wrapper.find('.rich-text-editor')
    expect(editor.exists()).toBe(true)
    expect(editor.attributes('contenteditable')).toBe('true')
    // 默认全开：工具栏应包含加粗按钮
    expect(wrapper.find('.i-lucide-bold').exists()).toBe(true)
    expect(wrapper.find('.i-lucide-link-2').exists()).toBe(true)

    wrapper.unmount()
  })

  it('初始值里的危险标签在渲染前已被清洗', async () => {
    const dirty = '<p>安全</p><script>alert(1)</script><div onclick="x()">未知标签</div>'
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition({ value: dirty }), modelValue: {} },
    })
    await settle()

    const editor = wrapper.find('.rich-text-editor')
    expect(editor.html()).not.toContain('<script')
    expect(editor.html()).not.toContain('onclick')
    expect(editor.text()).toContain('安全')
    expect(editor.text()).toContain('未知标签')

    wrapper.unmount()
  })

  it('输入时清洗后的值写回表单数据（onInput → update:modelValue）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {} },
    })
    await settle()

    const editor = wrapper.get('.rich-text-editor')
    const el = editor.element as HTMLDivElement
    el.innerHTML = '<p>你好<img src="x" onerror="x()">世界</p>'
    await editor.trigger('input')
    await settle()
    // FormKit 的 input → 表单级 update:modelValue 经过一次内部防抖，纯 nextTick 不够，
    // 补一个真实的宏任务等待
    await new Promise((r) => setTimeout(r, 30))

    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1]![0] as Record<string, unknown>
    expect(last.bio).toBe('<p>你好世界</p>')

    wrapper.unmount()
  })

  it('禁用 / 只读：不可编辑，不显示工具栏', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition({ readonly: true }), modelValue: {} },
    })
    await settle()

    const editor = wrapper.find('.rich-text-editor')
    expect(editor.attributes('contenteditable')).toBe('false')
    expect(wrapper.find('.i-lucide-bold').exists()).toBe(false)

    wrapper.unmount()
  })

  it('整表单 disabled=true：级联到富文本字段，同样不可编辑', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {}, disabled: true },
    })
    await settle()

    const editor = wrapper.find('.rich-text-editor')
    expect(editor.attributes('contenteditable')).toBe('false')

    wrapper.unmount()
  })
})
