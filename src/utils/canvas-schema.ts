import type { FormKitSchemaFormKit } from '@formkit/core'
import { schemaChildren, type SchemaNode } from './schema/types'

export function toCanvasSchemaNode(node: FormKitSchemaFormKit): FormKitSchemaFormKit {
  if (!node || typeof node !== 'object') return node
  const next: SchemaNode = { ...node }
  if ('if' in next) delete next.if
  if ('__raw__ifExpression' in next) delete next.__raw__ifExpression
  if ('bind' in next && typeof next.bind !== 'string') {
    if (!next.__bind) next.__bind = next.bind
    delete next.bind
  }
  // $cmp 组件把顶层 __key 一并收进 props，供组件内联编辑写回时定位节点
  if (typeof next.$cmp === 'string' && typeof next.__key === 'string') {
    next.props = { ...next.props, __key: next.__key }
  }
  if (Array.isArray(next.children)) {
    next.children = schemaChildren(next).map((c) => toCanvasSchemaNode(c))
  }
  return next
}
