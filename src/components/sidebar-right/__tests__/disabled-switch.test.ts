// @vitest-environment happy-dom
// ═══ 回归测试：编辑面板"禁用"开关先开后关，必须删键而非写 disabled:false ═══════════
// 背景：disabled 是 FormKit 保留的级联属性名，节点一旦显式写入 false 就会锁死，不再
// 响应表单/分组级联禁用（回退规则只在节点自身完全没有这个 prop 时才生效）。用户在
// 编辑面板把"禁用"开关打开再关闭是常见操作序列——如果关闭时写的是 false 而不是删键，
// 这个字段就从此对整表单禁用免疫，且没有任何 UI 提示。
// 覆盖 NaiveBasicSection（绝大多数字段共用）与 ButtonGroupEditor（按钮组容器，写路径
// 独立）两处 disabled 开关的写路径（见 composables/form-fields.ts 的 createDisabledProp）。
import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
import NaiveBasicSection from '../edits/common/NaiveBasicSection.vue'
import ButtonGroupEditor from '../edits/editors/ButtonGroupEditor.vue'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode, FormNode } from '@/types/dsl'

function mountWithState(state: ReturnType<typeof createFormBuilderState>, Comp: object, props = {}) {
  const Host = defineComponent({
    setup() {
      return () => h(Comp as never, props)
    },
  })
  return mount(Host, {
    global: { provide: { [BUILDER_STATE_KEY as unknown as string]: state } },
  })
}

describe('禁用开关：先开后关必须删键，不留 disabled:false', () => {
  it('NaiveBasicSection（字段编辑面板通用禁用开关）', async () => {
    const state = createFormBuilderState()
    const field = getElementTypeDef('naiveTransfer')!.defaults() as FieldNode
    field.name = 'transfer'
    state.formDefinition.value = {
      ...state.formDefinition.value,
      root: { ...state.formDefinition.value.root, children: [field] },
    }
    state.selectedIndex.value = 0

    const wrapper = mountWithState(state, NaiveBasicSection, { disabled: true })
    const nswitch = wrapper.find('.n-switch')
    expect(nswitch.exists()).toBe(true)

    // 开：点一下真实的 NSwitch（naive-ui 内部据此触发 update:value(true)）
    await nswitch.trigger('click')
    let node = state.formDefinition.value.root.children[0] as FormNode
    expect(node.props?.disabled).toBe(true)

    // 关：再点一下——必须删键，而不是写 false
    await nswitch.trigger('click')
    node = state.formDefinition.value.root.children[0] as FormNode
    expect(node.props?.disabled).toBeUndefined()
    expect(node.props ? 'disabled' in node.props : true).toBe(false)

    wrapper.unmount()
  })

  it('ButtonGroupEditor（按钮组容器独立写路径）', async () => {
    const state = createFormBuilderState()
    const group = getElementTypeDef('buttonGroup')!.defaults() as FormNode
    state.formDefinition.value = {
      ...state.formDefinition.value,
      root: { ...state.formDefinition.value.root, children: [group] },
    }
    state.selectedIndex.value = 0

    const wrapper = mountWithState(state, ButtonGroupEditor)
    // ButtonGroupEditor 有两个开关：vertical、disabled（模板书写顺序，disabled 在后）——
    // size 是 SelectInput 不是开关，不会混进来
    const switches = wrapper.findAll('.n-switch')
    const disabledSwitch = switches[switches.length - 1]!

    await disabledSwitch.trigger('click')
    let node = state.formDefinition.value.root.children[0] as FormNode
    expect(node.props?.disabled).toBe(true)

    await disabledSwitch.trigger('click')
    node = state.formDefinition.value.root.children[0] as FormNode
    expect(node.props?.disabled).toBeUndefined()
    expect(node.props ? 'disabled' in node.props : true).toBe(false)

    wrapper.unmount()
  })
})
