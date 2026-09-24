// @vitest-environment happy-dom
// ═══ H6：复制后自动选中副本，副本 label 带后缀；容器整体复制不改子项 ═══════════════
import { describe, expect, it } from 'vitest'
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
  // card 在目录里注册的 category 是 'layout'（不是 'container'——虽然它有数据结构
  // 规格 dataShape:'object'，但 DSL 节点分类按 elements/definitions/containers.ts
  // 的登记为准），用 getElementTypeDef 拿默认节点形状，避免手写出与真实注册不符的
  // 节点（那样只会在 reconcileDslTree 的按 key 复用快路径下侥幸凑效，新建/复制出的
  // 节点会因为重新走 schemaNodeToDslNode 而暴露出真实的类型不匹配）。
  const card = getElementTypeDef('card')!.defaults() as LayoutNode
  card.id = 'card1'
  card.key = 'card1'
  card.name = 'card_a'
  card.label = '基本信息'
  card.children = [textField('firstName', '名'), textField('lastName', '姓')]
  return {
    version: DSL_VERSION,
    id: 'dup-select-test',
    name: 'dup-select-test',
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

describe('H6：复制后自动选中副本', () => {
  it('根级复制：新副本被选中，label 带「副本」后缀', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    // D3：复制一份改到浮动工具条（选中单个元素时才显示），不再是常驻悬停按钮，
    // 先选中该元素
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    const copyBtn = wrapper.find('button[aria-label="复制一份"]')
    expect(copyBtn.exists()).toBe(true)
    await copyBtn.trigger('click')
    await settle()

    // 画布上应出现「年龄 副本」
    expect(wrapper.text()).toContain('年龄 副本')

    // 新副本应被选中：selectedKey 指向的节点 label 正是「年龄 副本」
    const selectedKey = state.selectedKey.value
    expect(selectedKey, '复制后应有明确的选中 key').toBeTruthy()
    const root = state.formDefinition.value.root.children
    const selected = root.find((n) => n.key === selectedKey)
    expect(selected?.label).toBe('年龄 副本')

    wrapper.unmount()
  })

  it('容器（卡片）整体复制：只改容器自身 label，不改其子项 name/label；副本被选中', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    // D3：复制一份改到浮动工具条，只在单选这一个元素时出现——选中 card 本身
    // （不是它内部的字段），工具条只会挂在 card 这一层，不会有嵌套按钮的歧义
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'card1'
    await settle()

    const cardItem = wrapper.find('[data-item-key="card1"]')
    expect(cardItem.exists()).toBe(true)
    const cardCopyBtn = cardItem.find('button[aria-label="复制一份"]')
    expect(cardCopyBtn.exists()).toBe(true)
    await cardCopyBtn.trigger('click')
    await settle()

    const root = state.formDefinition.value.root.children as (FieldNode | LayoutNode)[]
    const cards = root.filter((n) => n.type === 'card') as LayoutNode[]
    expect(cards).toHaveLength(2)
    const clonedCard = cards.find((c) => c.key !== 'card1')!
    expect(clonedCard.label).toBe('基本信息 副本')
    expect(clonedCard.name).not.toBe('card_a')

    // 子项 name/label 原样保留（不因整体复制而改变）
    const clonedChildren = clonedCard.children as FieldNode[]
    expect(clonedChildren.map((c) => c.name)).toEqual(['firstName', 'lastName'])
    expect(clonedChildren.map((c) => c.label)).toEqual(['名', '姓'])
    // 但 key 必须重新生成（DnD 身份不能与原卡片内字段重复）
    expect(clonedChildren.map((c) => c.key)).not.toEqual(
      (cards.find((c) => c.key === 'card1')!.children as FieldNode[]).map((c) => c.key),
    )

    // 新副本（卡片本身）应被选中
    expect(state.selectedKey.value).toBe(clonedCard.key)

    wrapper.unmount()
  })
})
