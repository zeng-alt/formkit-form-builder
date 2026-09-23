// @vitest-environment happy-dom
// ═══ 回归：画布条目共用的 schema 渲染数据不能被 FormKitSchema 写入 slots ═══════════════
// 画布上每个条目各有一个 FormKitSchema，共用同一个 data（useSchemaRenderData 的结果）。
// @formkit/vue 的 FormKitSchema 挂载时往 data 写入自己的 slots、卸载时置为 null；画布
// 设计态下 data 曾是一个普通对象（没有像 FormRenderer 那样挡住 slots 写入），一个条目的
// 挂载/卸载会改写所有条目共用的 slots。这里断言共用 data 挡住了 slots 写入，并锁定删除
// 一个条目时其它条目的 FormKitSchema 不会被连带重渲染。
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { createSchemaRenderData } from '@/composables/use-schema-render-data'
import { DSL_VERSION } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

function textField(id: string): FieldNode {
  return { id, key: id, category: 'field', type: 'text', renderAs: 'formkit', name: id, label: id }
}

function buildDefinition(ids: string[]): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'shared-data',
    name: 'shared-data',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: ids.map(textField),
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

describe('画布共用的 schema 渲染数据', () => {
  it('没有表单数据时同样挡住 slots 写入与删除', () => {
    const data = createSchemaRenderData(null).value
    data.slots = { default: () => null }
    expect(data.slots).toBeUndefined()
    expect(delete data.slots).toBe(true)
    expect(typeof data.fkb_and).toBe('function')
  })

  it('删除一个条目时，其它条目的 FormKitSchema 不重渲染', async () => {
    const updatedItems = new Set<string>()
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition(['a', 'b', 'c', 'd', 'e']) },
      attachTo: document.body,
      global: {
        plugins: [[formkitPlugin, formkitDefaultConfig]],
        mixins: [
          {
            updated(this: ComponentPublicInstance) {
              if (this.$options.name !== 'FormKitSchema') return
              const el = this.$el as Node | null
              const host = el && (el.nodeType === 1 ? (el as Element) : el.parentElement)
              const key = host?.closest('[data-item-key]')?.getAttribute('data-item-key')
              if (key) updatedItems.add(key)
            },
          },
        ],
      },
    })
    await settle()
    const provides = (wrapper.vm.$ as unknown as { provides: Record<symbol, unknown> }).provides
    const state = provides[BUILDER_STATE_KEY as symbol] as FormBuilderState
    updatedItems.clear()

    const def = state.formDefinition.value
    state.commitFormDefinition({
      ...def,
      root: { ...def.root, children: def.root.children.filter((n) => n.key !== 'c') },
    })
    await settle()

    expect(wrapper.find('[data-item-key="c"]').exists()).toBe(false)
    expect([...updatedItems]).toEqual([])
    wrapper.unmount()
  })
})
