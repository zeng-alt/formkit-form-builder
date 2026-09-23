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

  // J1：Mac 键盘的 delete 键发出的是 Backspace（不是 Delete）。画布上的字段是预览控件，
  // 点它的标签/输入框选中字段时，浏览器会把焦点交给这些控件，在里面打字又不会保存到
  // 表单定义——真正的修复是 CanvasGridItem.vue 的 focusin 兜底把焦点收回条目自己身上
  // （下面单独一个用例覆盖），这里的 Delete/Backspace 同等处理只是双重兜底：万一焦点
  // 因为某些边缘场景仍留在预览控件里，按哪个键都能删掉，不再是"Backspace 留给控件"。
  it('焦点在画布预览控件内：Delete、Backspace 都能删除选中元素（兜底）', async () => {
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
    expect(
      state.formDefinition.value.root.children.some((n) => n.key === 'age'),
      'Backspace 应与 Delete 同等处理，兜底删除',
    ).toBe(false)

    wrapper.unmount()
  })

  // J1 核心修复：点字段标签/输入框选中字段后，焦点不应该停留在 FormKit 预览控件里
  // （画布上的原生 <input>/<select>/...），而应该被收回画布条目自己身上——这样 Mac 用户
  // 按 delete（=Backspace）才能生效，不用依赖上面那条兜底。
  it('点画布字段的输入框后，焦点被收回该条目本身，而不是停留在预览控件里', async () => {
    // 真实 focus/document.activeElement 只在元素挂进真实文档时才有意义，mount()
    // 默认挂在游离节点上，这里显式挂到 document.body
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    const li = itemEl(wrapper, 'age')
    const input = li.find('input')
    expect(input.exists()).toBe(true)

    // 模拟浏览器行为：点输入框会让它拿到焦点（真实 focus，触发 focusin）
    input.element.focus()
    await settle()
    expect(document.activeElement).toBe(li.element)

    // 焦点已经在条目本身上，按 Backspace（Mac 的 delete 键）应正常删除，不需要走
    // isCanvasPreviewControl 那条兜底分支
    li.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    await settle()
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(false)

    wrapper.unmount()
  })

  // 嵌套容器（card 里的字段）时，focusin 会从最内层的画布条目一路冒泡到外层的 card
  // 条目——只有最内层（被选中的那个条目）应该抢焦点，外层不应该抢走。
  it('嵌套容器内的字段获得焦点时，焦点落在最内层条目，不是外层容器', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'firstName'
    await settle()

    const innerLi = itemEl(wrapper, 'firstName')
    const outerLi = itemEl(wrapper, 'card1')
    const input = innerLi.find('input')
    expect(input.exists()).toBe(true)

    input.element.focus()
    await settle()
    expect(document.activeElement).toBe(innerLi.element)
    expect(document.activeElement).not.toBe(outerLi.element)

    wrapper.unmount()
  })

  it('data-canvas-edit 内的输入框（标签页改名）仍能正常输入，Backspace 不删除元素', async () => {
    const tabsPane: LayoutNode = {
      id: 'pane1',
      key: 'pane1',
      category: 'layout',
      type: 'tabsPane',
      renderAs: 'el',
      label: 'Tab 1',
      children: [],
    }
    const tabs: LayoutNode = {
      id: 'tabs1',
      key: 'tabs1',
      category: 'layout',
      type: 'tabs',
      renderAs: 'cmp',
      children: [tabsPane],
    }
    const def: FormDefinition = {
      version: DSL_VERSION,
      id: 'tabs-edit-test',
      name: 'tabs-edit-test',
      root: {
        id: 'root',
        category: 'container',
        type: 'group',
        renderAs: 'formkit',
        dataType: 'object',
        children: [textField('age', '年龄'), tabs],
      },
      settings: { labelWidth: 80, labelAlign: 'top' },
    }
    const wrapper = mount(BuilderMain, {
      props: { modelValue: def },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const tabLabel = wrapper.find('.tabs-tab-label')
    expect(tabLabel.exists()).toBe(true)
    await tabLabel.trigger('dblclick')
    await settle()

    const renameInput = wrapper.find('[data-canvas-edit] input')
    expect(renameInput.exists(), '双击后应出现改名输入框').toBe(true)
    await renameInput.setValue('Tab X')
    expect((renameInput.element as HTMLInputElement).value).toBe('Tab X')

    await renameInput.trigger('keydown', { key: 'Backspace' })
    await settle()
    // Backspace 是改名框里的正常文本编辑，不应该删除任何元素（age 字段、tabs 容器都还在）
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'age')).toBe(true)
    expect(state.formDefinition.value.root.children.some((n) => n.key === 'tabs1')).toBe(true)

    wrapper.unmount()
  })

  it('焦点在右侧属性面板的输入框内时按 Delete/Backspace：都不删除任何元素（正在打字）', async () => {
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

    await panelInput!.trigger('keydown', { key: 'Backspace' })
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
