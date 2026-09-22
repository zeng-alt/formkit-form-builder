// ═══ 容器节点 ↔ FormKit schema ══════════════════════════════════════════════════
// toSchema（containerNodeToSchema）：DSL ContainerNode → schema，按容器规格
// （group 原语 / list·inputGroup·buttonGroup 等 cmp 原语）选择包裹方式；
// fromSchema（containerNodeFromSchema）：反向解析，dataType 由容器规格的数据
// 结构映射（object/array）。CONTAINER_INTERNAL_PROPS 供 layout.ts 复用，故导出。

import { generateKey } from '../../utils/dnd/schema'
import type { ContainerNode } from '../../types/dsl'
import { exprToJs } from '../compile'
import { getContainerSpec } from '../../elements/container-spec'
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

// container.ts / layout.ts 共用：schema 容器内部占位键，fromSchema 收集 rest props 时跳过
export const CONTAINER_INTERNAL_PROPS = new Set([
  'listKey',
  'cardKey',
  'inputGroupKey',
  'buttonGroupKey',
  'badgeKey',
  'tabsKey',
  'stepsKey',
  'modelValue',
  'label',
  'title',
])

export function containerNodeToSchema(
  node: ContainerNode,
  children?: SchemaNode[],
  rt?: RenderTarget,
): SchemaNode {
  const ch = children ?? []
  const label = node.label
  const spec = rt?.container

  // 容器规格驱动：group（primitive:'group'）→ 原生 $formkit:group；
  // list/inputGroup/buttonGroup（primitive:'cmp'）→ $cmp:<type> + keyProp + modelValue
  if (spec) {
    if (spec.primitive === 'group') {
      const schema: any = { $formkit: 'group', name: node.name ?? node.id }
      if (node.id) schema.id = node.id
      if (node.key) schema.__key = node.key
      if (label) schema.label = label
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf)
      if (node.props) Object.assign(schema, node.props)
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    const containerProps: Record<string, unknown> = {
      [spec.keyProp]: node.key ?? node.id,
      name: node.name ?? node.id,
      modelValue: ch,
      ...node.props,
    }
    if (label) containerProps.label = label
    const schema: any = { $cmp: node.type, props: containerProps }
    if (node.key) schema.__key = node.key
    if (node.visibleIf) schema.if = exprToJs(node.visibleIf)
    // 画布/面板读取顶层 name（key 兜底 / 唯一命名）；组件经 props.name 接收
    if (typeof schema.props?.name === 'string') schema.name = schema.props.name
    schema.children = ch
    schema.outerClass = nodeOuterClass(node)
    return schema as SchemaNode
  }

  // 未知/扩展容器类型：按渲染原语输出（默认 $cmp 透传）
  const kind = rt?.renderAs ?? 'cmp'
  const schema: any = buildNodeHead(node, kind, rt?.target)
  if (kind === 'cmp') {
    schema.props = { ...schema.props, ...node.props, label }
    if (ch.length) schema.children = ch
  } else if (kind === 'el') {
    if (ch.length) schema.children = ch
  } else {
    if (label) schema.label = label
    if (node.props) Object.assign(schema, node.props)
    if (ch.length) schema.children = ch
  }
  schema.outerClass = nodeOuterClass(node)
  return schema as SchemaNode
}

export function containerNodeFromSchema(s: SchemaNode, ctx: ChildrenConvertCtx): ContainerNode {
  const anyS: any = s
  const type =
    typeof anyS.$formkit === 'string'
      ? anyS.$formkit
      : typeof anyS.$cmp === 'string'
        ? anyS.$cmp
        : typeof anyS.$el === 'string'
          ? (anyS.$el as string)
          : 'group'
  const props = anyS.props && typeof anyS.props === 'object' ? { ...anyS.props } : {}
  const nodeName =
    typeof anyS.name === 'string' && anyS.name
      ? anyS.name
      : typeof props.name === 'string'
        ? props.name
        : undefined
  delete props.name
  const childrenArr: SchemaNode[] = Array.isArray(anyS.children)
    ? anyS.children
    : Array.isArray(props.modelValue)
      ? props.modelValue
      : []

  // dataType 由容器规格的数据结构映射（object → 'object'，其余 → 'array'）
  const spec = getContainerSpec(type)

  const node: any = {
    id:
      typeof anyS.id === 'string' && anyS.id
        ? anyS.id
        : typeof props.id === 'string' && props.id
          ? props.id
          : typeof anyS.__key === 'string'
            ? anyS.__key
            : generateKey(),
    category: 'container',
    type,
    renderAs: inferRenderTarget(s).renderAs,
    dataType:
      spec != null
        ? spec.dataShape === 'object'
          ? 'object'
          : 'array'
        : type === 'group'
          ? 'object'
          : 'array',
    children: ctx.children ? ctx.children(childrenArr) : [],
  }
  const rt = inferRenderTarget(s)
  if (rt.target && rt.target !== type) node.target = rt.target
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof nodeName === 'string' && nodeName && nodeName !== node.id) node.name = nodeName
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
  else if (typeof props.label === 'string' && props.label) node.label = props.label
  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)

  parseOuterClass(anyS.outerClass, node)

  const restProps: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (CONTAINER_INTERNAL_PROPS.has(key)) continue
    if (value === undefined) continue
    restProps[key] = value
  }
  for (const [key, value] of Object.entries(anyS)) {
    if (
      [
        '$formkit',
        '$cmp',
        '$el',
        'name',
        'label',
        'if',
        'children',
        'outerClass',
        'props',
        'attrs',
        '__key',
        '__preview_placeholder',
        'id',
      ].includes(key)
    )
      continue
    if (restProps[key] !== undefined) continue
    if (value === undefined) continue
    restProps[key] = value
  }
  if (Object.keys(restProps).length) node.props = restProps

  return node as ContainerNode
}
