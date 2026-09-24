// @vitest-environment happy-dom
// ═══ 固定数据编辑弹窗：增删改行 + 保存 / 取消语义 ═══════════════════════════════
// n-modal 默认把内容 Teleport 到 document.body，挂载后的交互元素不在 wrapper 的
// DOM 子树里（同 data-table-add-column.test.ts），这里统一用 document.querySelector
// 系列直接操作真实 DOM，再用 wrapper.emitted() 校验组件对外发出的事件。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DataTableDataGridModal from '../DataTableDataGridModal.vue'
import type { DataTableColumn } from '../types'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

const columns: DataTableColumn[] = [
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄' },
]

function mountModal(data: Record<string, unknown>[]) {
  return mount(DataTableDataGridModal, {
    props: { show: true, columns, data, rowKey: 'id' },
    attachTo: document.body,
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
