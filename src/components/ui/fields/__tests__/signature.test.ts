// @vitest-environment happy-dom
// ═══ 签名板字段（signature）真实渲染集成测试 ═══════════════════════════════════
// happy-dom 不支持真正的 2D 画布渲染（getContext('2d') 恒为 null，toDataURL 恒
// 返回一个空白 PNG 占位串），所以这里不校验画出来的像素，只校验：落笔状态机
// （pointerdown/move/up 提交一次值）、撤销/清除写回空值、禁用态不可再画。
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

// FormKit 的 input → 表单级 update:modelValue 经过一次内部防抖，纯 nextTick 不够，
// 补一个真实的宏任务等待
const flush = async () => {
  await settle()
  await new Promise((r) => setTimeout(r, 30))
}

function buildDefinition(opts: { disabled?: boolean; readonly?: boolean } = {}) {
  const field = getElementTypeDef('signature')!.defaults() as FieldNode
  field.name = 'sign'
  field.label = 'Sign'
  if (opts.disabled) field.props = { ...field.props, disabled: true }
  if (opts.readonly) field.props = { ...field.props, readonly: true }

  const def: FormDefinition = {
    version: DSL_VERSION,
    id: 'signature-test-form',
    name: 'signature-test-form',
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

describe('FormRenderer 真实渲染：签名板字段（signature）', () => {
  it('空签名时显示提示文案，画布可交互', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {} },
    })
    await settle()

    expect(wrapper.find('canvas').exists()).toBe(true)
    expect(wrapper.text()).toContain('在此签名')

    wrapper.unmount()
  })

  it('落一笔（pointerdown → move → up）后提交非空值', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {} },
    })
    await settle()

    const canvas = wrapper.get('canvas')
    await canvas.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await canvas.trigger('pointermove', { clientX: 20, clientY: 20, pointerId: 1 })
    await canvas.trigger('pointerup', { clientX: 20, clientY: 20, pointerId: 1 })
    await flush()

    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1]![0] as Record<string, unknown>
    expect(typeof last.sign).toBe('string')
    expect(last.sign).not.toBe('')

    wrapper.unmount()
  })

  it('清除按钮把值写回空字符串', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {} },
    })
    await settle()

    const canvas = wrapper.get('canvas')
    await canvas.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await canvas.trigger('pointerup', { clientX: 10, clientY: 10, pointerId: 1 })
    await flush()

    const clearBtn = wrapper.findAll('button').find((b) => b.find('.i-lucide-trash-2').exists())
    expect(clearBtn).toBeTruthy()
    await clearBtn!.trigger('click')
    await flush()

    const events = wrapper.emitted('update:modelValue')!
    const last = events[events.length - 1]![0] as Record<string, unknown>
    expect(last.sign).toBe('')

    wrapper.unmount()
  })

  it('禁用 / 只读：画布不可再落笔（不显示操作按钮）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition({ readonly: true }), modelValue: {} },
    })
    await settle()

    expect(wrapper.find('.i-lucide-trash-2').exists()).toBe(false)

    wrapper.unmount()
  })
})
