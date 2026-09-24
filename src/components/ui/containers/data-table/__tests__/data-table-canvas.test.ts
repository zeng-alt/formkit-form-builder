// @vitest-environment happy-dom
// ═══ 数据表格画布：选中列删除 / 表头新增列 / 示例数据与真实数据渲染 ═══════════════════
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { DataTableColumn } from '../types'
import type { FormDefinition, LayoutNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

function col(key: string, title: string): DataTableColumn {
  return { key, title, render: 'text' }
}

function buildDefinition(opts: { data?: Record<string, unknown>[] } = {}): FormDefinition {
  const table = getElementTypeDef('dataTable')!.defaults() as LayoutNode
  table.id = 'table1'
  table.key = 'table1'
  table.name = 'table_a'
  table.props = {
    ...table.props,
    columns: [col('name', '姓名'), col('age', '年龄')],
    ...(opts.data ? { data: opts.data } : {}),
  }
  return {
    version: DSL_VERSION,
    id: 'dt-canvas-test',
    name: 'dt-canvas-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [table],
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

function tableColumnsOf(state: FormBuilderState) {
  const table = state.formDefinition.value.root.children.find((n) => n.key === 'table1') as
    | LayoutNode
    | undefined
  return (table?.props as { columns?: DataTableColumn[] } | undefined)?.columns
}

describe('数据表格画布', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('选中列后按 Backspace：删除该列而不是整个表格', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const ths = wrapper.findAll('thead th[data-canvas-item="true"]')
    expect(ths).toHaveLength(2)

    await ths[0]!.trigger('pointerdown')
    await settle()
    expect(state.selectedKey.value).toBe('table1')
    expect(state.selectedColumnIndex.value).toBe(0)

    await ths[0]!.trigger('keydown', { key: 'Backspace' })
    await settle()

    const columns = tableColumnsOf(state)
    expect(columns).toHaveLength(1)
    expect(columns?.[0]?.key).toBe('age')
    // 仍选中该表格，选中态落到同位置的相邻列（原 index0 现指向剩下的唯一列）
    expect(state.selectedKey.value).toBe('table1')
    expect(state.selectedColumnIndex.value).toBe(0)

    wrapper.unmount()
  })

  it('全部列删完后：selectedColumnIndex 清空，仍选中该表格', async () => {
    const table = getElementTypeDef('dataTable')!.defaults() as LayoutNode
    table.id = 'table1'
    table.key = 'table1'
    table.name = 'table_a'
    table.props = { ...table.props, columns: [col('only', '唯一列')] }
    const def: FormDefinition = {
      version: DSL_VERSION,
      id: 'dt-canvas-test-2',
      name: 'dt-canvas-test-2',
      root: {
        id: 'root',
        category: 'container',
        type: 'group',
        renderAs: 'formkit',
        dataType: 'object',
        children: [table],
      },
      settings: { labelWidth: 80, labelAlign: 'top' },
    }
    const wrapper = mount(BuilderMain, {
      props: { modelValue: def },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const th = wrapper.find('thead th[data-canvas-item="true"]')
    expect(th.exists()).toBe(true)
    await th.trigger('pointerdown')
    await settle()

    await th.trigger('keydown', { key: 'Backspace' })
    await settle()

    expect(tableColumnsOf(state)).toBeUndefined()
    expect(state.selectedKey.value).toBe('table1')
    expect(state.selectedColumnIndex.value).toBeNull()

    wrapper.unmount()
  })

  it('点击表头「+」格 → 选择器 pick → 定义里多一列', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const addBtn = wrapper.find('[data-testid="data-table-add-column-btn"]')
    expect(addBtn.exists()).toBe(true)
    await addBtn.trigger('click')
    await settle()

    const options = Array.from(document.querySelectorAll('[data-field-type]'))
    expect(options.length).toBeGreaterThan(0)
    ;(options[0] as HTMLButtonElement).click()
    await settle()

    expect(tableColumnsOf(state)).toHaveLength(3)

    wrapper.unmount()
  })

  it('无数据时渲染 3 行示例数据并显示「示例数据」标签；有数据时渲染真实数据', async () => {
    const emptyWrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    expect(emptyWrapper.findAll('tbody tr')).toHaveLength(3)
    expect(emptyWrapper.text()).toContain('示例数据')
    emptyWrapper.unmount()

    const filledWrapper = mount(BuilderMain, {
      props: {
        modelValue: buildDefinition({
          data: [
            { name: '张三', age: '20' },
            { name: '李四', age: '21' },
          ],
        }),
      },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    expect(filledWrapper.findAll('tbody tr')).toHaveLength(2)
    expect(filledWrapper.text()).toContain('张三')
    expect(filledWrapper.text()).not.toContain('示例数据')
    filledWrapper.unmount()
  })
})
