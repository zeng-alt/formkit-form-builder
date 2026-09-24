// @vitest-environment happy-dom
// ═══ 数据表格列编辑器：顶部导航（返回 / 上一列 / 下一列） ═══════════════════════
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
import DataTableColumnEditor from '../edits/editors/DataTableColumnEditor.vue'
import { getElementTypeDef } from '@/dsl'
import type { LayoutNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

function buildState(): ReturnType<typeof createFormBuilderState> {
  const state = createFormBuilderState()
  const table = getElementTypeDef('dataTable')!.defaults() as LayoutNode
  table.id = 'table1'
  table.key = 'table1'
  table.name = 'table_a'
  table.props = {
    ...table.props,
    columns: [
      { key: 'name', title: '姓名' },
      { key: 'age', title: '年龄' },
      { key: 'email', title: '邮箱' },
    ],
  }
  state.formDefinition.value = {
    ...state.formDefinition.value,
    root: { ...state.formDefinition.value.root, children: [table] },
  }
  state.selectedIndex.value = 0
  state.selectedKey.value = 'table1'
  state.selectedColumnIndex.value = 0
  return state
}

function mountEditor(state: ReturnType<typeof createFormBuilderState>) {
  const Host = defineComponent({
    setup() {
      return () => h(DataTableColumnEditor)
    },
  })
  return mount(Host, {
    global: { provide: { [BUILDER_STATE_KEY as unknown as string]: state } },
    attachTo: document.body,
  })
}

describe('DataTableColumnEditor：顶部导航', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('下一列 / 上一列在首尾列被禁用，其余正常切换 selectedColumnIndex', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)
    await settle()

    const next = () =>
      document.querySelector('[data-testid="dt-column-editor-next"]') as HTMLElement
    const prev = () =>
      document.querySelector('[data-testid="dt-column-editor-prev"]') as HTMLElement

    expect(prev().hasAttribute('disabled')).toBe(true)

    next().click()
    await settle()
    expect(state.selectedColumnIndex.value).toBe(1)

    next().click()
    await settle()
    expect(state.selectedColumnIndex.value).toBe(2)
    expect(next().hasAttribute('disabled')).toBe(true)

    // 已在末列，再点下一列不再前进
    next().click()
    await settle()
    expect(state.selectedColumnIndex.value).toBe(2)

    prev().click()
    await settle()
    expect(state.selectedColumnIndex.value).toBe(1)

    wrapper.unmount()
  })

  it('返回数据表格：selectedColumnIndex 清空为 null', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)
    await settle()

    const back = document.querySelector('[data-testid="dt-column-editor-back"]') as HTMLElement
    back.click()
    await settle()

    expect(state.selectedColumnIndex.value).toBeNull()

    wrapper.unmount()
  })
})
