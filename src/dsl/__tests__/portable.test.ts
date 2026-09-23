// ═══ toPortableDefinition：剥离前端专用字段（key / meta.rawSchema）══════════════
import { describe, it, expect } from 'vitest'
import { toPortableDefinition } from '@/dsl/portable'
import { DSL_VERSION } from '@/types/dsl'
import type { ContainerNode, FieldNode, FormDefinition } from '@/types/dsl'

// 嵌套结构：容器（带 key + meta）套一个普通字段（带 key）+ 一个未注册类型兜底节点
// （meta.rawSchema，无损保留的原始 schema 节点，同样是前端专用，不该进后端）。
function buildDefinition(): FormDefinition {
  const rawFallbackNode: FieldNode = {
    id: 'fallback-1',
    key: 'k-fallback',
    category: 'field',
    type: 'unknownWidget',
    renderAs: 'cmp',
    target: 'unknownWidget',
    label: 'Fallback',
    meta: { rawSchema: { $cmp: 'unknownWidget', someProp: 1 } },
  }

  const plainField: FieldNode = {
    id: 'field-1',
    key: 'k-field',
    name: 'username',
    label: 'Username',
    category: 'field',
    type: 'text',
    renderAs: 'formkit',
    value: '',
    validation: [{ rule: 'required' }],
  }

  const cardContainer: ContainerNode = {
    id: 'card-1',
    key: 'k-card',
    category: 'container',
    type: 'card',
    renderAs: 'cmp',
    target: 'card',
    dataType: 'object',
    meta: { rawSchema: { $cmp: 'card' }, businessTag: 'foo' },
    children: [plainField, rawFallbackNode],
  }

  return {
    version: DSL_VERSION,
    id: 'form-1',
    name: 'demo-form',
    root: {
      id: 'root',
      key: 'k-root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [cardContainer],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
    meta: { formTag: 'bar' },
  }
}

describe('toPortableDefinition', () => {
  it('剥离所有层级的 key 与 meta.rawSchema，其余字段逐一保持不变', () => {
    const def = buildDefinition()
    const portable = toPortableDefinition(def)

    const expected: FormDefinition = {
      version: DSL_VERSION,
      id: 'form-1',
      name: 'demo-form',
      root: {
        id: 'root',
        category: 'container',
        type: 'group',
        renderAs: 'formkit',
        dataType: 'object',
        children: [
          {
            id: 'card-1',
            category: 'container',
            type: 'card',
            renderAs: 'cmp',
            target: 'card',
            dataType: 'object',
            // meta 剥掉 rawSchema 后仍剩 businessTag，meta 本身保留
            meta: { businessTag: 'foo' },
            children: [
              {
                id: 'field-1',
                name: 'username',
                label: 'Username',
                category: 'field',
                type: 'text',
                renderAs: 'formkit',
                value: '',
                validation: [{ rule: 'required' }],
              },
              {
                id: 'fallback-1',
                category: 'field',
                type: 'unknownWidget',
                renderAs: 'cmp',
                target: 'unknownWidget',
                label: 'Fallback',
                // meta 剥完只剩 rawSchema 一个键，整个 meta 被删除
              },
            ],
          },
        ],
      },
      settings: { labelWidth: 80, labelAlign: 'top' },
      meta: { formTag: 'bar' },
    }

    expect(portable).toEqual(expected)
  })

  it('不修改原对象：原 def 各层级仍带 key，meta.rawSchema 仍在', () => {
    const def = buildDefinition()
    toPortableDefinition(def)

    expect(def.root.key).toBe('k-root')
    const card = def.root.children[0] as ContainerNode
    expect(card.key).toBe('k-card')
    expect(card.meta?.rawSchema).toEqual({ $cmp: 'card' })
    const [field, fallback] = card.children as [FieldNode, FieldNode]
    expect(field.key).toBe('k-field')
    expect(fallback.key).toBe('k-fallback')
    expect(fallback.meta?.rawSchema).toEqual({ $cmp: 'unknownWidget', someProp: 1 })
  })

  it('返回值与原对象不共享引用（深拷贝）', () => {
    const def = buildDefinition()
    const portable = toPortableDefinition(def)

    expect(portable).not.toBe(def)
    expect(portable.root).not.toBe(def.root)
    expect(portable.root.children).not.toBe(def.root.children)
    expect(portable.settings).not.toBe(def.settings)
  })
})
