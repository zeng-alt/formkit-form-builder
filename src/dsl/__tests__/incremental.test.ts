// ═══ createSchemaProjector 增量转换：按节点身份缓存 ═══════════════════════════════
// 覆盖规格 D1（缓存改为按实例：projector.toSchema/toOutputSchema 按节点身份缓存并
// 命中返回同一对象）与 D1（projector.toOutputSchema 不会原地改写 toSchema 的缓存
// 输出——开发态冻结下改写会直接抛错）。
// 公开的 dslToSchema/dslToOutputSchema 本身已改为无缓存纯函数，两次调用不应共享
// 任何缓存，覆盖在同文件末尾的独立用例里。

import { describe, expect, it } from 'vitest'
import { createSchemaProjector, dslToSchema, dslToOutputSchema } from '@/dsl'
import { updateDslNodeAtKey } from '@/utils/schema/dsl-tree'
import { DSL_VERSION } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition, FormNode } from '@/types/dsl'
import { schemaChildren } from '@/utils/schema/types'

function textField(id: string, label: string): FieldNode {
  return {
    id,
    key: id,
    category: 'field',
    type: 'text',
    renderAs: 'formkit',
    name: id,
    label,
  }
}

function groupContainer(id: string, children: FormNode[]): ContainerNode {
  return {
    id,
    key: id,
    category: 'container',
    type: 'group',
    renderAs: 'formkit',
    dataType: 'object',
    name: id,
    children,
  }
}

function buildDef(children: FormNode[]): FormDefinition {
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
      children,
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
  }
}

describe('createSchemaProjector：按节点身份缓存', () => {
  it('同一个 definition 调两次，根 children 的每个元素 toBe 上次的', () => {
    const def = buildDef([textField('a', 'A'), textField('b', 'B'), textField('c', 'C')])
    const projector = createSchemaProjector()

    const first = projector.toSchema(def)
    const second = projector.toSchema(def)

    const firstChildren = schemaChildren(first[0])
    const secondChildren = schemaChildren(second[0])
    expect(firstChildren).toHaveLength(3)
    expect(secondChildren).toHaveLength(3)
    for (let i = 0; i < firstChildren.length; i++) {
      expect(secondChildren[i]).toBe(firstChildren[i])
    }
  })

  it('只改嵌套在容器里的一个字段的 label：该字段与其容器祖先是新对象，兄弟字段/其他容器子树 toBe 旧对象', () => {
    const nested1 = textField('nested1', 'N1')
    const nested2 = textField('nested2', 'N2')
    const group = groupContainer('g', [nested1, nested2])
    const sibling = textField('sib', 'Sibling')
    const otherGroup = groupContainer('g2', [textField('other', 'Other')])
    const def = buildDef([sibling, group, otherGroup])
    const projector = createSchemaProjector()

    const before = projector.toSchema(def)
    const beforeChildren = schemaChildren(before[0])
    const beforeSibling = beforeChildren[0]!
    const beforeGroup = beforeChildren[1]!
    const beforeOtherGroup = beforeChildren[2]!
    const beforeGroupChildren = schemaChildren(beforeGroup)
    const beforeNested1 = beforeGroupChildren[0]!
    const beforeNested2 = beforeGroupChildren[1]!

    // 用 updateDslNodeAtKey 展开拷贝出只改了 nested1.label 的新 DSL（不可变更新）
    const { nodes: nextRootChildren } = updateDslNodeAtKey(def.root.children, 'g', {
      ...group,
      children: group.children.map((n) =>
        n === nested1 ? { ...nested1, label: 'N1-changed' } : n,
      ),
    })
    const nextDef: FormDefinition = { ...def, root: { ...def.root, children: nextRootChildren } }

    const after = projector.toSchema(nextDef)
    const afterChildren = schemaChildren(after[0])
    const afterSibling = afterChildren[0]!
    const afterGroup = afterChildren[1]!
    const afterOtherGroup = afterChildren[2]!
    const afterGroupChildren = schemaChildren(afterGroup)
    const afterNested1 = afterGroupChildren[0]!
    const afterNested2 = afterGroupChildren[1]!

    // label 按渲染原语可能落在顶层或 props 里（见 dsl/convert/field.ts），两处都读一下
    const labelOf = (s: typeof afterNested1) => (s as any).label ?? (s as any).props?.label

    // 改动节点本身与其容器祖先：新对象
    expect(afterNested1).not.toBe(beforeNested1)
    expect(labelOf(afterNested1)).toBe('N1-changed')
    expect(afterGroup).not.toBe(beforeGroup)

    // 未改动的兄弟字段、容器内未改字段、其他容器子树：原对象引用
    expect(afterSibling).toBe(beforeSibling)
    expect(afterNested2).toBe(beforeNested2)
    expect(afterOtherGroup).toBe(beforeOtherGroup)
  })

  it('projector.toOutputSchema 调用前后，projector.toSchema 的缓存输出未被改动（深比较快照 + 冻结下不抛错）', () => {
    const group = groupContainer('g', [textField('n1', 'N1')])
    const def = buildDef([textField('a', 'A'), group])
    const projector = createSchemaProjector()

    // 根 formNode / rootChildren 数组每次都新建（只有一层，见 schema-adapter.ts 注释），
    // 真正被缓存、需要保持不被改写的是数组里的每个元素
    const beforeChildren = schemaChildren(projector.toSchema(def)[0])
    const snapshotBefore = JSON.parse(JSON.stringify(beforeChildren))

    // 触发一次 toOutputSchema：内部会对容器/布局节点做 group 包裹，
    // 曾经的实现会原地改写 toSchema 的缓存输出（n.children=/delete props.name），
    // 开发态冻结下这类改写会直接抛 TypeError
    expect(() => projector.toOutputSchema(def)).not.toThrow()

    const afterChildren = schemaChildren(projector.toSchema(def)[0])
    expect(afterChildren).toHaveLength(beforeChildren.length)
    for (let i = 0; i < afterChildren.length; i++) {
      expect(afterChildren[i]).toBe(beforeChildren[i])
    }
    expect(JSON.parse(JSON.stringify(afterChildren))).toEqual(snapshotBefore)
  })
})

describe('公开 dslToSchema / dslToOutputSchema：无缓存纯函数', () => {
  it('同一个 definition 调两次，结果不是同一引用（不缓存）', () => {
    const def = buildDef([textField('a', 'A'), textField('b', 'B')])

    const first = dslToSchema(def)
    const second = dslToSchema(def)

    expect(second).not.toBe(first)
    const firstChildren = schemaChildren(first[0])
    const secondChildren = schemaChildren(second[0])
    for (let i = 0; i < firstChildren.length; i++) {
      expect(secondChildren[i]).not.toBe(firstChildren[i])
    }
    // 但内容仍然一致
    expect(JSON.parse(JSON.stringify(second))).toEqual(JSON.parse(JSON.stringify(first)))
  })

  it('对同一个 definition 对象原地修改（reactive 场景）后再调用，结果反映修改', () => {
    // 模拟外部把 definition 包进 reactive()：这里直接原地改字段属性，
    // 不经过展开拷贝——公开函数不缓存，理应读到最新值
    const f = textField('a', 'Old')
    const def = buildDef([f])

    const before = dslToSchema(def)
    const labelOf = (s: any) => s.label ?? s.props?.label
    expect(labelOf(schemaChildren(before[0])[0])).toBe('Old')

    ;(f as any).label = 'New'
    const after = dslToSchema(def)
    expect(labelOf(schemaChildren(after[0])[0])).toBe('New')
  })

  it('返回结果未被冻结：可以原地改写而不抛错', () => {
    const def = buildDef([textField('a', 'A')])

    const schema = dslToSchema(def)
    expect(Object.isFrozen(schema[0])).toBe(false)
    const child = schemaChildren(schema[0])[0] as any
    expect(Object.isFrozen(child)).toBe(false)
    expect(() => {
      child.label = '改写不应该抛错'
    }).not.toThrow()

    const outputSchema = dslToOutputSchema(def)
    expect(Object.isFrozen(outputSchema[0])).toBe(false)
  })
})
