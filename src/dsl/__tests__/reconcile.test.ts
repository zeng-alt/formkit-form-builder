// ═══ reconcileDslTree：按 key 对 DSL 树做差异调和 ═══════════════════════════════
// 语义（读 schema-adapter.ts 实现确认）：
// - nextSchema 每个节点按 __key（或 id）在 currentSchema/currentDslChildren 中查找
//   对应的旧 schema / 旧 DSL 节点；
// - 找到且新旧 schema（JSON 序列化）完全相同 → 直接复用旧 DSL 节点（同一对象引用），
//   不重新转换——这就是"未变子树原样复用"的依据，reorder 场景下每个节点都不变，
//   只有数组顺序变化；
// - 找到但内容变化 → 重新转换该节点，同时保留原 id/key，容器/布局的子节点若整体
//   JSON 未变则复用旧 children 引用，否则递归 reconcile；
// - 找不到 key（新节点）→ 全新转换（schemaNodeToDslNode），产出全新 DSL 节点。

import { describe, it, expect } from 'vitest'
import { dslToSchema, reconcileDslTree } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

function textField(id: string, key: string, label: string): FieldNode {
  return {
    id,
    key,
    category: 'field',
    type: 'text',
    renderAs: 'cmp',
    name: id,
    label,
  }
}

function buildFormDef(children: FieldNode[]): FormDefinition {
  return {
    version: 1,
    id: 'f',
    name: 'form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children,
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
  }
}

function schemaChildrenOf(def: FormDefinition) {
  const schema = dslToSchema(def)
  return (schema[0] as any).children as any[]
}

describe('reconcileDslTree', () => {
  it('仅重排两个节点：顺序变化，未变节点是同一对象引用', () => {
    const a = textField('a', 'ka', 'A')
    const b = textField('b', 'kb', 'B')
    const currentDsl = [a, b]
    const currentSchema = schemaChildrenOf(buildFormDef(currentDsl))
    const nextSchema = [currentSchema[1], currentSchema[0]] // 交换顺序，内容不变

    const result = reconcileDslTree(currentDsl, currentSchema, nextSchema)

    expect(result.map((n) => n.id)).toEqual(['b', 'a'])
    expect(result[0]).toBe(b)
    expect(result[1]).toBe(a)
  })

  it('删除一个节点：结果只保留剩余节点，且是同一对象引用', () => {
    const a = textField('a', 'ka', 'A')
    const b = textField('b', 'kb', 'B')
    const currentDsl = [a, b]
    const currentSchema = schemaChildrenOf(buildFormDef(currentDsl))
    const nextSchema = [currentSchema[0]] // 删掉 b

    const result = reconcileDslTree(currentDsl, currentSchema, nextSchema)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(a)
  })

  it('新增一个带 __key 的节点：产生新的 DSL FieldNode', () => {
    const a = textField('a', 'ka', 'A')
    const currentDsl = [a]
    const currentSchema = schemaChildrenOf(buildFormDef(currentDsl))
    const newNodeSchema = schemaChildrenOf(buildFormDef([textField('c', 'kc', 'C')]))[0]
    const nextSchema = [currentSchema[0], newNodeSchema]

    const result = reconcileDslTree(currentDsl, currentSchema, nextSchema)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe(a)
    expect(result[1]).not.toBe(a)
    expect(result[1].category).toBe('field')
    expect(result[1].type).toBe('text')
    expect(result[1].key).toBe('kc')
    expect(result[1].label).toBe('C')
  })

  it('修改某节点的 label：该节点被重新转换，兄弟节点引用不变', () => {
    const a = textField('a', 'ka', 'A')
    const b = textField('b', 'kb', 'B')
    const currentDsl = [a, b]
    const currentSchema = schemaChildrenOf(buildFormDef(currentDsl))
    const changedA = { ...currentSchema[0], props: { ...currentSchema[0].props, label: 'A2' } }
    const nextSchema = [changedA, currentSchema[1]]

    const result = reconcileDslTree(currentDsl, currentSchema, nextSchema)

    expect(result).toHaveLength(2)
    // 内容变化：重新转换，不再是原对象引用，但 id/key 保留
    expect(result[0]).not.toBe(a)
    expect(result[0].id).toBe('a')
    expect(result[0].key).toBe('ka')
    expect(result[0].label).toBe('A2')
    // 未变兄弟节点：同一对象引用
    expect(result[1]).toBe(b)
  })
})
