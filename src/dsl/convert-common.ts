// ═══ 节点 ↔ FormKit schema 公共转换 ════════════════════════════════════════════
// 字段 / 容器 / 布局 / 静态节点的双向转换核心，注册表与 schema-adapter 共用。
// 每个节点显式携带 renderAs（formkit | cmp | el），toSchema 据此输出
// $formkit / $cmp / $el 节点；任何分类都能使用任意一种渲染原语。

import type { FormKitSchemaFormKit } from '@formkit/core'
import type {
  FieldNode,
  ContainerNode,
  LayoutNode,
  StaticNode,
  FormNode,
  Expr,
  NodeLayout,
  ValidationRule,
  EventBinding,
  LayoutType,
  RenderKind,
} from '../types/dsl'
import { generateKey } from '../utils/dnd/schema'
import { exprToJs, resolveValidation, resolveEvents } from './compile'
import { getContainerSpec, type ContainerSpec } from '../elements/container-spec'

export type SchemaNode = FormKitSchemaFormKit & Record<string, unknown>

export interface ChildrenConvertCtx {
  children?: (sc?: SchemaNode[]) => FormNode[]
}

// ─── 渲染原语描述 ───────────────────────────────────────────────────────────────

export interface RenderTarget {
  renderAs: RenderKind
  /** $cmp 组件名 / $el 标签名；formkit 时缺省回退节点 type */
  target?: string
  /** 容器数据结构规格（list/card/group/inputGroup/buttonGroup/tabs），驱动 keyProp 注入与 group/list 包裹 */
  container?: ContainerSpec
}

/** 从 schema 节点推断渲染原语 */
export function inferRenderTarget(s: SchemaNode): RenderTarget {
  const anyS: any = s
  if (typeof anyS.$cmp === 'string') return { renderAs: 'cmp', target: anyS.$cmp }
  if (typeof anyS.$el === 'string') return { renderAs: 'el', target: anyS.$el }
  return {
    renderAs: 'formkit',
    target: typeof anyS.$formkit === 'string' ? anyS.$formkit : undefined,
  }
}

/** schema 是否匹配某渲染原语（注册表 match 用） */
export function matchSchemaKind(s: SchemaNode, rt?: RenderTarget): boolean {
  const anyS: any = s
  const kind = rt?.renderAs ?? 'formkit'
  const target = rt?.target
  if (kind === 'cmp') return typeof anyS.$cmp === 'string' && anyS.$cmp === target
  if (kind === 'el') return typeof anyS.$el === 'string' && anyS.$el === target
  if (typeof anyS.$formkit !== 'string') return false
  return target == null || anyS.$formkit === target
}

// ─── 布局 ↔ outerClass ─────────────────────────────────────────────────────────

export function compileLayout(layout?: NodeLayout, fallback = 'col-span-12'): string {
  if (!layout) return fallback
  const parts: string[] = []
  if (layout.colspan != null && layout.colspan > 0) parts.push(`col-span-${layout.colspan}`)
  if (layout.rowspan != null && layout.rowspan > 1) parts.push(`row-span-${layout.rowspan}`)
  return parts.length ? parts.join(' ') : fallback
}

export function parseLayout(outerClass: unknown): NodeLayout | undefined {
  if (typeof outerClass !== 'string' || !outerClass.trim()) return undefined
  const layout: NodeLayout = {}
  const col = outerClass.match(/\bcol-span-(\d+)\b/)
  const row = outerClass.match(/\brow-span-(\d+)\b/)
  if (col) layout.colspan = Number(col[1])
  if (row) layout.rowspan = Number(row[1])
  if (!Object.keys(layout).length) return undefined
  // 默认 col-span-12 等价于无布局，保证往返恒等
  if (layout.colspan === 12 && layout.rowspan == null) return undefined
  return layout
}

/** 解析 outerClass：span 进 layout，附加类（pt-2 等）保留 raw 字符串 */
export function parseOuterClass(
  outerClass: unknown,
  node: { layout?: NodeLayout; outerClass?: string },
): void {
  const raw = typeof outerClass === 'string' ? outerClass.trim() : ''
  if (!raw) return
  const layout = parseLayout(raw)
  if (layout) node.layout = layout
  if (compileLayout(layout) !== raw) node.outerClass = raw
}

/** 回写 outerClass：优先用 raw 字符串，保证带附加类的节点往返无损 */
export function nodeOuterClass(node: { layout?: NodeLayout; outerClass?: string }): string {
  return node.outerClass?.trim() ? node.outerClass : compileLayout(node.layout)
}

// ─── 通用节点头（id/name/label/key/visibleIf/events）───────────────────────────

/** 按渲染原语放置单个键：cmp → props；el → attrs；formkit → 顶层 */
function putByKind(base: any, key: string, value: unknown, kind: RenderKind): void {
  if (kind === 'cmp') {
    if (!base.props) base.props = {}
    base.props[key] = value
  } else if (kind === 'el') {
    if (!base.attrs) base.attrs = {}
    base.attrs[key] = value
  } else {
    base[key] = value
  }
}

function applyByKind(base: any, values: Record<string, unknown>, kind: RenderKind): void {
  if (kind === 'cmp') {
    if (!base.props) base.props = {}
    Object.assign(base.props, values)
  } else if (kind === 'el') {
    if (!base.attrs) base.attrs = {}
    Object.assign(base.attrs, values)
  } else {
    Object.assign(base, values)
  }
}

function buildNodeHead(node: FormNode, kind: RenderKind, target?: string): any {
  const base: any =
    kind === 'cmp'
      ? { $cmp: target ?? node.type }
      : kind === 'el'
        ? { $el: target ?? node.type }
        : { $formkit: node.type }
  if (node.key) base.__key = node.key
  if (node.visibleIf) base.if = exprToJs(node.visibleIf, 'var')
  const events = resolveEvents(node.events)
  if (events && Object.keys(events).length) applyByKind(base, events, kind)
  if (node.label) putByKind(base, 'label', node.label, kind)
  if (node.id) putByKind(base, 'id', node.id, kind)
  return base
}

// ─── 字段节点 ──────────────────────────────────────────────────────────────────

const FIELD_KNOWN_KEYS = new Set([
  '$formkit',
  '$cmp',
  '$el',
  'name',
  'id',
  'label',
  'if',
  '__raw__ifExpression',
  'value',
  'expr',
  'validation',
  'validation-messages',
  'validationMessages',
  'options',
  'outerClass',
  'children',
  '__key',
  '__preview_placeholder',
  'bind',
  'props',
  'attrs',
])

// FormKit 语义键放顶层，其余组件配置放 props 嵌套（与 legacy 画布约定一致）
const FIELD_TOP_PROPS = new Set([
  'min',
  'max',
  'step',
  'multiple',
  'accept',
  'number',
  'validationVisibility',
  'placeholder',
  'help',
  'description',
  'options',
  'value',
  '__bind',
  'buttonText',
])

export function fieldNodeToSchema(node: FieldNode, _rt?: RenderTarget): SchemaNode {
  const kind = 'formkit'
  const base: any = buildNodeHead(node, kind, node.type)

  if (node.name) putByKind(base, 'name', node.name, kind)
  else if (node.id) putByKind(base, 'name', node.id, kind)

  if (node.value !== undefined) {
    putByKind(base, 'value', node.value, kind)
  }
  if (typeof node.expr === 'string' && node.expr.trim()) {
    putByKind(base, 'expr', node.expr, kind)
    // 带 expr 的字段不设初始 value，由运行时求值填充
    delete base.value
  }
  applyByKind(base, { ...resolveValidation(node.validation) }, kind)
  if (Array.isArray(node.options) ? node.options.length : node.options !== undefined)
    putByKind(base, 'options', node.options, kind)

  if (node.props) {
    const nested: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node.props)) {
      if (FIELD_TOP_PROPS.has(key)) base[key] = value
      else nested[key] = value
    }
    if (Object.keys(nested).length) base.props = nested
  }

  const outerClass = nodeOuterClass(node)
  base.outerClass = outerClass
  return base as SchemaNode
}

export function fieldNodeFromSchema(s: SchemaNode, fallbackType = 'text'): FieldNode {
  const anyS: any = s
  const rt = inferRenderTarget(s)
  const isCmp = rt.renderAs === 'cmp'
  const isEl = rt.renderAs === 'el'
  // $cmp 节点的 FormKit 语义键在 props 内；$formkit 节点在顶层；$el 节点在 attrs 内
  const P: any = isCmp
    ? anyS.props && typeof anyS.props === 'object'
      ? anyS.props
      : {}
    : isEl
      ? anyS.attrs && typeof anyS.attrs === 'object'
        ? anyS.attrs
        : {}
      : anyS
  const type =
    typeof anyS.$formkit === 'string'
      ? anyS.$formkit
      : typeof anyS.$cmp === 'string'
        ? fallbackType
        : typeof anyS.$el === 'string'
          ? (anyS.$el as string)
          : fallbackType
  const node: any = {
    id:
      typeof P.id === 'string' && P.id
        ? P.id
        : typeof anyS.__key === 'string'
          ? anyS.__key
          : generateKey(),
    category: 'field',
    type,
    renderAs: rt.renderAs,
  }
  if (rt.target && rt.target !== type) node.target = rt.target
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof P.name === 'string' && P.name && P.name !== node.id) node.name = P.name
  if (typeof P.label === 'string' && P.label) node.label = P.label

  if (typeof anyS.expr === 'string' && anyS.expr) {
    node.expr = anyS.expr
  } else if (typeof P.expr === 'string' && P.expr) {
    node.expr = P.expr
  }

  if (P.value !== undefined) {
    node.value = P.value
  } else if (anyS.value !== undefined) {
    node.value = anyS.value
  } else if (typeof anyS.expr === 'string' && anyS.expr) {
    // 纯表达式字段：value 由运行时设置，DSL 层不存
  } else if (typeof P.expr === 'string' && P.expr) {
    // 同上
  }

  const validation = parseValidation(P.validation, P['validation-messages'] ?? P.validationMessages)
  if (validation?.length) node.validation = validation
  if (Array.isArray(P.options)) node.options = P.options

  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)
  else if (typeof anyS.if === 'boolean') node.visibleIf = { type: 'literal', value: anyS.if }

  const events = parseEvents(P)
  if (events?.length) node.events = events

  parseOuterClass(anyS.outerClass, node)

  const props: Record<string, unknown> = {}
  const collect = (obj: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (FIELD_KNOWN_KEYS.has(key)) continue
      if (value === undefined) continue
      props[key] = value
    }
  }
  if (isCmp) {
    collect(anyS.props ?? {})
    // 顶层遗留未知键（__bind / placeholder 等）回流 props，与 legacy 行为一致
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'props' || key === '$cmp' || FIELD_KNOWN_KEYS.has(key)) continue
      if (value === undefined || props[key] !== undefined) continue
      props[key] = value
    }
  } else if (isEl) {
    collect(anyS.attrs ?? {})
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'attrs' || key === '$el' || FIELD_KNOWN_KEYS.has(key)) continue
      if (value === undefined) continue
      props[key] = value
    }
  } else {
    collect(anyS)
  }
  if (Object.keys(props).length) node.props = props

  return node as FieldNode
}

// ─── 容器节点 ──────────────────────────────────────────────────────────────────

const CONTAINER_INTERNAL_PROPS = new Set([
  'listKey',
  'cardKey',
  'inputGroupKey',
  'buttonGroupKey',
  'tabsKey',
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
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'var')
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
    if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'var')
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

// ─── 布局节点 ──────────────────────────────────────────────────────────────────

export function layoutNodeToSchema(
  node: LayoutNode,
  children?: SchemaNode[],
  rt?: RenderTarget,
): SchemaNode {
  const ch = children ?? []
  const label = node.label
  const spec = rt?.container

  // 容器规格驱动：card/tabs 等有规格的 cmp 布局 → $cmp:<type> + keyProp + modelValue。
  // objectOfObjects（tabs）的每个子节点（pane）补齐 __key，保证身份可辨。
  if (spec) {
    const panes =
      spec.dataShape === 'objectOfObjects'
        ? ch.map((p) => ({ ...(p as any), __key: (p as any)?.__key ?? generateKey() }))
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
    if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'var')
    // 画布/面板读取顶层 name；组件经 props.name 接收
    if (typeof schema.props?.name === 'string') schema.name = schema.props.name
    schema.children = panes
    schema.outerClass = nodeOuterClass(node)
    return schema as SchemaNode
  }

  switch (node.type) {
    case 'grid': {
      const columns = Number((node.props as any)?.columns) || 12
      const gap = Number((node.props as any)?.gap) || 4
      const schema: any = { $el: 'div', attrs: { class: `grid grid-cols-${columns} gap-${gap}` } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'var')
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'row': {
      const schema: any = { $el: 'div', attrs: { class: 'flex flex-row flex-wrap gap-2' } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'var')
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'column': {
      const schema: any = { $el: 'div', attrs: { class: 'flex flex-col gap-2' } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'var')
      if (ch.length) schema.children = ch
      schema.outerClass = compileLayout(node.layout)
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
  const schema: any = { __key: node.key ?? node.id }
  if (node.label) schema.label = node.label
  if (node.name) schema.name = node.name
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
    type: 'tabsPane',
    renderAs: 'el',
    children: ctx.children ? ctx.children(childrenArr) : [],
  }
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof anyS.name === 'string' && anyS.name) node.name = anyS.name
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
  parseOuterClass(anyS.outerClass, node)
  return node as LayoutNode
}

// ─── 静态节点 ──────────────────────────────────────────────────────────────────

// FormKit 语义键放顶层（$formkit 渲染），其余组件配置放 props / attrs 嵌套
const STATIC_TOP_PROPS = new Set([
  'options',
  'value',
  'min',
  'max',
  'step',
  'multiple',
  'accept',
  'placeholder',
  '__bind',
  'buttonText',
])

// $cmp 静态节点中已消费 / 结构键，props 合并时跳过，避免回流 node.props
const STATIC_CONSUMED_KEYS = new Set([
  '$formkit',
  '$el',
  '$cmp',
  'name',
  'id',
  'label',
  'type',
  'if',
  'children',
  'attrs',
  'outerClass',
  'props',
  '__key',
  '__preview_placeholder',
])

export function staticNodeToSchema(node: StaticNode, rt?: RenderTarget): SchemaNode {
  const anyProps = node.props && typeof node.props === 'object' ? node.props : {}
  const kind = rt?.renderAs ?? (node.type === 'submit' || node.type === 'reset' ? 'formkit' : 'el')
  const base: any = {}
  // $cmp 化：有 cmp 时输出 $cmp: '<组件名>'（渲染时经 schema library → FormKit input），否则回退 $formkit
  const keyOf = (fallback: string) =>
    kind === 'cmp'
      ? { $cmp: rt?.target ?? fallback }
      : kind === 'el'
        ? { $el: rt?.target ?? fallback }
        : { $formkit: fallback }

  switch (node.type) {
    case 'submit':
    case 'reset': {
      const native = node.type
      Object.assign(base, keyOf(native))
      const set = (key: string, value: unknown) => putByKind(base, key, value, kind)
      set('name', node.name ?? `${native}_button`)
      set('label', node.label ?? (native === 'submit' ? 'Submit' : 'Reset'))
      set('type', native)
      applyByKind(base, anyProps, kind)
      const outer = nodeOuterClass(node)
      base.outerClass =
        outer === 'col-span-12' && !node.outerClass && !node.layout ? 'col-span-12 pt-2' : outer
      break
    }
    case 'button': {
      base.$el = 'button'
      base.attrs = { type: anyProps.htmlType ?? 'button', ...(anyProps.attrs as object) }
      if (node.label) base.children = node.label
      break
    }
    case 'paragraph':
      base.$el = 'p'
      base.attrs = { class: 'text-sm text-muted-foreground' }
      base.children = node.text ?? node.label ?? ''
      break
    case 'heading':
      base.$el = 'h3'
      base.children = node.text ?? node.label ?? ''
      break
    case 'divider':
      base.$el = 'hr'
      break
    default: {
      // 有 cmp 时输出 $cmp 组件引用，否则按渲染原语输出
      Object.assign(base, keyOf(node.type))
      const set = (key: string, value: unknown) => putByKind(base, key, value, kind)
      if (node.name) set('name', node.name)
      if (node.id) set('id', node.id)
      if (node.label) set('label', node.label)
      for (const [key, value] of Object.entries(anyProps)) {
        if (kind === 'formkit' && STATIC_TOP_PROPS.has(key)) base[key] = value
        else putByKind(base, key, value, kind)
      }
      base.outerClass = nodeOuterClass(node)
    }
  }

  if (node.key) base.__key = node.key
  if (node.visibleIf) base.if = exprToJs(node.visibleIf, 'var')
  const events = resolveEvents(node.events)
  if (events && Object.keys(events).length) applyByKind(base, events, kind)
  if (kind === 'cmp') {
    if (Object.keys(base.props ?? {}).length === 0) delete base.props
    if (typeof base.outerClass === 'string' && base.outerClass)
      base.props = { ...base.props, outerClass: base.outerClass }
    // 画布读取顶层 name（key 兜底 / 唯一命名）；组件经 props.name 接收
    if (typeof base.props?.name === 'string') base.name = base.props.name
  }
  return base as SchemaNode
}

export function staticNodeFromSchema(s: SchemaNode, hintType?: string): StaticNode {
  const anyS: any = s
  const rt = inferRenderTarget(s)
  const isCmp = rt.renderAs === 'cmp'
  const isEl = rt.renderAs === 'el'
  // $cmp 节点的语义键在 props 内；$formkit / $el 节点在顶层
  const P: any = isCmp
    ? anyS.props && typeof anyS.props === 'object'
      ? anyS.props
      : {}
    : isEl
      ? anyS.attrs && typeof anyS.attrs === 'object'
        ? anyS.attrs
        : {}
      : anyS
  const isSubmit = anyS.$formkit === 'submit'
  const type = isSubmit
    ? 'submit'
    : typeof anyS.$formkit === 'string'
      ? anyS.$formkit
      : typeof anyS.$el === 'string'
        ? mapElToStaticType(anyS.$el)
        : (hintType ?? 'html')
  const node: any = {
    id:
      typeof P.id === 'string' && P.id
        ? P.id
        : typeof anyS.__key === 'string'
          ? anyS.__key
          : generateKey(),
    category: 'static',
    type,
    renderAs: rt.renderAs,
  }
  if (rt.target && rt.target !== type) node.target = rt.target
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof P.name === 'string' && P.name && P.name !== node.id) node.name = P.name
  if (typeof P.label === 'string' && P.label) node.label = P.label

  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)
  else if (typeof anyS.if === 'boolean') node.visibleIf = { type: 'literal', value: anyS.if }

  if (node.type === 'paragraph' || node.type === 'heading') {
    if (typeof anyS.children === 'string') node.text = anyS.children
    else if (typeof anyS.children === 'number') node.text = String(anyS.children)
  }

  const events = parseEvents(P)
  if (events?.length) node.events = events

  parseOuterClass(anyS.outerClass, node)

  const props: Record<string, unknown> = {}
  const collect = (obj: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (STATIC_CONSUMED_KEYS.has(key) || /^on[A-Z]/.test(key)) continue
      if (value === undefined) continue
      props[key] = value
    }
  }
  if (isCmp) {
    for (const [key, value] of Object.entries(anyS.props ?? {})) {
      // $cmp 组件的 type 是普通配置键（submit/reset 的 type 标记只在 $formkit 顶层）
      if (key === 'type') {
        props.type = value
        continue
      }
      if (STATIC_CONSUMED_KEYS.has(key) || /^on[A-Z]/.test(key)) continue
      if (value === undefined) continue
      props[key] = value
    }
    // 顶层遗留未知键回流 props，与 legacy 行为一致
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'props' || key === '$cmp' || STATIC_CONSUMED_KEYS.has(key)) continue
      if (value === undefined || props[key] !== undefined) continue
      props[key] = value
    }
  } else if (isEl) {
    collect(anyS.attrs ?? {})
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'attrs' || key === '$el' || STATIC_CONSUMED_KEYS.has(key)) continue
      if (value === undefined) continue
      props[key] = value
    }
  } else {
    collect(anyS)
  }
  if (node.type === 'button' && anyS.attrs) props.attrs = anyS.attrs
  if (Object.keys(props).length) node.props = props

  return node as StaticNode
}

function mapElToStaticType(tag: string): string {
  if (tag === 'button') return 'button'
  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6')
    return 'heading'
  if (tag === 'hr') return 'divider'
  if (tag === 'p' || tag === 'span' || tag === 'div') return 'paragraph'
  return 'html'
}

// ─── 分类级派发（注册表统一入口）───────────────────────────────────────────────

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
      throw new Error(`[convert-common] 未知分类: ${category}`)
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
      throw new Error(`[convert-common] 未知分类: ${category}`)
  }
}

// ─── 校验 ↔ schema ─────────────────────────────────────────────────────────────

export function parseValidation(
  validation: unknown,
  messages?: unknown,
): ValidationRule[] | undefined {
  if (typeof validation !== 'string' || !validation.trim()) return undefined
  const msgMap: Record<string, string> =
    messages && typeof messages === 'object' ? (messages as Record<string, string>) : {}
  return validation.split('|').map((seg) => {
    let rest = seg.trim()
    const rule: ValidationRule = { rule: '' }
    const debounceMatch = rest.match(/^\((\d+)\)/)
    if (debounceMatch) {
      rule.debounce = Number(debounceMatch[1])
      rest = rest.slice(debounceMatch[0].length)
    }
    if (rest.startsWith('+')) {
      rule.empty = true
      rest = rest.slice(1)
    }
    if (rest.startsWith('*')) {
      rule.force = true
      rest = rest.slice(1)
    }
    if (rest.startsWith('?')) {
      rule.optional = true
      rest = rest.slice(1)
    }
    const [ruleName, argStr] = rest.split(':')
    rule.rule = ruleName ?? ''
    if (argStr) {
      rule.args = argStr.split(',').map((a) => {
        const t = a.trim()
        if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
        if (t === 'true') return true
        if (t === 'false') return false
        return t
      })
    }
    if (msgMap[rule.rule]) rule.message = msgMap[rule.rule]
    return rule
  })
}

// ─── 事件 ↔ schema ─────────────────────────────────────────────────────────────

export function parseEvents(s: Record<string, unknown>): EventBinding[] | undefined {
  const out: EventBinding[] = []
  for (const [key, value] of Object.entries(s)) {
    if (!/^on[A-Z]/.test(key)) continue
    if (typeof value !== 'string') continue
    const event = key.charAt(2).toLowerCase() + key.slice(3)
    let handler = value
    const wrapper = handler.match(/^\(\$event\)\s*=>\s*\{\s*([\s\S]*?)\s*\}$/)
    if (wrapper && wrapper[1] !== undefined) handler = wrapper[1]
    out.push({ event: event as EventBinding['event'], handler })
  }
  return out.length ? out : undefined
}

// ─── 旧表达式字符串 → AST（best-effort，失败则 __raw__ 无损兜底）───────────────

export function parseExprString(input: string): Expr {
  const raw = (str: string): Expr => ({
    type: 'call',
    fn: '__raw__',
    args: [{ type: 'literal', value: str }],
  })
  if (typeof input !== 'string') return raw(String(input))
  const src = input.trim()
  if (!src) return raw('')

  let pos = 0
  const n = src.length
  const eof = () => pos >= n
  const peek = () => src[pos]
  const skip = () => {
    while (!eof() && /\s/.test(peek()!)) pos++
  }
  const consume = (ch: string): boolean => {
    if (src[pos] === ch) {
      pos++
      return true
    }
    return false
  }
  const ident = (word: string): boolean => {
    skip()
    if (src.slice(pos, pos + word.length) !== word) return false
    const after = src[pos + word.length]
    if (after !== undefined && /[a-zA-Z0-9_]/.test(after)) return false
    pos += word.length
    return true
  }
  const literal = (value: unknown): Expr => ({ type: 'literal', value })
  const call = (fn: string, args: Expr[]): Expr => ({ type: 'call', fn, args })

  const parseConditional = (): Expr => {
    const test = parseOr()
    skip()
    if (peek() === '?') {
      pos++
      skip()
      const consequent = parseOr()
      skip()
      if (!consume(':')) throw new Error('parse error')
      skip()
      const alternate = parseOr()
      return call('if', [test, consequent, alternate])
    }
    return test
  }

  const parseOr = (): Expr => {
    let left = parseAnd()
    for (;;) {
      skip()
      if (src.slice(pos, pos + 2) === '||') {
        pos += 2
        left = call('or', [left, parseAnd()])
      } else break
    }
    return left
  }
  const parseAnd = (): Expr => {
    let left = parseEq()
    for (;;) {
      skip()
      if (src.slice(pos, pos + 2) === '&&') {
        pos += 2
        left = call('and', [left, parseEq()])
      } else break
    }
    return left
  }
  const parseEq = (): Expr => {
    let left = parseRel()
    for (;;) {
      skip()
      const three = src.slice(pos, pos + 3)
      const two = src.slice(pos, pos + 2)
      if (three === '===') {
        pos += 3
        left = call('eq', [left, parseRel()])
      } else if (three === '!==') {
        pos += 3
        left = call('neq', [left, parseRel()])
      } else if (two === '==') {
        pos += 2
        left = call('eq', [left, parseRel()])
      } else if (two === '!=') {
        pos += 2
        left = call('neq', [left, parseRel()])
      } else break
    }
    return left
  }
  const parseRel = (): Expr => {
    let left = parseAdd()
    for (;;) {
      skip()
      const two = src.slice(pos, pos + 2)
      const ch = peek()
      if (two === '>=') {
        pos += 2
        left = call('gte', [left, parseAdd()])
      } else if (two === '<=') {
        pos += 2
        left = call('lte', [left, parseAdd()])
      } else if (ch === '>') {
        pos++
        left = call('gt', [left, parseAdd()])
      } else if (ch === '<') {
        pos++
        left = call('lt', [left, parseAdd()])
      } else break
    }
    return left
  }
  const parseAdd = (): Expr => {
    let left = parseMul()
    for (;;) {
      skip()
      const ch = peek()
      if (ch === '+') {
        pos++
        left = call('add', [left, parseMul()])
      } else if (ch === '-') {
        pos++
        left = call('sub', [left, parseMul()])
      } else break
    }
    return left
  }
  const parseMul = (): Expr => {
    let left = parseUnary()
    for (;;) {
      skip()
      const ch = peek()
      if (ch === '*') {
        pos++
        left = call('mul', [left, parseUnary()])
      } else if (ch === '/') {
        pos++
        left = call('div', [left, parseUnary()])
      } else break
    }
    return left
  }
  const parseUnary = (): Expr => {
    skip()
    const ch = peek()
    if (ch === '!') {
      pos++
      return call('not', [parseUnary()])
    }
    if (ch === '-') {
      pos++
      return call('sub', [literal(0), parseUnary()])
    }
    return parsePrimary()
  }
  const parseStringWrapper = (): Expr | null => {
    if (!ident('String') || peek() !== '(') return null
    pos++
    skip()
    const inner = parseOr()
    skip()
    if (!consume(')')) throw new Error('parse error')
    skip()
    if (peek() === '.') {
      pos++
      skip()
      const member = src.slice(pos).match(/^[a-zA-Z]+/)
      if (member) {
        pos += member[0].length
        if (member[0] === 'includes' && peek() === '(') {
          pos++
          skip()
          const arg = parseOr()
          skip()
          if (!consume(')')) throw new Error('parse error')
          return call('contains', [inner, arg])
        }
        if (member[0] === 'toLowerCase') {
          if (!consume('(') || !consume(')')) throw new Error('parse error')
          return call('lower', [inner])
        }
        if (member[0] === 'toUpperCase') {
          if (!consume('(') || !consume(')')) throw new Error('parse error')
          return call('upper', [inner])
        }
        if (member[0] === 'trim') {
          if (!consume('(') || !consume(')')) throw new Error('parse error')
          return call('trim', [inner])
        }
      }
    }
    return inner
  }
  const parsePrimary = (): Expr => {
    skip()
    const ch = peek()

    if (ch === '"' || ch === "'") {
      const quote = ch
      pos++
      let out = ''
      for (;;) {
        if (eof()) throw new Error('parse error')
        const c = peek()
        if (c === '\\') {
          pos++
          if (eof()) throw new Error('parse error')
          out += peek()
          pos++
          continue
        }
        if (c === quote) break
        out += c
        pos++
      }
      if (!consume(quote)) throw new Error('parse error')
      return literal(out)
    }

    if (ch === '$') {
      pos++
      const start = pos
      while (!eof() && /[a-zA-Z0-9_]/.test(peek()!)) pos++
      let field = src.slice(start, pos)
      // $xxx() / $xxx($1) — 空参或模板占位符，将 () 吃掉，让 $get()
      // 变成普通字段引用而非 __raw__('$get()')，避免 FormKit 报
      // "must use the id of an input to access" 警告
      const rest = src.slice(pos)
      const emptyParens = /^\(\)/.exec(rest)
      const templateParens = /^\(\$1\)/.exec(rest)
      if (emptyParens || templateParens) {
        pos += emptyParens ? 2 : 4
        return { type: 'field', name: field }
      }
      // 去掉上下文前缀：$formData.userType / $var.userType → field 'userType'
      if (peek() === '.') {
        pos++
        const segStart = pos
        while (!eof() && /[a-zA-Z0-9_.]/.test(peek()!)) pos++
        const rest = src.slice(segStart, pos)
        if (rest) field = rest
      }
      return { type: 'field', name: field }
    }

    if (ch === '(') {
      pos++
      skip()
      const inner = parseOr()
      skip()
      if (!consume(')')) throw new Error('parse error')
      return inner
    }

    if (ch !== undefined && /[0-9.]/.test(ch)) {
      const numberMatch = src.slice(pos).match(/^\d+(\.\d+)?/)
      if (numberMatch) {
        pos += numberMatch[0].length
        return literal(Number(numberMatch[0]))
      }
    }

    if (ident('true')) return literal(true)
    if (ident('false')) return literal(false)
    if (ident('null')) return literal(null)

    const wrapped = parseStringWrapper()
    if (wrapped) return wrapped

    throw new Error('parse error')
  }

  try {
    skip()
    const result = parseConditional()
    skip()
    if (!eof()) return raw(input)
    return result
  } catch {
    return raw(input)
  }
}
