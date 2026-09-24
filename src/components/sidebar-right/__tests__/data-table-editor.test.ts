// @vitest-environment happy-dom
// ═══ 数据表格属性面板：列列表点选进入列编辑 / 「+ 添加列」写进定义 ═══════════════
// 列列表 / 拾取器弹出层都会 Teleport 到 document.body（同数据表格其它弹层测试），
// 这里统一用 document.querySelector 系列操作真实 DOM。
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
import DataTableEditor from '../edits/editors/DataTableEditor.vue'
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
    ],
  }
  state.formDefinition.value = {
    ...state.formDefinition.value,
    root: { ...state.formDefinition.value.root, children: [table] },
  }
  state.selectedIndex.value = 0
  state.selectedKey.value = 'table1'
  return state
}

function mountEditor(state: ReturnType<typeof createFormBuilderState>) {
  const Host = defineComponent({
    setup() {
      return () => h(DataTableEditor)
    },
  })
  return mount(Host, {
    global: { provide: { [BUILDER_STATE_KEY as unknown as string]: state } },
    attachTo: document.body,
  })
}

function tableOf(state: ReturnType<typeof createFormBuilderState>): LayoutNode | undefined {
  return state.formDefinition.value.root.children.find((n) => n.key === 'table1') as
    | LayoutNode
    | undefined
}

describe('DataTableEditor：数据列列表', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('点列列表的一行 → selectedColumnIndex 变为该下标', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)
    await settle()

    const rows = document.querySelectorAll('[data-testid="dt-column-row"]')
    expect(rows).toHaveLength(2)

    expect(state.selectedColumnIndex.value).toBeNull()
    ;(rows[1] as HTMLElement).click()
    await settle()

    expect(state.selectedColumnIndex.value).toBe(1)

    wrapper.unmount()
  })

  it('「+ 添加列」pick 一个字段类型后，定义里的 columns 多一列', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)
    await settle()

    expect(tableOf(state)?.props?.columns).toHaveLength(2)

    const addBtn = document.querySelector('[data-testid="dt-column-add"]') as HTMLElement
    expect(addBtn).toBeTruthy()
    addBtn.click()
    await settle()

    const options = document.querySelectorAll('[data-field-type]')
    expect(options.length).toBeGreaterThan(0)
    ;(options[0] as HTMLElement).click()
    await settle()

    const columns = tableOf(state)?.props?.columns as unknown[] | undefined
    expect(columns).toHaveLength(3)

    wrapper.unmount()
  })
})
