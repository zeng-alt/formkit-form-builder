// @vitest-environment happy-dom
// ═══ G：条件必填 / 条件禁用 / 条件只读——真实渲染集成测试 ═══════════════════════════
// 与 visible-if.test.ts 同一套思路：真挂载 FormRenderer，验证 schema 里编译出的
// 条件属性在真实渲染环境里确实生效、且随表单数据响应式切换。用 findComponent 直接
// 断言底层 naive-ui 组件收到的 props（disabled/readonly），不依赖 naive-ui 具体版本
// 渲染出的 DOM 结构/class 名。
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import { NInput, NSwitch } from 'naive-ui'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, exprToJs, getElementTypeDef, schemaCondition } from '@/dsl'
import type { Expr, FieldNode, FormDefinition } from '@/types/dsl'

// eq($flag, 'yes')：本文件所有用例共用同一条条件表达式 AST
const flagIsYes: Expr = {
  type: 'call',
  fn: 'eq',
  args: [
    { type: 'field', name: 'flag' },
    { type: 'literal', value: 'yes' },
  ],
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function flagField(): FieldNode {
  const f = getElementTypeDef('text')!.defaults() as FieldNode
  f.name = 'flag'
  f.label = 'Flag'
  return f
}

function buildDef(children: FieldNode[]): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'f',
    name: 'f',
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

function mountForm(definition: FormDefinition, modelValue: Record<string, unknown>) {
  return mount(FormRenderer, {
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    props: { definition, modelValue },
  })
}

describe('requiredIf（$cmp 字段）：条件真假决定是否按必填拦截提交', () => {
  it('条件为假时不拦截，条件为真时拦截，未填也算通过/不通过', async () => {
    const target = getElementTypeDef('text')!.defaults() as FieldNode
    target.name = 'target'
    target.requiredIf = flagIsYes
    const def = buildDef([flagField(), target])

    const wrapper = mountForm(def, { flag: 'no', target: '' })
    await settle()
    expect(await (wrapper.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(
      true,
    )

    await wrapper.setProps({ modelValue: { flag: 'yes', target: '' } })
    await settle()
    expect(await (wrapper.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(
      false,
    )

    // 填了值之后条件必填不再拦截
    await wrapper.setProps({ modelValue: { flag: 'yes', target: 'filled' } })
    await settle()
    expect(await (wrapper.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(
      true,
    )

    wrapper.unmount()
  })

  it('字段已有静态 required 时静态规则优先：requiredIf 恒假也照样拦截空值', async () => {
    const target = getElementTypeDef('text')!.defaults() as FieldNode
    target.name = 'target'
    target.validation = [{ rule: 'required' }]
    target.requiredIf = { type: 'literal', value: false }
    const def = buildDef([flagField(), target])

    const wrapper = mountForm(def, { flag: 'no', target: '' })
    await settle()
    expect(await (wrapper.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(
      false,
    )

    wrapper.unmount()
  })
})

describe('disabledIf（$cmp 字段）：条件真假决定字段是否禁用', () => {
  it('条件为真时禁用，条件为假时不禁用，随表单数据响应式切换', async () => {
    const target = getElementTypeDef('naiveSwitch')!.defaults() as FieldNode
    target.name = 'target'
    target.disabledIf = flagIsYes
    const def = buildDef([flagField(), target])

    const wrapper = mountForm(def, { flag: 'no' })
    await settle()
    expect(wrapper.findComponent(NSwitch).props('disabled')).toBe(false)

    await wrapper.setProps({ modelValue: { flag: 'yes' } })
    await settle()
    expect(wrapper.findComponent(NSwitch).props('disabled')).toBe(true)

    await wrapper.setProps({ modelValue: { flag: 'no' } })
    await settle()
    expect(wrapper.findComponent(NSwitch).props('disabled')).toBe(false)

    wrapper.unmount()
  })
})

describe('readonlyIf（$cmp 字段）：原生只读类型真只读，其余退化为禁用', () => {
  it('text（READONLY_CAPABLE_TYPES）：条件为真时 readonly=true 且不禁用', async () => {
    const target = getElementTypeDef('text')!.defaults() as FieldNode
    target.name = 'target'
    target.readonlyIf = flagIsYes
    const def = buildDef([flagField(), target])

    const wrapper = mountForm(def, { flag: 'yes' })
    await settle()
    // flag 本身也是 text 字段，同样渲染 NInput——第 2 个（下标 1）才是 target
    const input = wrapper.findAllComponents(NInput).at(1)!
    expect(input.props('readonly')).toBe(true)
    expect(input.props('disabled')).toBe(false)

    await wrapper.setProps({ modelValue: { flag: 'no' } })
    await settle()
    expect(wrapper.findAllComponents(NInput).at(1)!.props('readonly')).toBeFalsy()

    wrapper.unmount()
  })

  it('naiveSwitch（非只读能力类型）：条件为真时退化为 disabled=true', async () => {
    const target = getElementTypeDef('naiveSwitch')!.defaults() as FieldNode
    target.name = 'target'
    target.readonlyIf = flagIsYes
    const def = buildDef([flagField(), target])

    const wrapper = mountForm(def, { flag: 'yes' })
    await settle()
    expect(wrapper.findComponent(NSwitch).props('disabled')).toBe(true)

    wrapper.unmount()
  })
})

describe('$formkit 字段（裸 schema 通道）：disabledIf 同样生效', () => {
  it('__disabledIf 编译为 { if, then } 条件属性，随 data 响应式切换', async () => {
    const schema = [
      { $formkit: 'text', name: 'flag', label: 'Flag' },
      {
        $formkit: 'text',
        name: 'target',
        label: 'Target',
        __disabledIf: schemaCondition(exprToJs(flagIsYes), true),
      },
    ]
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { schema: schema as never, modelValue: { flag: 'no' } },
    })
    await settle()
    // flag 本身也是 $formkit:'text'，同样渲染 NInput——第 2 个（下标 1）才是 target
    expect(wrapper.findAllComponents(NInput).at(1)!.props('disabled')).toBe(false)

    await wrapper.setProps({ modelValue: { flag: 'yes' } })
    await settle()
    expect(wrapper.findAllComponents(NInput).at(1)!.props('disabled')).toBe(true)

    wrapper.unmount()
  })
})
