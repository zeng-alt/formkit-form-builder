// @vitest-environment happy-dom
// ═══ 运行时预览：新增数据弹窗保存前按列校验 ═══════════════════════════════════
// DataTableContainerPreview 是固定数据表格的运行时渲染（$cmp: dataTable），新增/编辑
// 弹窗现在保存前会用外层 FormKit 表单校验各单元格，不通过则不保存、不关弹窗。
// 组件内部依赖 useFormDefinition() 的表单定义上下文（真实渲染树里由 FormRenderer
// provide），这里用一个宿主组件补上，同 data-table-data-grid-modal.test.ts 的做法。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import { getElementTypeDef } from '@/dsl'
import { provideFormDefinition } from '@/composables/use-form-definition'
import { createFormBuilderState } from '@/state/create-form-builder-state'
import DataTableContainerPreview from '../DataTableContainerPreview.vue'
import type { DataTableColumn } from '../types'
import type { FieldNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

// 姓名列必填（来源元素带 validation），年龄列无来源元素，NInput 兜底不参与校验
const columns: DataTableColumn[] = [
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

function mountPreview() {
  const state = createFormBuilderState()
  const Host = defineComponent({
    setup() {
      provideFormDefinition(state.formDefinition)
      return () =>
        h(DataTableContainerPreview, {
          // n-card 只在有 title 或 #header 插槽内容时才渲染 header（含 header-extra 里
          // 的「新增」按钮，见 naive-ui Card.mjs 的 resolveWrappedSlot），必须给个 label
          label: '用户列表',
          columns,
          data: [],
          rowKey: 'id',
          allowAdd: true,
        })
    },
  })
  return mount(Host, {
    attachTo: document.body,
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
  })
}

function findByText(selector: string, text: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) =>
    el.textContent?.includes(text),
  )
}

describe('DataTableContainerPreview：新增数据弹窗保存前校验', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('必填列留空时保存被拦截、不写入数据；填写后可保存', async () => {
    const wrapper = mountPreview()
    await settle()

    findByText('button', '新增')!.click()
    await settle()

    expect(findByText('span', '新增数据')).toBeTruthy()

    // 不填姓名直接保存：不通过校验，不写入数据；必填提示随之出现（提示文案带字段 label）
    findByText('button', '保存')!.click()
    // 必填提示出现（表头本来就有「姓名」，这里断言提示文案本身）
    await vi.waitFor(() => expect(document.body.textContent).toContain('不得留空'))
    expect(document.body.textContent).not.toContain('李四')

    const nameInput = document.querySelector('input') as HTMLInputElement
    nameInput.value = '李四'
    nameInput.dispatchEvent(new Event('input'))
    // FormKit 的输入有防抖、校验是异步的：等到必填提示消失（值已落到节点并通过校验）
    // 再保存，不用固定时长——CI 机器慢时固定等待不够
    await vi.waitFor(() => expect(document.body.textContent).not.toContain('不得留空'))

    findByText('button', '保存')!.click()

    // 数据行写入表格（渲染成只读单元格文本）
    await vi.waitFor(() => expect(document.body.textContent).toContain('李四'))

    wrapper.unmount()
  })
})
