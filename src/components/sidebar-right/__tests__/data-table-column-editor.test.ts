// @vitest-environment happy-dom
// ═══ 数据表格列编辑器：顶部导航（返回 / 上一列 / 下一列） ═══════════════════════
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFormBuilderState, BUILDER_STATE_KEY } from '@/state/create-form-builder-state'
import DataTableColumnEditor from '../edits/editors/DataTableColumnEditor.vue'
import { getElementTypeDef } from '@/dsl'
import type { LayoutNode } from '@/types/dsl'
import type { DataTableColumn } from '@/components/ui/containers/data-table/types'

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

// 带来源元素的列（姓名列，text 类型）：用于校验规则相关用例
function buildStateWithElement(): ReturnType<typeof createFormBuilderState> {
  const state = createFormBuilderState()
  const table = getElementTypeDef('dataTable')!.defaults() as LayoutNode
  table.id = 'table1'
  table.key = 'table1'
  table.name = 'table_a'
  const nameElement = { ...getElementTypeDef('text')!.defaults(), name: 'name', label: '姓名' }
  table.props = {
    ...table.props,
    columns: [{ key: 'name', title: '姓名', element: nameElement }],
  }
  state.formDefinition.value = {
    ...state.formDefinition.value,
    root: { ...state.formDefinition.value.root, children: [table] },
  }
  state.selectedIndex.value = 0
  state.selectedKey.value = 'table1'
  state.selectedColumnIndex.value = 0
  // 真实选中流程（selectByKey）会把 selectedTarget 置为 'field'；currentFieldType
  // 靠它跟 selectedIsForm 区分「表单」还是「字段」，这里手动补上保持一致
  state.selectedTarget.value = 'field'
  return state
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

describe('DataTableColumnEditor：底部校验规则区', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ValidationSwitch 整行都绑定了切换点击（见 ValidationSwitch.vue），按文案定位那一行
  function findValidationRow(labelText: string): HTMLElement | undefined {
    return Array.from(document.querySelectorAll('.cursor-pointer')).find((el) =>
      el.textContent?.includes(labelText),
    ) as HTMLElement | undefined
  }

  it('列属性模式下勾选「必填」：写入 columns[i].element.validation', async () => {
    const state = buildStateWithElement()
    const wrapper = mountEditor(state)
    await settle()

    // 默认停在「列属性」模式（不切到「元素属性」），验证两种模式都设置了编辑目标
    const requiredRow = findValidationRow('必填')
    expect(requiredRow).toBeTruthy()
    requiredRow!.click()
    await settle()

    const cols = (
      state.formDefinition.value.root.children[0] as unknown as {
        props: { columns: DataTableColumn[] }
      }
    ).props.columns
    expect(cols[0]?.element?.validation).toEqual([{ rule: 'required' }])

    wrapper.unmount()
  })

  it('列没有来源元素时不显示校验规则区', async () => {
    const state = buildState()
    const wrapper = mountEditor(state)
    await settle()

    expect(findValidationRow('必填')).toBeUndefined()

    wrapper.unmount()
  })
})
