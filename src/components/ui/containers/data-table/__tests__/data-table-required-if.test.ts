// @vitest-environment happy-dom
// ═══ G：数据表格列元素——requiredIf 按当前行数据生效 ═══════════════════════════════
// 成本考量：数据表格列只落地了 requiredIf（见 DataTableRowCellInput.vue 顶部注释），
// disabledIf/readonlyIf 未覆盖，这里只测 requiredIf。挂载方式与
// data-table-data-grid-modal.test.ts「保存前按列校验」一节完全一致。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import { getElementTypeDef } from '@/dsl'
import { provideFormDefinition } from '@/composables/use-form-definition'
import { createFormBuilderState } from '@/state/create-form-builder-state'
import DataTableDataGridModal from '../DataTableDataGridModal.vue'
import type { DataTableColumn } from '../types'
import type { Expr, FieldNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

function rowEls(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll('tbody tr'))
}

function click(selector: string, nth = 0) {
  const els = document.querySelectorAll(selector)
  ;(els[nth] as HTMLElement).click()
}

function mountModalWithFormContext(data: Record<string, unknown>[], cols: DataTableColumn[]) {
  const state = createFormBuilderState()
  const Host = defineComponent({
    setup() {
      provideFormDefinition(state.formDefinition)
      const show = ref(true)
      return () =>
        h(DataTableDataGridModal, {
          show: show.value,
          columns: cols,
          data,
          rowKey: 'id',
          'onUpdate:show': (v: boolean) => (show.value = v),
        })
    },
  })
  return mount(Host, {
    attachTo: document.body,
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
  })
}

// eq($flag, 'yes')：name 列的 requiredIf 引用同一行的 flag 列
const flagIsYes: Expr = {
  type: 'call',
  fn: 'eq',
  args: [
    { type: 'field', name: 'flag' },
    { type: 'literal', value: 'yes' },
  ],
}

const cols: DataTableColumn[] = [
  { key: 'flag', title: 'Flag' },
  {
    key: 'name',
    title: '姓名',
    element: {
      ...(getElementTypeDef('text')!.defaults() as FieldNode),
      name: 'name',
      label: '姓名',
      requiredIf: flagIsYes,
    },
  },
]

describe('DataTableDataGridModal：列元素 requiredIf 按行数据生效', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('flag=no 时姓名列非必填，留空可直接保存', async () => {
    const wrapper = mountModalWithFormContext([{ flag: 'no', name: '', id: 'u1' }], cols)
    const modal = wrapper.findComponent(DataTableDataGridModal)
    await settle()

    click('[data-testid="dt-grid-save"]')
    await settle()
    expect(modal.emitted('save')).toBeTruthy()

    wrapper.unmount()
  })

  it('flag=yes 时姓名列变必填：留空点保存被拦截，填上后可保存', async () => {
    const wrapper = mountModalWithFormContext([{ flag: 'yes', name: '', id: 'u1' }], cols)
    const modal = wrapper.findComponent(DataTableDataGridModal)
    await settle()

    click('[data-testid="dt-grid-save"]')
    await vi.waitFor(() => expect(document.body.textContent).toContain('不得留空'))
    expect(modal.emitted('save')).toBeFalsy()

    const nameInput = rowEls()[0]!.querySelectorAll('input')[1] as HTMLInputElement
    nameInput.value = '张三'
    nameInput.dispatchEvent(new Event('input'))
    await vi.waitFor(() => expect(document.body.textContent).not.toContain('不得留空'))

    click('[data-testid="dt-grid-save"]')
    await vi.waitFor(() => expect(modal.emitted('save')).toBeTruthy())
    const rows = modal.emitted('save')![0]![0] as Record<string, unknown>[]
    expect(rows[0]!.name).toBe('张三')

    wrapper.unmount()
  })
})
