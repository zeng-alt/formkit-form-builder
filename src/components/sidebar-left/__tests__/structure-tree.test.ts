// @vitest-environment happy-dom
// ═══ E1：结构树 ↔ 画布联动——组件行为单测 ═══════════════════════════════════════
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import StructureTree from '@/components/sidebar-left/StructureTree.vue'
import {
  createFormBuilderState,
  provideFormBuilderState,
  type FormBuilderState,
} from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import { dropFlashState } from '@/utils/dnd/drop-flash'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function textField(id: string, label: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = id
  field.key = id
  field.name = id
  field.label = label
  return field
}

function buildDefinition(): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'tree-test',
    name: 'tree-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [textField('age', '年龄'), textField('name', '姓名')],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function mountTree(state: FormBuilderState) {
  const Host = defineComponent({
    setup() {
      provideFormBuilderState(state)
      return () => h(StructureTree, { nodes: state.formDefinition.value.root.children ?? [] })
    },
  })
  return mount(Host)
}

describe('StructureTree：E1 结构树 ↔ 画布联动', () => {
  it('点击树节点：选中该节点，画布对应条目触发滚动 + dropFlash 闪烁', async () => {
    const state = createFormBuilderState()
    state.setFormDefinition(buildDefinition(), { resetHistory: true })
    const wrapper = mountTree(state)
    await settle()

    // 模拟画布上已挂载的对应条目（data-item-key 与 DSL key 一致，见 CanvasGridItem.vue）
    const canvasItem = document.createElement('li')
    canvasItem.setAttribute('data-item-key', 'age')
    document.body.appendChild(canvasItem)
    let scrolled = false
    canvasItem.scrollIntoView = () => {
      scrolled = true
    }

    const beforeFlash = dropFlashState.age ?? 0

    const row = wrapper.find('.n-tree-node')
    expect(row.exists()).toBe(true)
    await row.trigger('click')
    await settle()

    expect(state.selectedKey.value).toBe('age')
    expect(scrolled).toBe(true)
    expect(dropFlashState.age ?? 0).toBe(beforeFlash + 1)

    canvasItem.remove()
    wrapper.unmount()
  })

  it('复制一份：生成副本、name 去重、label 带副本后缀，副本被选中', async () => {
    const state = createFormBuilderState()
    state.setFormDefinition(buildDefinition(), { resetHistory: true })
    const wrapper = mountTree(state)
    await settle()

    const dupBtn = wrapper.find('button[aria-label="复制一份"]')
    expect(dupBtn.exists()).toBe(true)
    await dupBtn.trigger('click')
    await settle()

    const root = state.formDefinition.value.root.children
    expect(root).toHaveLength(3)
    const clone = root.find((n) => n.key === state.selectedKey.value)
    expect(clone?.label).toBe('年龄 副本')
    expect(clone?.name).not.toBe('age')

    wrapper.unmount()
  })

  it('双击重命名：Enter 确认写入 label，Esc 取消不改动', async () => {
    const state = createFormBuilderState()
    state.setFormDefinition(buildDefinition(), { resetHistory: true })
    const wrapper = mountTree(state)
    await settle()

    const row = wrapper.find('.n-tree-node')
    await row.trigger('dblclick')
    await settle()

    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    await input.setValue('年龄（重命名）')
    await input.trigger('keydown', { key: 'Enter' })
    await settle()

    expect(state.formDefinition.value.root.children.find((n) => n.key === 'age')?.label).toBe(
      '年龄（重命名）',
    )

    // Esc 取消：不应写入
    await row.trigger('dblclick')
    await settle()
    const input2 = wrapper.find('input')
    await input2.setValue('不应该生效')
    await input2.trigger('keydown', { key: 'Escape' })
    await settle()
    expect(state.formDefinition.value.root.children.find((n) => n.key === 'age')?.label).toBe(
      '年龄（重命名）',
    )

    wrapper.unmount()
  })
})
