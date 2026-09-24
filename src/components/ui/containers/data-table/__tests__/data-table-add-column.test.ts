// @vitest-environment happy-dom
// ═══ 数据表格：新增列必须真正写进表单定义 ═══════════════════════════════════════
// 容器 DnD 的 items 是深层响应式 ref，新增列对象读出来是 Vue 代理；若把代理直接提交，
// 开发态深度冻结会冻结代理背后的原始对象，随后读 element 违反 Proxy 不变式抛错，
// 整次提交失败——画布上看得到新列，定义里却没有，点列时属性面板找不到这一列。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FormDefinition, LayoutNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

function buildDefinition(): FormDefinition {
  const table = getElementTypeDef('dataTable')!.defaults() as LayoutNode
  table.id = 'table1'
  table.key = 'table1'
  table.name = 'table_a'
  return {
    version: DSL_VERSION,
    id: 'dt-test',
    name: 'dt-test',
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

describe('数据表格新增列', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('新增两列后两列都写进定义的 props.columns', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = (wrapper.vm.$ as any).provides[
      BUILDER_STATE_KEY as unknown as string
    ] as FormBuilderState

    const addColumn = async (nth: number) => {
      const btn = wrapper.find('[data-testid="data-table-add-column-btn"]')
      expect(btn.exists(), '应能找到表头「+」新增列格').toBe(true)
      await btn.trigger('click')
      await settle()
      const options = Array.from(document.querySelectorAll('[data-field-type]'))
      expect(options.length).toBeGreaterThan(nth)
      ;(options[nth] as HTMLButtonElement).click()
      await settle()
    }

    await addColumn(0)
    await addColumn(1)

    const table = state.formDefinition.value.root.children.find((n) => n.key === 'table1') as
      | LayoutNode
      | undefined
    const columns = (table?.props as { columns?: unknown[] } | undefined)?.columns
    expect(Array.isArray(columns)).toBe(true)
    expect(columns).toHaveLength(2)

    wrapper.unmount()
  })
})
