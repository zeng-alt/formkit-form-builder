// @vitest-environment happy-dom
// ═══ K2：图片编辑器切换 sizeMode 后写入的 props 是否正确 ═══════════════════════════
// SelectInput 内部包的是 naive-ui 的 NSelect，弹出下拉菜单在 happy-dom 下不好模拟
// 真实点击选项；这里直接找到 SelectInput 子组件实例并 $emit('update:value', ...)，
// 等价于用户在下拉里选中了某一项——测的是 NaiveImageEditor 收到值之后写 props 的
// 逻辑，不是 NSelect 本身的下拉交互（那是 naive-ui 自己的职责）。
import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
import NaiveImageEditor from '../edits/editors/NaiveImageEditor.vue'
import SelectInput from '../edits/common/SelectInput.vue'
import NumberInput from '../edits/common/NumberInput.vue'
import TextInput from '../edits/common/TextInput.vue'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode, FormNode } from '@/types/dsl'

function mountEditor(state: ReturnType<typeof createFormBuilderState>) {
  const Host = defineComponent({
    setup() {
      return () => h(NaiveImageEditor)
    },
  })
  return mount(Host, {
    global: { provide: { [BUILDER_STATE_KEY as unknown as string]: state } },
  })
}

function buildState(): ReturnType<typeof createFormBuilderState> {
  const state = createFormBuilderState()
  const field = getElementTypeDef('naiveImage')!.defaults() as FieldNode
  field.name = 'img'
  state.formDefinition.value = {
    ...state.formDefinition.value,
    root: { ...state.formDefinition.value.root, children: [field] },
  }
  state.selectedIndex.value = 0
  return state
}

function propsOf(state: ReturnType<typeof createFormBuilderState>) {
  return (state.formDefinition.value.root.children[0] as FormNode).props as Record<string, unknown>
}

describe('NaiveImageEditor：sizeMode 切换', () => {
  it('默认写入 ratio + 16/9（新拖入的图片默认值）', () => {
    const state = buildState()
    expect(propsOf(state).sizeMode).toBe('ratio')
    expect(propsOf(state).aspectRatio).toBe('16/9')
  })

  it('sizeMode 下拉是编辑器里第一个 SelectInput（放在最前）', () => {
    const state = buildState()
    const wrapper = mountEditor(state)
    const selects = wrapper.findAllComponents(SelectInput)
    expect(selects[0]!.props('label')).toBe('尺寸模式')
    wrapper.unmount()
  })

  it('切到 fill：不再显示比例下拉，改为显示最小高度输入；写入 props.sizeMode', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)

    const sizeModeSelect = wrapper.findAllComponents(SelectInput)[0]!
    await sizeModeSelect.vm.$emit('update:value', 'fill')
    await wrapper.vm.$nextTick()

    expect(propsOf(state).sizeMode).toBe('fill')
    expect(wrapper.findComponent(NumberInput).exists()).toBe(true)
    // 比例下拉不再显示：剩下 sizeMode + RowSpanSection 内部的行数下拉 + objectFit
    expect(wrapper.findAllComponents(SelectInput).length).toBe(3)

    wrapper.unmount()
  })

  it('fill 模式下改最小高度：写入 props.minHeight', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)

    await wrapper.findAllComponents(SelectInput)[0]!.vm.$emit('update:value', 'fill')
    await wrapper.vm.$nextTick()

    const minHeightInput = wrapper.findComponent(NumberInput)
    await minHeightInput.vm.$emit('update:value', 240)
    await wrapper.vm.$nextTick()

    expect(propsOf(state).minHeight).toBe(240)

    wrapper.unmount()
  })

  it('切到 fixed：显示宽/高文本输入；写入 props.sizeMode', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)

    await wrapper.findAllComponents(SelectInput)[0]!.vm.$emit('update:value', 'fixed')
    await wrapper.vm.$nextTick()

    expect(propsOf(state).sizeMode).toBe('fixed')
    // 宽/高 + src/alt 都是 TextInput，至少应有 4 个
    expect(wrapper.findAllComponents(TextInput).length).toBeGreaterThanOrEqual(4)

    wrapper.unmount()
  })

  it('切回 ratio：比例下拉重新出现，写入 props.aspectRatio', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)

    await wrapper.findAllComponents(SelectInput)[0]!.vm.$emit('update:value', 'ratio')
    await wrapper.vm.$nextTick()
    // 第二个 SelectInput 现在应该是比例下拉
    const aspectSelect = wrapper.findAllComponents(SelectInput)[1]!
    expect(aspectSelect.props('label')).toBe('比例（aspect-ratio）')

    await aspectSelect.vm.$emit('update:value', '1/1')
    await wrapper.vm.$nextTick()
    expect(propsOf(state).aspectRatio).toBe('1/1')

    wrapper.unmount()
  })
})
