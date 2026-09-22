// ═══ 分类级派发（注册表统一入口）════════════════════════════════════════════════
// 按节点分类（field/container/layout/static）把 toSchema / fromSchema 调用路由到
// 对应模块，供 dsl/registry.ts 统一入口使用。

import type { FieldNode, ContainerNode, LayoutNode, StaticNode, FormNode } from '../../types/dsl'
import { type SchemaNode, type RenderTarget, type ChildrenConvertCtx } from './shared'
import { fieldNodeToSchema, fieldNodeFromSchema } from './field'
import { containerNodeToSchema, containerNodeFromSchema } from './container'
import { layoutNodeToSchema, layoutNodeFromSchema } from './layout'
import { staticNodeToSchema, staticNodeFromSchema } from './static'

export function nodeToSchemaByCategory(
  node: FormNode,
  category: string,
  rt?: RenderTarget,
  ctx?: { children?: SchemaNode[] },
): SchemaNode {
  switch (category) {
    case 'field':
      return fieldNodeToSchema(node as FieldNode, rt)
    case 'container':
      return containerNodeToSchema(node as ContainerNode, ctx?.children, rt)
    case 'layout':
      return layoutNodeToSchema(node as LayoutNode, ctx?.children, rt)
    case 'static':
      return staticNodeToSchema(node as StaticNode, rt)
    default:
      throw new Error(`[dsl/convert] 未知分类: ${category}`)
  }
}

export function nodeFromSchemaByCategory(
  s: SchemaNode,
  category: string,
  ctx?: ChildrenConvertCtx,
  hintType?: string,
): FormNode {
  switch (category) {
    case 'field':
      return fieldNodeFromSchema(s, hintType)
    case 'container':
      return containerNodeFromSchema(s, ctx ?? {})
    case 'layout':
      return layoutNodeFromSchema(s, ctx ?? {})
    case 'static':
      return staticNodeFromSchema(s, hintType)
    default:
      throw new Error(`[dsl/convert] 未知分类: ${category}`)
  }
}
