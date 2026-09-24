// @vitest-environment happy-dom
// ═══ 回归测试：NaiveBasicSection 按「外观 / 行为」分组渲染 ═══════════════════════════
// 背景：任务 C 把原来一长串平铺的开关拆成「外观」（尺寸/前后缀/边框/圆角）与
// 「行为」（禁用/只读/可清除/多选/最大长度等交互开关）两个 EditorSection；某一组
// 没有开关时不渲染该组标题（避免空标题）。同时验证 prefix/suffix 已并入本组件
// （原 PrefixSuffixSection 已删除），不再单独出现重复的「外观」标题。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
import NaiveBasicSection from '../edits/common/NaiveBasicSection.vue'
import EditorSection from '../edits/common/EditorSection.vue'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode } from '@/types/dsl'

function mountWithState(props: Record<string, unknown>) {
  const state = createFormBuilderState()
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.name = 'txt'
  state.formDefinition.value = {
    ...state.formDefinition.value,
    root: { ...state.formDefinition.value.root, children: [field] },
  }
  state.selectedIndex.value = 0
  return mount(NaiveBasicSection, {
    props,
    global: { provide: { [BUILDER_STATE_KEY as unknown as string]: state } },
  })
}

describe('NaiveBasicSection：外观 / 行为分组', () => {
  it('只传行为类开关（disabled）：只渲染一个「行为」分组，不出现「外观」分组', () => {
    const wrapper = mountWithState({ disabled: true })
    const sections = wrapper.findAllComponents(EditorSection)
    expect(sections).toHaveLength(1)
    expect(sections[0]!.props('title')).toBe('行为')
    wrapper.unmount()
  })

  it('只传外观类开关（size）：只渲染一个「外观」分组，不出现「行为」分组', () => {
    const wrapper = mountWithState({ size: true })
    const sections = wrapper.findAllComponents(EditorSection)
    expect(sections).toHaveLength(1)
    expect(sections[0]!.props('title')).toBe('外观')
    wrapper.unmount()
  })

  it('同时传外观 + 行为开关：两个分组都渲染，且外观在前、行为在后', () => {
    const wrapper = mountWithState({ size: true, disabled: true, prefix: true, suffix: true })
    const sections = wrapper.findAllComponents(EditorSection)
    expect(sections.map((s) => s.props('title'))).toEqual(['外观', '行为'])
    wrapper.unmount()
  })

  it('什么开关都不传：不渲染任何分组', () => {
    const wrapper = mountWithState({})
    expect(wrapper.findAllComponents(EditorSection)).toHaveLength(0)
    wrapper.unmount()
  })
})
