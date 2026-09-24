// ═══ A3：折叠面板容器（collapse）DSL 往返 ═══════════════════════════════════════
// 照 container-internal-props.test.ts 的写法：collapseKey 是画布内部身份键，
// 不应该出现在往返后的 props 里；title/defaultExpanded/disableCollapse/bordered
// 等真正的属性要原样保留，children 也要保留。
import { describe, expect, it } from 'vitest'
import { dslToSchema, getElementTypeDef, schemaNodeToDslNode, DSL_VERSION } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition } from '@/types/dsl'
import type { SchemaNode } from '@/utils/schema/types'

function buildDefinition(): FormDefinition {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = 'f1'
  field.key = 'f1'
  field.name = 'inner_text'
  field.label = '内部字段'

  const node = getElementTypeDef('collapse')!.defaults() as ContainerNode
  node.id = 'c1'
  node.key = 'c1'
  node.name = 'panel_a'
  node.label = '基本信息'
  node.props = { ...node.props, defaultExpanded: false, disableCollapse: true, bordered: false }
  node.children = [field]

  return {
    version: DSL_VERSION,
    id: 'collapse-round-trip',
    name: 'collapse-round-trip',
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

describe('collapse 容器：DSL 往返', () => {
  it('元素定义：category 是 container，dataShape 是 object，keyProp 是 collapseKey', () => {
    const def = getElementTypeDef('collapse')!
    expect(def.category).toBe('container')
    expect(def.container?.dataShape).toBe('object')
    expect(def.container?.keyProp).toBe('collapseKey')
  })

  it('往返后 props 不含 collapseKey，属性与子节点原样保留', () => {
    const [form] = dslToSchema(buildDefinition())
    const schemaNode = (form!.children as SchemaNode[])[0]!
    expect(schemaNode.props).toBeTruthy()

    const back = schemaNodeToDslNode(schemaNode) as ContainerNode
    expect(back.type).toBe('collapse')
    expect(back.category).toBe('container')
    expect(back.label).toBe('基本信息')
    expect(back.props?.collapseKey).toBeUndefined()
    expect(back.props?.defaultExpanded).toBe(false)
    expect(back.props?.disableCollapse).toBe(true)
    expect(back.props?.bordered).toBe(false)

    expect(back.children).toHaveLength(1)
    expect((back.children[0] as FieldNode).name).toBe('inner_text')
  })

  it('新建节点默认值：defaultExpanded true / disableCollapse false / bordered true', () => {
    const node = getElementTypeDef('collapse')!.defaults() as ContainerNode
    expect(node.dataType).toBe('object')
    expect(node.props?.defaultExpanded).toBe(true)
    expect(node.props?.disableCollapse).toBe(false)
    expect(node.props?.bordered).toBe(true)
    expect(node.children).toEqual([])
  })
})
