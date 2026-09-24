// ═══ E2：历史条目（reason/at）+ jumpTo 单测 ═══════════════════════════════════
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
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

describe('历史条目：reason 记录', () => {
  it('每次提交的 reason 被记录在对应条目上，当前步在 historyEntries 里可定位', () => {
    const state = createFormBuilderState()
    const def0 = buildDef('A0')
    state.setFormDefinition(def0, { resetHistory: true })

    const def1 = { ...def0, name: 'form-1' }
    state.commitFormDefinition(def1, { reason: 'field-edit' })

    const def2 = { ...def1, name: 'form-2' }
    state.commitFormDefinition(def2, { reason: 'delete' })

    const entries = state.historyEntries.value
    expect(entries).toHaveLength(3)
    // 从旧到新：初始态（reason 缺省）→ field-edit → delete（当前）
    expect(entries[0]!.reason).toBeUndefined()
    expect(entries[1]!.reason).toBe('field-edit')
    expect(entries[2]!.reason).toBe('delete')
    expect(state.currentHistoryIndex.value).toBe(2)
    expect(entries[2]!.def).toBe(state.formDefinition.value)
  })

  it('缺省 reason（如外部 setFormDefinition）记录为 undefined，面板侧再归为「修改」', () => {
    const state = createFormBuilderState()
    state.setFormDefinition(buildDef('X'), { resetHistory: true })
    expect(state.historyEntries.value[0]!.reason).toBeUndefined()
  })
})

describe('历史条目：合并窗口下的条目', () => {
  it('同 reason + 合并窗口内的连续提交只产生一条历史条目，reason/at 更新为最新一次', () => {
    const state = createFormBuilderState()
    const def0 = buildDef('A0')
    state.setFormDefinition(def0, { resetHistory: true })

    const def1 = { ...def0, name: 'r1' }
    state.commitFormDefinition(def1, { reason: 'resize', merge: true })
    const afterFirst = state.historyEntries.value
    expect(afterFirst).toHaveLength(2)

    const def2 = { ...def1, name: 'r2' }
    state.commitFormDefinition(def2, { reason: 'resize', merge: true })
    const entries = state.historyEntries.value
    // 合并进同一条：历史条目数不变，past 仍只有初始态一条
    expect(entries).toHaveLength(2)
    expect(entries[1]!.reason).toBe('resize')
    expect(entries[1]!.def).toBe(state.formDefinition.value)

    // undo 一次应直接回到 def0（合并期间没有产生中间快照）
    state.undo()
    expect(state.formDefinition.value.name).toBe(def0.name)
  })
})

describe('jumpTo：前后跳转与 future 保留', () => {
  it('跳到更早的一步再跳回最新一步，future 里的快照原样保留（同引用）', () => {
    const state = createFormBuilderState()
    const def0 = buildDef('A0')
    state.setFormDefinition(def0, { resetHistory: true })

    const def1 = { ...def0, name: 'v1' }
    state.commitFormDefinition(def1, { reason: 'field-edit' })
    const def2 = { ...def1, name: 'v2' }
    state.commitFormDefinition(def2, { reason: 'field-edit' })
    const def3 = { ...def2, name: 'v3' }
    state.commitFormDefinition(def3, { reason: 'field-edit' })

    // 当前在下标 3（v3），跳到下标 1（v1）
    expect(state.currentHistoryIndex.value).toBe(3)
    state.jumpTo(1)
    expect(state.currentHistoryIndex.value).toBe(1)
    expect(state.formDefinition.value.name).toBe('v1')
    expect(state.canRedo.value).toBe(true)

    const entriesAfterBack = state.historyEntries.value
    // future 部分（下标 2、3）原样保留
    expect(entriesAfterBack[2]!.def.name).toBe('v2')
    expect(entriesAfterBack[3]!.def.name).toBe('v3')

    // 再跳回最新一步：等价于连续 redo，回到同一份 v3 定义
    state.jumpTo(3)
    expect(state.currentHistoryIndex.value).toBe(3)
    expect(state.formDefinition.value.name).toBe('v3')
    expect(state.canRedo.value).toBe(false)
  })

  it('跳到当前步 / 越界下标时忽略', () => {
    const state = createFormBuilderState()
    state.setFormDefinition(buildDef('A0'), { resetHistory: true })
    state.commitFormDefinition({ ...state.formDefinition.value, name: 'v1' }, { reason: 'x' })

    const before = state.formDefinition.value
    state.jumpTo(state.currentHistoryIndex.value)
    expect(state.formDefinition.value).toBe(before)

    state.jumpTo(999)
    expect(state.formDefinition.value).toBe(before)
    state.jumpTo(-1)
    expect(state.formDefinition.value).toBe(before)
  })
})

describe('新提交清空 future', () => {
  it('undo 后再提交新内容，之前的 future 被丢弃', () => {
    const state = createFormBuilderState()
    state.setFormDefinition(buildDef('A0'), { resetHistory: true })
    state.commitFormDefinition(
      { ...state.formDefinition.value, name: 'v1' },
      { reason: 'field-edit' },
    )
    state.commitFormDefinition(
      { ...state.formDefinition.value, name: 'v2' },
      { reason: 'field-edit' },
    )

    state.undo()
    expect(state.canRedo.value).toBe(true)

    state.commitFormDefinition(
      { ...state.formDefinition.value, name: 'v1-branched' },
      { reason: 'field-edit' },
    )
    expect(state.canRedo.value).toBe(false)
    expect(state.historyEntries.value.at(-1)!.def.name).toBe('v1-branched')
  })
})
