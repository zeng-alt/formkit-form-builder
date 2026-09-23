// ═══ 历史漏斗：提交 → undo → redo 后的对象身份保持 ═══════════════════════════════
// 覆盖规格 B4：历史快照直接存定义引用（删掉 cloneDef），undo/redo 之间不再深拷贝。

import { describe, expect, it } from 'vitest'
import { createFormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

function textField(id: string, label: string): FieldNode {
  return { id, key: id, category: 'field', type: 'text', renderAs: 'formkit', name: id, label }
}

function buildDef(labelA: string): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'f',
    name: 'form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [textField('a', labelA), textField('b', 'B')],
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
  }
}

describe('schema-history：提交 → undo → redo 的对象身份', () => {
  it('undo 恢复的定义 toBe 之前那次提交前的对象；未改动节点的对象身份一路保持', () => {
    const state = createFormBuilderState()

    const def0 = buildDef('A0')
    state.setFormDefinition(def0, { resetHistory: true })
    expect(state.formDefinition.value).toBe(def0)

    const bNode0 = def0.root.children[1]!

    const def1: FormDefinition = {
      ...def0,
      root: {
        ...def0.root,
        children: [{ ...def0.root.children[0]!, label: 'A1' }, bNode0],
      },
    }
    state.commitFormDefinition(def1, { reason: 'edit-a' })
    expect(state.formDefinition.value).toBe(def1)
    // 未改动的兄弟节点：提交前后同一个对象引用
    expect(state.formDefinition.value.root.children[1]).toBe(bNode0)

    expect(state.canUndo.value).toBe(true)
    state.undo()
    // undo 恢复的定义就是之前那次提交前的同一个对象（历史快照直接存引用，不深拷贝）
    expect(state.formDefinition.value).toBe(def0)
    expect(state.formDefinition.value.root.children[1]).toBe(bNode0)

    expect(state.canRedo.value).toBe(true)
    state.redo()
    // redo 恢复的定义就是提交时那份对象
    expect(state.formDefinition.value).toBe(def1)
    expect(state.formDefinition.value.root.children[1]).toBe(bNode0)
  })

  it('commitSchema/commitSchemaReconcile 走 schema 投影提交，未改动的 DSL 节点身份也保持', () => {
    const state = createFormBuilderState()
    const def0 = buildDef('A0')
    state.setFormDefinition(def0, { resetHistory: true })

    const schema0 = state.formSchema.value
    expect(schema0).toHaveLength(2)

    // 只改第一个 schema 节点的 label，通过 reconcile 提交
    const changed = { ...(schema0[0] as any) }
    changed.label = 'A-changed'
    const nextSchema = [changed, schema0[1]]

    const bNodeBefore = state.formDefinition.value.root.children[1]
    state.commitSchemaReconcile(nextSchema as any, { reason: 'reconcile-edit' })

    const afterDef = state.formDefinition.value
    expect(afterDef).not.toBe(def0)
    // 未改动的第二个字段：DSL 对象身份保持
    expect(afterDef.root.children[1]).toBe(bNodeBefore)

    expect(state.canUndo.value).toBe(true)
    state.undo()
    expect(state.formDefinition.value).toBe(def0)
  })
})
