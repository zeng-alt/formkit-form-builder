// ═══ 布局节点 ↔ FormKit schema ══════════════════════════════════════════════════
// toSchema（layoutNodeToSchema）：DSL LayoutNode → schema，card/tabs/steps 等有
// 容器规格的走 $cmp + keyProp + modelValue，grid/row/column 走 $el + class；
// fromSchema（layoutNodeFromSchema，含 inferLayoutType 类型推断）：反向解析。
// tabsPaneToSchema / tabsPaneFromSchema：tabs/steps 子 pane 的专用转换（无渲染
// 原语，只有 __key + __paneType 标记）。

import { generateKey } from '../../utils/dnd/schema'
import type { LayoutNode, LayoutType } from '../../types/dsl'
import { exprToJs } from '../compile'
import {
  type SchemaNode,
  type ChildrenConvertCtx,
  type RenderTarget,
  inferRenderTarget,
  parseOuterClass,
  nodeOuterClass,
  buildNodeHead,
} from './shared'
import { parseExprString } from './expr-parse'
import { CONTAINER_INTERNAL_PROPS } from './container'

export function layoutNodeToSchema(
  node: LayoutNode,
  children?: SchemaNode[],
  rt?: RenderTarget,
): SchemaNode {
  const ch = children ?? []
  const label = node.label
  const spec = rt?.container

  // 容器规格驱动：card/tabs/steps 等有规格的 cmp 布局 → $cmp:<type> + keyProp + modelValue。
  // objectOfObjects（tabs/steps）的每个子节点（pane）补齐 __key，并带 __paneType 标记，
  // 保证身份可辨、DSL 往返能还原为 tabsPane / stepsPane。
  if (spec) {
    const panes =
      spec.dataShape === 'objectOfObjects'
        ? ch.map((p) => ({
            ...p,
            __key: p?.__key ?? generateKey(),
            __paneType: node.type,
          }))
        : ch
    const schema: any = {
      $cmp: node.type,
      props: {
        [spec.keyProp]: node.key ?? node.id,
        name: node.name,
        modelValue: panes,
        ...node.props,
      },
    }
    if (label) schema.props = { ...schema.props, label }
    if (node.key) schema.__key = node.key
    if (node.visibleIf) schema.if = exprToJs(node.visibleIf)
    // 画布/面板读取顶层 name；组件经 props.name 接收
    if (typeof schema.props?.name === 'string') schema.name = schema.props.name
    schema.children = panes
    schema.outerClass = nodeOuterClass(node)
    return schema as SchemaNode
  }

  switch (node.type) {
    case 'grid': {
      const columns = Number(node.props?.columns) || 12
      const gap = Number(node.props?.gap) || 4
      const schema: any = { $el: 'div', attrs: { class: `grid grid-cols-${columns} gap-${gap}` } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf)
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'row': {
      const schema: any = { $el: 'div', attrs: { class: 'flex flex-row flex-wrap gap-2' } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf)
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'column': {
      const schema: any = { $el: 'div', attrs: { class: 'flex flex-col gap-2' } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf)
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    default: {
      const kind = rt?.renderAs ?? 'cmp'
      const schema: any = buildNodeHead(node, kind, rt?.target)
      if (kind === 'cmp') {
        schema.props = { ...schema.props, ...node.props, ...(label ? { label } : {}) }
      } else if (kind === 'el') {
        // attrs 由 props 映射
        if (node.props) schema.attrs = { ...schema.attrs, ...node.props }
      } else {
        if (label) schema.label = label
        if (node.props) Object.assign(schema, node.props)
      }
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
  }
}

export function layoutNodeFromSchema(s: SchemaNode, ctx: ChildrenConvertCtx): LayoutNode {
  const anyS: any = s
  const type = inferLayoutType(s)
  const childrenArr: SchemaNode[] = Array.isArray(anyS.children) ? anyS.children : []

  const node: any = {
    id:
      typeof anyS.id === 'string' && anyS.id
        ? anyS.id
        : typeof anyS.__key === 'string'
          ? anyS.__key
          : generateKey(),
    category: 'layout',
    type,
    renderAs: inferRenderTarget(s).renderAs,
    children: ctx.children ? ctx.children(childrenArr) : [],
  }
  const rt = inferRenderTarget(s)
  if (rt.target && rt.target !== type) node.target = rt.target
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
  else if (typeof anyS.props?.label === 'string' && anyS.props.label) node.label = anyS.props.label
  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)

  parseOuterClass(anyS.outerClass, node)

  // name 是数据字段名，提升到 DSL 顶层（与字段/容器一致）；props.name 仅是组件接收层
  const nodeName =
    typeof anyS.name === 'string' && anyS.name
      ? anyS.name
      : typeof anyS.props?.name === 'string'
        ? anyS.props.name
        : undefined
  if (typeof nodeName === 'string' && nodeName && nodeName !== node.id) node.name = nodeName

  const props: Record<string, unknown> = {}
  if (anyS.props && typeof anyS.props === 'object') {
    for (const [key, value] of Object.entries(anyS.props)) {
      if (CONTAINER_INTERNAL_PROPS.has(key) || key === 'name') continue
      if (value === undefined) continue
      props[key] = value
    }
  }
  if (typeof anyS.props?.title === 'string') {
    node.label = node.label ?? anyS.props.title
    delete props.title
  }
  if (rt.renderAs === 'el' && anyS.attrs && typeof anyS.attrs === 'object') {
    for (const [key, value] of Object.entries(anyS.attrs)) {
      if (key === 'class' || value === undefined) continue
      props[key] = value
    }
  }

  if (type === 'grid' && typeof anyS.attrs?.class === 'string') {
    const columns = anyS.attrs.class.match(/grid-cols-(\d+)/)
    const gap = anyS.attrs.class.match(/gap-(\d+)/)
    if (columns) props.columns = Number(columns[1])
    if (gap) props.gap = Number(gap[1])
  }

  if (Object.keys(props).length) node.props = props
  return node as LayoutNode
}

function inferLayoutType(s: SchemaNode): LayoutType {
  const anyS: any = s
  if (anyS.$cmp === 'card') return 'card'
  if (anyS.$cmp === 'tabs') return 'tabs'
  if (anyS.$cmp === 'steps') return 'steps'
  if (anyS.$el === 'div' && typeof anyS.attrs?.class === 'string') {
    const cls: string = anyS.attrs.class
    if (cls.includes('grid-cols')) return 'grid'
    if (cls.includes('flex-row')) return 'row'
    if (cls.includes('flex-col')) return 'column'
  }
  if (typeof anyS.__key === 'string' && !anyS.$formkit && !anyS.$cmp && !anyS.$el) return 'tabsPane'
  return (typeof anyS.$cmp === 'string' ? anyS.$cmp : 'card') as LayoutType
}

export function tabsPaneToSchema(node: LayoutNode, children?: SchemaNode[]): SchemaNode {
  // 携带 __paneType 标记：区分 tabs/steps 的子 pane，使 DSL 往返（schemaToDsl / reconcile）
  // 能还原为 tabsPane / stepsPane，而不被注册顺序较早的通用匹配误判。
  const schema: any = { __key: node.key ?? node.id, __paneType: node.type }
  if (node.label) schema.label = node.label
  if (node.name) schema.name = node.name
  const description = (node.props as Record<string, unknown> | undefined)?.description
  if (typeof description === 'string' && description) schema.description = description
  const ch = children ?? []
  if (ch.length) schema.children = ch
  schema.outerClass = nodeOuterClass(node)
  return schema as SchemaNode
}

export function tabsPaneFromSchema(s: SchemaNode, ctx: ChildrenConvertCtx): LayoutNode {
  const anyS: any = s
  const childrenArr: SchemaNode[] = Array.isArray(anyS.children) ? anyS.children : []
  const node: any = {
    id: typeof anyS.__key === 'string' && anyS.__key ? anyS.__key : generateKey(),
    category: 'layout',
    type: anyS.__paneType === 'steps' ? 'stepsPane' : 'tabsPane',
    renderAs: 'el',
    children: ctx.children ? ctx.children(childrenArr) : [],
  }
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof anyS.name === 'string' && anyS.name) node.name = anyS.name
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
  const description = anyS.description
  if (typeof description === 'string' && description) {
    node.props = { ...node.props, description }
  }
  parseOuterClass(anyS.outerClass, node)
  return node as LayoutNode
}
