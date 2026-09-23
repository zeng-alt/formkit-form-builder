// @vitest-environment happy-dom
// ═══ H5：设计器键盘快捷键 ═══════════════════════════════════════════════════════
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition, LayoutNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function textField(id: string, label: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = id
  field.key = id
  field.name = id
  field.label = label
  return field
}

function buildDefinition(): FormDefinition {
  const card = getElementTypeDef('card')!.defaults() as LayoutNode
  card.id = 'card1'
  card.key = 'card1'
  card.name = 'card_a'
  card.label = '基本信息'
  card.children = [textField('firstName', '名')]
  return {
    version: DSL_VERSION,
    id: 'shortcuts-test',
    name: 'shortcuts-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [textField('age', '年龄'), card],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function getState(wrapper: ReturnType<typeof mount>): FormBuilderState {
  const provides = (wrapper.vm.$ as any).provides
  const state = provides?.[BUILDER_STATE_KEY as unknown as string] as FormBuilderState
  expect(state).toBeTruthy()
  return state
}

// 找到 __key 对应的画布条目 li（[data-item-key]），在它上面触发 keydown——
// 冒泡到 BuilderMain 根元素上的监听器
function itemEl(wrapper: ReturnType<typeof mount>, key: string) {
  const el = wrapper.find(`[data-item-key="${key}"]`)
  expect(el.exists(), `应能找到 __key=${key} 的画布条目`).toBe(true)
  return el
}

describe('H5：键盘快捷键', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('选中根级字段后按 Delete：字段被删除', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    await itemEl(wrapper, 'age').trigger('keydown', { key: 'Delete' })
    await settle()

    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    wrapper.unmount()
  })

  it('选中容器内嵌套字段后按 Backspace：嵌套字段也能被删除', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'firstName'
    await settle()

    await itemEl(wrapper, 'firstName').trigger('keydown', { key: 'Backspace' })
    await settle()

    const card = state.formDefinition.value.root.children.find((n) => n.key === 'card1') as
      | LayoutNode
      | undefined
    expect(card?.children.some((c) => c.key === 'firstName')).toBe(false)

    wrapper.unmount()
  })

  // 画布上的字段是预览控件，点选字段（尤其点它的标签）时焦点会落进去——在这里按 Delete
  // 仍应删除选中的元素，否则最自然的选中方式下快捷键永远不生效；Backspace 留给控件本身
  it('焦点在画布预览控件内：Delete 删除选中元素，Backspace 不删除', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    const input = itemEl(wrapper, 'age').find('input')
    expect(input.exists()).toBe(true)
    await input.trigger('keydown', { key: 'Backspace' })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(true)

    await input.trigger('keydown', { key: 'Delete' })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    wrapper.unmount()
  })

  it('焦点在右侧属性面板的输入框内时按 Delete：不删除任何元素（正在打字）', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    const panelInput = wrapper
      .findAll('input')
      .find((i) => !i.element.closest('[data-canvas-item]'))
    expect(panelInput, '应能找到画布之外（属性面板）的输入框').toBeTruthy()
    await panelInput!.trigger('keydown', { key: 'Delete' })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(true)

    wrapper.unmount()
  })

  it('Ctrl+Z 撤销、Ctrl+Shift+Z 重做', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    await itemEl(wrapper, 'age').trigger('keydown', { key: 'Delete' })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    // 撤销：随便找页面里一个还在的画布条目触发（冒泡到根元素）
    await itemEl(wrapper, 'card1').trigger('keydown', { key: 'z', ctrlKey: true })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(true)

    // 重做
    await itemEl(wrapper, 'card1').trigger('keydown', { key: 'z', ctrlKey: true, shiftKey: true })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    // Ctrl+Y 同样是重做的别名：先撤销回去，再用 Ctrl+Y 重做验证
    await itemEl(wrapper, 'card1').trigger('keydown', { key: 'z', ctrlKey: true })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(true)
    await itemEl(wrapper, 'card1').trigger('keydown', { key: 'z', ctrlKey: true })
    await settle()
    await itemEl(wrapper, 'card1').trigger('keydown', { key: 'y', ctrlKey: true })
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    wrapper.unmount()
  })

  it('Ctrl+D 复制选中元素：产生副本并选中它', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    await itemEl(wrapper, 'age').trigger('keydown', { key: 'd', ctrlKey: true })
    await settle()

    const root = state.formDefinition.value.root.children
    expect(root).toHaveLength(3)
    const clone = root.find((n) => n.key !== 'age' && n.key !== 'card1')
    expect(clone?.label).toBe('年龄 副本')
    expect(state.selectedKey.value).toBe(clone?.key)

    wrapper.unmount()
  })
})
