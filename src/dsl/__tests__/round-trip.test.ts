// ═══ DSL ⇄ schema 往返测试 ═════════════════════════════════════════════════════
// 1. 对每个内置元素类型（palette 目录派生，带 template）做 schema 级幂等校验：
//    dslToSchema(schemaToDsl(dslToSchema(def))) 应与 dslToSchema(def) 结构相同。
// 2. 手写嵌套 fixture（group + list + static），校验 schemaToDsl(dslToSchema(def))
//    的关键字段（name/label/type/category/renderAs/validation/events/outerClass/
//    props/value/visibleIf）与原始 DSL 一致。

import { describe, it, expect } from 'vitest'
import { dslToSchema, schemaToDsl, getElementTypeDefs, DSL_VERSION } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition, FormNode, StaticNode } from '@/types/dsl'

function buildFormDef(children: FormNode[]): FormDefinition {
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
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

// 幂等比较时抹掉的不稳定字段：
// - id / __key：DSL 内部生成的稳定标识。容器/布局的"规格驱动"分支
//   （containerNodeToSchema/layoutNodeToSchema 的 spec 分支，如 list/card/tabs/
//   inputGroup/buttonGroup/badge/dataTable）不经过 buildNodeHead，从不把 id 写进
//   schema，只靠 keyProp 兜底 node.key ?? node.id；测试节点未显式设置 key 时，
//   schemaToDsl 会为其重新生成一个随机 id，round-trip 后 keyProp 的值必然随之变化——
//   这是"容器身份用 key、id 只是内部占位"的既有设计，不是数据丢失。
// - 形如 xxxKey 的容器画布身份键（listKey/cardKey/groupKey/tabsKey/stepsKey/
//   inputGroupKey/buttonGroupKey/badgeKey/dataTableKey）：同上，随 id 联动，不稳定。
function stripUnstable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUnstable)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'id' || k === '__key' || k.endsWith('Key')) continue
      out[k] = stripUnstable(v)
    }
    return out
  }
  return value
}

const defsWithTemplate = getElementTypeDefs().filter((d) => d.template)

describe('DSL ⇄ schema 往返（内置元素类型逐个校验）', () => {
  it.each(defsWithTemplate.map((d) => [d.type, d] as const))('schema 幂等：%s', (_type, def) => {
    const node = def.defaults()
    node.name = `f_${def.type}`
    node.label = 'Label'
    const formDef = buildFormDef([node])

    const schema1 = dslToSchema(formDef)
    const dsl2 = schemaToDsl(schema1)
    const schema2 = dslToSchema(dsl2)

    expect(stripUnstable(schema2)).toEqual(stripUnstable(schema1))
  })
})

describe('DSL ⇄ schema 往返（手写嵌套 fixture）', () => {
  const textField: FieldNode = {
    id: 'n-text',
    category: 'field',
    type: 'text',
    renderAs: 'cmp',
    name: 'textField',
    label: 'Text Field',
    validation: [{ rule: 'required' }, { rule: 'length', args: [2, 10], message: 'x' }],
    visibleIf: {
      type: 'call',
      fn: 'eq',
      args: [
        { type: 'field', name: 'flag' },
        { type: 'literal', value: true },
      ],
    },
    events: [{ event: 'change', handler: 'console.log(1)' }],
    outerClass: 'col-span-6',
    props: { placeholder: 'p' },
  }

  const numberField: FieldNode = {
    id: 'n-number',
    category: 'field',
    type: 'number',
    renderAs: 'cmp',
    name: 'numberField',
    value: 3,
  }

  const groupNode: ContainerNode = {
    id: 'n-group',
    category: 'container',
    type: 'group',
    renderAs: 'formkit',
    dataType: 'object',
    name: 'groupNode',
    children: [textField],
  }

  const listNode: ContainerNode = {
    id: 'n-list',
    category: 'container',
    type: 'list',
    renderAs: 'cmp',
    dataType: 'array',
    name: 'listNode',
    children: [numberField],
  }

  const headingNode: StaticNode = {
    id: 'n-heading',
    category: 'static',
    type: 'naiveH1',
    renderAs: 'cmp',
    label: 'Heading',
  }

  const STABLE_FIELDS = [
    'name',
    'label',
    'type',
    'category',
    'renderAs',
    'validation',
    'events',
    'outerClass',
    'props',
    'value',
    'visibleIf',
  ] as const

  function pickStable(node: FormNode): unknown {
    const out: Record<string, unknown> = {}
    for (const key of STABLE_FIELDS) {
      const value = (node as unknown as Record<string, unknown>)[key]
      if (value !== undefined) out[key] = value
    }
    const children = (node as unknown as { children?: FormNode[] }).children
    if (Array.isArray(children)) out.children = children.map(pickStable)
    return out
  }

  it('往返后关键字段与原始 DSL 一致', () => {
    const original = [groupNode, listNode, headingNode]
    const formDef = buildFormDef(original)

    const schema = dslToSchema(formDef)
    const dsl2 = schemaToDsl(schema)

    expect(dsl2.root.children.map(pickStable)).toEqual(original.map(pickStable))
  })
})
