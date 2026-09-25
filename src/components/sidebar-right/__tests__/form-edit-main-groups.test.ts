// @vitest-environment happy-dom
// ═══ 回归测试：右侧面板分组机制（任务 C）═══════════════════════════════════════════
// 背景：任务 C 把「基础」「逻辑」「事件」三组挪到 FormEditMain / EditsSection 外层统一
// 渲染，各元素编辑器不再各自持有 NameInput / LabelHelpSection / BindEditor。
// 「事件」分组是否显示、显示哪些事件开关，改由元素定义的 bindEvents（见
// elements/definitions/*.ts、dsl/registry.ts 的 ElementCatalogEntry.bindEvents）驱动。
// 本文件覆盖：
//   1. bindEvents 非空的类型（text）：外层渲染「事件」分组（BindEditor 可见）。
//   2. bindEvents 为空数组的类型（group）：外层不渲染「事件」分组。
//   3. 「基础」分组统一渲染 NameInput + LabelHelpSection（字段类），编辑器自身不再重复。
import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
// 副作用导入：注册右侧属性面板的编辑器组件（见 elements/definitions/editor-bindings.ts）。
// 真实应用里这一步由 builder/containers/index.ts 在设计器启动时完成，这里直接挂载
// FormEditMain 而不经过那条路径，需要自己触发一次注册，否则 getFieldEditorComponent
// 拿不到编辑器、hasLabelHelp 恒为 false。
import '@/elements/definitions/editor-bindings'
import FormEditMain from '../FormEditMain.vue'
import NameInput from '../edits/common/NameInput.vue'
import LabelHelpSection from '../edits/common/LabelHelpSection.vue'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode, FormNode } from '@/types/dsl'

// 各元素编辑器经 defineAsyncComponent 懒加载（见 elements/registry.ts 的
// getFieldEditorComponent），挂载后要等异步组件真正解析完，断言/卸载才准确，
// 也避免测试环境在 import 还没落地时被提前回收报「环境已卸载」的悬空错误——
// 编辑器自身的 import（如 TextLikeEditor.vue 引用的 NaiveBasicSection.vue）在测试
// 环境里要经过真实的模块转换，只 flush 微任务队列的 nextTick 不够可靠，额外让出
// 一次事件循环，让这些嵌套 import 有机会在本文件的测试环境被回收前先落地。
const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

async function mountWithField(field: FormNode) {
  const state = createFormBuilderState()
  state.formDefinition.value = {
    ...state.formDefinition.value,
    root: { ...state.formDefinition.value.root, children: [field] },
  }
  state.selectedIndex.value = 0
  state.selectedTarget.value = 'field'

  const Host = defineComponent({
    setup() {
      return () => h(FormEditMain)
    },
  })
  return mount(Host, {
    global: { provide: { [BUILDER_STATE_KEY as unknown as string]: state } },
  })
}

describe('右侧面板分组：基础 / 事件由外层统一渲染', () => {
  it('text（bindEvents 非空）：外层渲染事件分组，能看到事件相关文案', async () => {
    const field = getElementTypeDef('text')!.defaults() as FieldNode
    field.name = 'txt'
    const wrapper = await mountWithField(field)
    await settle()

    // 事件绑定入口（BindEditor 内部渲染的静态文案）应可见
    expect(wrapper.text()).toContain('axios')
    // 基础分组：名称 / 标签帮助统一由外层渲染，编辑器自身不再重复持有
    expect(wrapper.findComponent(NameInput).exists()).toBe(true)
    expect(wrapper.findComponent(LabelHelpSection).exists()).toBe(true)

    wrapper.unmount()
  })

  it('group（bindEvents 为空数组）：外层不渲染事件分组', async () => {
    const field = getElementTypeDef('group')!.defaults() as FormNode
    field.name = 'grp'
    const wrapper = await mountWithField(field)
    await settle()

    expect(wrapper.text()).not.toContain('axios')
    // group 是纯数据结构容器，没有可见标题，基础分组不显示标签/帮助
    expect(wrapper.findComponent(LabelHelpSection).exists()).toBe(false)

    wrapper.unmount()
  })

  it('card（容器/布局类，非 field）：基础分组仍显示标签/帮助（原编辑器内置的 LabelHelpSection 已挪到外层）', async () => {
    const field = getElementTypeDef('card')!.defaults() as FormNode
    field.name = 'card1'
    const wrapper = await mountWithField(field)
    await settle()

    expect(wrapper.findComponent(LabelHelpSection).exists()).toBe(true)
    // card 的 bindEvents 为空数组，不显示事件分组
    expect(wrapper.text()).not.toContain('axios')

    wrapper.unmount()
  })
})
