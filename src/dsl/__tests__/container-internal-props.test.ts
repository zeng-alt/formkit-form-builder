// ═══ 容器画布身份键不进入 DSL ═══════════════════════════════════════════════════
// 画布为容器生成的 xxxKey（dataTableKey / groupKey 等）只是 DnD 定位用的内部键，
// schema → DSL 时必须剥离，不能当成普通属性存进表单定义。
import { describe, expect, it } from 'vitest'
import { dslToSchema, getElementTypeDef, schemaNodeToDslNode, DSL_VERSION } from '@/dsl'
import type { FormDefinition, LayoutNode } from '@/types/dsl'
import type { SchemaNode } from '@/utils/schema/types'

function definitionWith(type: string): FormDefinition {
  const node = getElementTypeDef(type)!.defaults() as LayoutNode
  node.id = 'c1'
  node.key = 'c1'
  node.name = 'c_a'
  return {
    version: DSL_VERSION,
    id: 'internal-props',
    name: 'internal-props',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [node],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

// container-spec.ts 里各容器的 keyProp（rowKey 等普通属性不在此列）
const INTERNAL_KEYS = [
  'listKey',
  'cardKey',
  'groupKey',
  'inputGroupKey',
  'buttonGroupKey',
  'badgeKey',
  'tabsKey',
  'stepsKey',
  'dataTableKey',
]

describe('容器内部键剥离', () => {
  it.each(['dataTable', 'card', 'list'])('%s 往返转换后 props 不含画布身份键', (type) => {
    // dslToSchema 的第一层是 form 外壳，容器节点在其 children 里
    const [form] = dslToSchema(definitionWith(type))
    const schemaNode = (form!.children as SchemaNode[])[0]!
    expect(schemaNode.props).toBeTruthy()
    const back = schemaNodeToDslNode(schemaNode) as LayoutNode
    expect(back.type).toBe(type)
    const keys = Object.keys((back.props ?? {}) as Record<string, unknown>)
    expect(keys.filter((k) => INTERNAL_KEYS.includes(k))).toEqual([])
  })
})
