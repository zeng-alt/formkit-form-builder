// @vitest-environment happy-dom
// ═══ 固定数据编辑弹窗：增删改行 + 保存 / 取消语义 ═══════════════════════════════
// n-modal 默认把内容 Teleport 到 document.body，挂载后的交互元素不在 wrapper 的
// DOM 子树里（同 data-table-add-column.test.ts），这里统一用 document.querySelector
// 系列直接操作真实 DOM，再用 wrapper.emitted() 校验组件对外发出的事件。
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
import type { FieldNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

const columns: DataTableColumn[] = [
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄' },
]

function mountModal(data: Record<string, unknown>[], cols: DataTableColumn[] = columns) {
  return mount(DataTableDataGridModal, {
    props: { show: true, columns: cols, data, rowKey: 'id' },
    attachTo: document.body,
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
  })
}

function rowEls(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll('tbody tr'))
}

function click(selector: string, nth = 0) {
  const els = document.querySelectorAll(selector)
  ;(els[nth] as HTMLElement).click()
}

describe('DataTableDataGridModal', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('添加行 / 改单元格 / 删除行后保存：emit 的 rows 正确，缺主键自动补', async () => {
    const wrapper = mountModal([{ name: '张三', age: 20, id: 'u1' }])
    await settle()

    expect(rowEls()).toHaveLength(1)

    // + 添加行：新增一行空白行
    click('[data-testid="dt-grid-add-row"]')
    await settle()
    expect(rowEls()).toHaveLength(2)

    // 改第二行（新增行）第一个单元格：name
    const secondRowInput = rowEls()[1]!.querySelector('input') as HTMLInputElement
    secondRowInput.value = '李四'
    secondRowInput.dispatchEvent(new Event('input'))
    await settle()

    // 删除第一行（张三）
    click('[data-testid="dt-grid-delete-row"]', 0)
    await settle()
    expect(rowEls()).toHaveLength(1)

    // 保存
    click('[data-testid="dt-grid-save"]')
    await settle()

    const saved = wrapper.emitted('save')
    expect(saved).toBeTruthy()
    const rows = saved![0]![0] as Record<string, unknown>[]
    expect(rows).toHaveLength(1)
    expect(rows[0]!.name).toBe('李四')
    // 新增行没有主键，保存时自动补 local_ 前缀
    expect(String(rows[0]!.id)).toMatch(/^local_/)

    expect(wrapper.emitted('update:show')?.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('取消不 emit save，只关闭弹窗', async () => {
    const wrapper = mountModal([{ name: '张三', age: 20, id: 'u1' }])
    await settle()

    click('[data-testid="dt-grid-add-row"]')
    await settle()
    expect(rowEls()).toHaveLength(2)

    click('[data-testid="dt-grid-cancel"]')
    await settle()

    expect(wrapper.emitted('save')).toBeFalsy()
    expect(wrapper.emitted('update:show')?.at(-1)).toEqual([false])

    wrapper.unmount()
  })

  it('已有主键的行保存时保留原主键，不被覆盖', async () => {
    const wrapper = mountModal([{ name: '张三', age: 20, id: 'u1' }])
    await settle()

    click('[data-testid="dt-grid-save"]')
    await settle()

    const rows = wrapper.emitted('save')![0]![0] as Record<string, unknown>[]
    expect(rows[0]!.id).toBe('u1')

    wrapper.unmount()
  })

  it('无数据时显示空状态，点「添加行」可新增', async () => {
    const wrapper = mountModal([])
    await settle()

    expect(document.querySelector('.n-empty')).toBeTruthy()
    click('[data-testid="dt-grid-add-row-empty"]')
    await settle()
    expect(rowEls()).toHaveLength(1)

    wrapper.unmount()
  })
})

// 列带真实字段元素时，单元格渲染成注册的 FormKit 输入组件（如 NaiveTextInput），
// 它内部经 useBindEvents 依赖 useFormDefinition() 的表单定义上下文——用一个提供该
// 上下文的宿主组件包一层，同真实画布 / 预览树的挂载方式。
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

describe('DataTableDataGridModal：保存前按列校验', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  // 姓名列必填（来源元素带 validation），年龄列无来源元素（NInput 兜底，不参与校验）
  const requiredCols: DataTableColumn[] = [
    {
      key: 'name',
      title: '姓名',
      element: {
        ...(getElementTypeDef('text')!.defaults() as FieldNode),
        name: 'name',
        label: '姓名',
        validation: [{ rule: 'required' }],
      },
    },
    { key: 'age', title: '年龄' },
  ]

  it('必填列留空时点保存不 emit save，填上后可保存', async () => {
    const wrapper = mountModalWithFormContext([], requiredCols)
    const modal = wrapper.findComponent(DataTableDataGridModal)
    await settle()

    click('[data-testid="dt-grid-add-row-empty"]')
    await settle()

    click('[data-testid="dt-grid-save"]')
    // 必填提示出现（表头本来就有「姓名」，这里断言提示文案本身），且没有 emit save
    await vi.waitFor(() => expect(document.body.textContent).toContain('不得留空'))
    expect(modal.emitted('save')).toBeFalsy()

    const nameInput = rowEls()[0]!.querySelector('input') as HTMLInputElement
    nameInput.value = '张三'
    nameInput.dispatchEvent(new Event('input'))
    // FormKit 的输入有防抖、校验是异步的：等到必填提示消失（值已落到节点并通过校验）
    // 再保存，不用固定时长——CI 机器慢时固定等待不够
    await vi.waitFor(() => expect(document.body.textContent).not.toContain('不得留空'))

    click('[data-testid="dt-grid-save"]')
    await vi.waitFor(() => expect(modal.emitted('save')).toBeTruthy())
    const rows = modal.emitted('save')![0]![0] as Record<string, unknown>[]
    expect(rows[0]!.name).toBe('张三')
    // 内部用的行标识不进入落盘数据
    expect(rows[0]).not.toHaveProperty('__gridRowId')

    wrapper.unmount()
  })

  it('派生列（disabled）不参与校验：只读也能直接保存', async () => {
    const derivedCols: DataTableColumn[] = [
      {
        key: 'name',
        title: '姓名',
        element: {
          ...(getElementTypeDef('text')!.defaults() as FieldNode),
          name: 'name',
          label: '姓名',
          expr: '$age',
          validation: [{ rule: 'required' }],
        },
      },
      { key: 'age', title: '年龄' },
    ]
    const wrapper = mountModalWithFormContext([{ name: '', age: 1, id: 'u1' }], derivedCols)
    const modal = wrapper.findComponent(DataTableDataGridModal)
    await settle()

    click('[data-testid="dt-grid-save"]')
    await settle()
    expect(modal.emitted('save')).toBeTruthy()

    wrapper.unmount()
  })
})
