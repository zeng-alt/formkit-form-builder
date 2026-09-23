// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：评分（naiveRate）字段的"禁用" ═══════════════════════════
// 背景：编辑面板给评分挂了一个通用的"禁用"开关（NaiveBasicSection 的 disabled），
// 但底层 NRate 并不声明 disabled prop（naive-ui 只给了 readonly）——透传只会落成
// 根元素上一个无意义的 HTML 属性，开关看起来能拨，实际评分依然可以点。
// FormRenderer 还支持整表单级联禁用（:disabled 经 FormKit 节点树级联到每个字段），
// 其余字段对应的 naive-ui 组件都声明了 disabled，唯独 NRate 没有——所以更严重的是
// 整表单禁用时评分也不受影响。
//
// 用真实类名断言，而不是凭记忆：class 名先在旁的探测脚本里用 mount(NInput,
// {disabled:true}) / mount(NRate, {readonly:true}) 单独确认过（详见任务报告），
// 分别是 n-input--disabled 与 n-rate--readonly。
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

// 一个 naiveRate 字段 + 一个 text 字段（对照组），装进同一张表单
function buildDefinition(): FormDefinition {
  const rateField = getElementTypeDef('naiveRate')!.defaults() as FieldNode
  rateField.name = 'rate'
  rateField.label = 'Rate'

  const textField = getElementTypeDef('text')!.defaults() as FieldNode
  textField.name = 'txt'
  textField.label = 'Txt'

  return {
    version: DSL_VERSION,
    id: 'naive-rate-disabled-test-form',
    name: 'naive-rate-disabled-test-form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [rateField, textField],
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
  }
}

describe('FormRenderer 真实渲染：naiveRate 的禁用', () => {
  it('整表单 disabled=true：text 字段的 NInput 应处于禁用态（对照组，本用例修复前后都应通过）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {}, disabled: true },
    })
    await settle()

    const inputRoot = wrapper.find('.n-input')
    expect(inputRoot.exists()).toBe(true)
    expect(inputRoot.classes()).toContain('n-input--disabled')

    wrapper.unmount()
  })

  it('整表单 disabled=true：评分（NRate）应处于不可操作态（修复前为红）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: {}, disabled: true },
    })
    await settle()

    const rateRoot = wrapper.find('.n-rate')
    expect(rateRoot.exists()).toBe(true)
    // 修复前：NaiveRate.vue 只是把 config.disabled 原样 v-bind 给 NRate，NRate 无
    // 此 prop，根元素既不会带 n-rate--readonly，评分也依旧可点；修复后应通过。
    expect(rateRoot.classes()).toContain('n-rate--readonly')

    wrapper.unmount()
  })

  it('不开整表单禁用，只把评分节点自身 props.disabled 设为 true：评分也应不可操作（修复前为红）', async () => {
    const def = buildDefinition()
    const rateNode = def.root.children[0] as FieldNode
    rateNode.props = { ...rateNode.props, disabled: true }

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()

    const rateRoot = wrapper.find('.n-rate')
    expect(rateRoot.exists()).toBe(true)
    expect(rateRoot.classes()).toContain('n-rate--readonly')

    // 未整表单禁用时，对照的 text 字段不应被误伤成禁用态
    const inputRoot = wrapper.find('.n-input')
    expect(inputRoot.classes()).not.toContain('n-input--disabled')

    wrapper.unmount()
  })
})
