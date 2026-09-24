// @vitest-environment happy-dom
// ═══ 任务 F：左侧组件面板 ═══════════════════════════════════════════════════════
// 覆盖点：双击追加（根 / 容器内）、搜索跨分类汇总与高亮、无结果提示、最近使用的
// 记录 / 清除 / 存储失败时不显示。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import DraggableList from '@/components/sidebar-left/DraggableList.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { ContainerNode, FormDefinition } from '@/types/dsl'

const RECENT_KEY = 'formkit-form-builder:recentElements'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

function buildDefinition(): FormDefinition {
  const card = getElementTypeDef('card')!.defaults() as ContainerNode
  card.id = 'card1'
  card.key = 'card1'
  card.name = 'card_a'
  return {
    version: DSL_VERSION,
    id: 'nav-main-test',
    name: 'nav-main-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [card],
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

function mountBuilder() {
  return mount(BuilderMain, {
    props: { modelValue: buildDefinition() },
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
  })
}

describe('任务 F：左侧组件面板', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('双击面板元素：追加到画布末尾并选中新节点', async () => {
    const wrapper = mountBuilder()
    await settle()
    const state = getState(wrapper)

    const before = state.formDefinition.value.root.children.length
    const item = wrapper.find('[data-palette-type="text"]')
    expect(item.exists()).toBe(true)
    await item.trigger('dblclick')
    await settle()

    const children = state.formDefinition.value.root.children
    expect(children).toHaveLength(before + 1)
    const added = children[children.length - 1]!
    expect(added.type).toBe('text')
    expect(state.selectedKey.value).toBe(added.key)

    wrapper.unmount()
  })

  it('双击面板元素：选中卡片容器时追加到容器内，而不是根画布', async () => {
    const wrapper = mountBuilder()
    await settle()
    const state = getState(wrapper)

    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'card1'
    await settle()

    const item = wrapper.find('[data-palette-type="text"]')
    await item.trigger('dblclick')
    await settle()

    // 根级仍只有 card 自己，新字段落进了 card 的 children
    expect(state.formDefinition.value.root.children).toHaveLength(1)
    const card = state.formDefinition.value.root.children.find(
      (n) => n.key === 'card1',
    ) as ContainerNode
    expect(card.children).toHaveLength(1)
    expect(card.children[0]!.type).toBe('text')
    expect(state.selectedKey.value).toBe(card.children[0]!.key)

    wrapper.unmount()
  })

  it('搜索：跨三个分类汇总展示，命中片段高亮', async () => {
    const wrapper = mountBuilder()
    await settle()

    const input = wrapper.find('input[placeholder="搜索..."]')
    expect(input.exists()).toBe(true)
    await input.setValue('文本')
    await settle()

    // 分类小标题（字段/容器/静态）与命中高亮同时出现
    expect(wrapper.findAll('mark').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('字段')

    wrapper.unmount()
  })

  it('搜索：无匹配时显示提示并可一键清空', async () => {
    const wrapper = mountBuilder()
    await settle()

    const input = wrapper.find('input[placeholder="搜索..."]')
    await input.setValue('这串查询词不会命中任何内置元素zzz')
    await settle()

    expect(wrapper.text()).toContain('没有找到匹配的元素')
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('清空搜索'))
    expect(clearBtn).toBeTruthy()

    await clearBtn!.trigger('click')
    await settle()
    expect((input.element as HTMLInputElement).value).toBe('')

    wrapper.unmount()
  })

  it('最近使用：面板拖出并成功放下后记录，可点击清除', async () => {
    const wrapper = mountBuilder()
    await settle()
    const state = getState(wrapper)

    // 模拟「面板拖出」：DraggableList 在拖拽开始时会 emit drag-start(type)
    const sources = wrapper.findAllComponents(DraggableList)
    expect(sources.length).toBeGreaterThan(0)
    sources[0]!.vm.$emit('drag-start', 'text')

    // 模拟「成功放下」：画布 schema 出现一个匹配类型的新节点（真实拖放走的也是
    // commitSchemaReconcile/commitFormDefinition，这里直接落真源等价模拟其结果）
    const clone = getElementTypeDef('text')!.defaults()
    clone.id = 'probe1'
    clone.key = 'probe1'
    clone.name = 'field_probe'
    state.commitFormDefinition({
      ...state.formDefinition.value,
      root: {
        ...state.formDefinition.value.root,
        children: [...state.formDefinition.value.root.children, clone],
      },
    })
    await settle()

    expect(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')).toContain('text')
    expect(wrapper.text()).toContain('最近使用')

    const clearRecentBtn = wrapper.findAll('button').find((b) => b.text() === '清除')
    expect(clearRecentBtn).toBeTruthy()
    await clearRecentBtn!.trigger('click')
    await settle()

    expect(localStorage.getItem(RECENT_KEY)).toBeNull()
    expect(wrapper.text()).not.toContain('最近使用')

    wrapper.unmount()
  })

  it('最近使用：拖拽被取消（未产生匹配新节点）时不记录', async () => {
    const wrapper = mountBuilder()
    await settle()
    const state = getState(wrapper)

    const sources = wrapper.findAllComponents(DraggableList)
    sources[0]!.vm.$emit('drag-start', 'text')

    // 只是普通的表单名改动，不产生任何新节点：不应被误记为已使用
    state.commitFormDefinition({ ...state.formDefinition.value, name: '改个名字' })
    await settle()

    expect(localStorage.getItem(RECENT_KEY)).toBeNull()
    expect(wrapper.text()).not.toContain('最近使用')

    wrapper.unmount()
  })

  it('本地存储写入失败时不显示"最近使用"区域', async () => {
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    const wrapper = mountBuilder()
    await settle()
    const state = getState(wrapper)

    const sources = wrapper.findAllComponents(DraggableList)
    sources[0]!.vm.$emit('drag-start', 'text')

    const clone = getElementTypeDef('text')!.defaults()
    clone.id = 'probe2'
    clone.key = 'probe2'
    clone.name = 'field_probe2'
    state.commitFormDefinition({
      ...state.formDefinition.value,
      root: {
        ...state.formDefinition.value.root,
        children: [...state.formDefinition.value.root.children, clone],
      },
    })
    await settle()

    expect(wrapper.text()).not.toContain('最近使用')

    spy.mockRestore()
    wrapper.unmount()
  })
})
