// ═══ 节点 ↔ FormKit schema 公共转换 ════════════════════════════════════════════
// 字段 / 容器 / 布局 / 静态节点的双向转换核心，注册表与 schema-adapter 共用。

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
} from '../types/dsl'
import { generateKey } from '../utils/dnd/schema'
import { exprToJs, resolveValidation, resolveEvents } from './compile'

export type SchemaNode = FormKitSchemaFormKit & Record<string, unknown>

export interface ChildrenConvertCtx {
  children?: (sc?: SchemaNode[]) => FormNode[]
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
export function parseOuterClass(outerClass: unknown, node: { layout?: NodeLayout; outerClass?: string }): void {
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

// ─── 字段节点 ──────────────────────────────────────────────────────────────────

const FIELD_KNOWN_KEYS = new Set([
  '$formkit',
  'name',
  'id',
  'label',
  'if',
  '__raw__ifExpression',
  'value',
  'useExpressionValue',
  '__raw__valueExpression',
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
  'buttonProps',
])

function isExprLike(v: unknown): v is { $expr: Expr } {
  return typeof v === 'object' && v !== null && '$expr' in v
}

export function fieldNodeToSchema(node: FieldNode): SchemaNode {
  const schema: any = { $formkit: node.type }
  if (node.name) schema.name = node.name
  else if (node.id) schema.name = node.id
  if (node.id) schema.id = node.id
  if (node.key) schema.__key = node.key
  if (node.label) schema.label = node.label
  if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
  Object.assign(schema, resolveEvents(node.events))
  if (node.value !== undefined) {
    if (isExprLike(node.value)) {
      schema.useExpressionValue = true
      schema.__raw__valueExpression = exprToJs(node.value.$expr, 'var')
    } else {
      schema.value = node.value
    }
  }
  Object.assign(schema, resolveValidation(node.validation))
  if (node.options?.length) schema.options = node.options
  if (node.props) {
    const nested: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node.props)) {
      if (FIELD_TOP_PROPS.has(key)) schema[key] = value
      else nested[key] = value
    }
    if (Object.keys(nested).length) schema.props = nested
  }
  schema.outerClass = nodeOuterClass(node)
  return schema as SchemaNode
}

export function fieldNodeFromSchema(s: SchemaNode, fallbackType = 'text'): FieldNode {
  const anyS: any = s
  const node: any = {
    id: typeof anyS.id === 'string' && anyS.id ? anyS.id : typeof anyS.__key === 'string' ? anyS.__key : generateKey(),
    category: 'field',
    type: typeof anyS.$formkit === 'string' ? anyS.$formkit : fallbackType,
  }
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof anyS.name === 'string' && anyS.name && anyS.name !== node.id) node.name = anyS.name
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label

  if (anyS.useExpressionValue === true && typeof anyS.__raw__valueExpression === 'string') {
    node.value = { $expr: parseExprString(anyS.__raw__valueExpression) }
  } else if (anyS.value !== undefined) {
    node.value = anyS.value
  }

  const validation = parseValidation(anyS.validation, anyS['validation-messages'] ?? anyS.validationMessages)
  if (validation?.length) node.validation = validation
  if (Array.isArray(anyS.options)) node.options = anyS.options

  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)
  else if (typeof anyS.if === 'boolean') node.visibleIf = { type: 'literal', value: anyS.if }

  const events = parseEvents(anyS)
  if (events?.length) node.events = events

  parseOuterClass(anyS.outerClass, node)

  const props: Record<string, unknown> = {}
  if (anyS.props && typeof anyS.props === 'object') Object.assign(props, anyS.props)
  for (const [key, value] of Object.entries(anyS)) {
    if (FIELD_KNOWN_KEYS.has(key)) continue
    if (value === undefined) continue
    props[key] = value
  }
  if (Object.keys(props).length) node.props = props

  return node as FieldNode
}

// ─── 容器节点 ──────────────────────────────────────────────────────────────────

const CONTAINER_INTERNAL_PROPS = new Set(['listKey', 'cardKey', 'inputGroupKey', 'tabsKey', 'modelValue'])

export function containerNodeToSchema(node: ContainerNode, children?: SchemaNode[]): SchemaNode {
  const ch = children ?? []
  const label = node.label

  if (node.type === 'group') {
    const schema: any = { $formkit: 'group', name: node.name ?? node.id }
    if (node.id) schema.id = node.id
    if (node.key) schema.__key = node.key
    if (label) schema.label = label
    if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
    if (node.props) Object.assign(schema, node.props)
    if (ch.length) schema.children = ch
    schema.outerClass = nodeOuterClass(node)
    return schema as SchemaNode
  }

  if (node.type === 'list' || node.type === 'inputGroup') {
    const keyProp = node.type === 'list' ? 'listKey' : 'inputGroupKey'
    const schema: any = {
      $cmp: node.type,
      props: { [keyProp]: node.id, name: node.name ?? node.id, modelValue: ch, ...node.props },
    }
    if (node.key) schema.__key = node.key
    if (label) schema.label = label
    if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
    schema.children = ch
    schema.outerClass = nodeOuterClass(node)
    return schema as SchemaNode
  }

  // 未知容器类型：$cmp 透传
  const schema: any = { $cmp: node.type, props: { ...node.props } }
  if (node.key) schema.__key = node.key
  if (ch.length) schema.children = ch
  schema.outerClass = nodeOuterClass(node)
  return schema as SchemaNode
}

export function containerNodeFromSchema(s: SchemaNode, ctx: ChildrenConvertCtx): ContainerNode {
  const anyS: any = s
  const type = typeof anyS.$formkit === 'string' ? anyS.$formkit : typeof anyS.$cmp === 'string' ? anyS.$cmp : 'group'
  const props = anyS.props && typeof anyS.props === 'object' ? { ...anyS.props } : {}
  const nodeName =
    typeof anyS.name === 'string' && anyS.name ? anyS.name : typeof props.name === 'string' ? props.name : undefined
  delete props.name
  const childrenArr: SchemaNode[] = Array.isArray(anyS.children)
    ? anyS.children
    : Array.isArray(props.modelValue)
      ? props.modelValue
      : []

  const node: any = {
    id: typeof anyS.id === 'string' && anyS.id ? anyS.id : typeof anyS.__key === 'string' ? anyS.__key : generateKey(),
    category: 'container',
    type,
    dataType: type === 'group' ? 'object' : 'array',
    children: ctx.children ? ctx.children(childrenArr) : [],
  }
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof nodeName === 'string' && nodeName && nodeName !== node.id) node.name = nodeName
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
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
      ['$formkit', '$cmp', '$el', 'name', 'label', 'if', 'children', 'outerClass', 'props', '__key', '__preview_placeholder', 'id'].includes(
        key,
      )
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

export function layoutNodeToSchema(node: LayoutNode, children?: SchemaNode[]): SchemaNode {
  const ch = children ?? []
  const label = node.label

  switch (node.type) {
    case 'card': {
      const schema: any = {
        $cmp: 'card',
        props: { cardKey: node.id, modelValue: ch, ...node.props },
      }
      if (label) schema.props = { ...schema.props, title: label }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
      schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'tabs': {
      const panes: any[] = ch.map((p) => ({ ...(p as any), __key: (p as any)?.__key ?? generateKey() }))
      const schema: any = {
        $cmp: 'tabs',
        props: { tabsKey: node.id, modelValue: panes, ...node.props },
      }
      if (label) schema.label = label
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
      schema.children = panes
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'grid': {
      const columns = Number((node.props as any)?.columns) || 12
      const gap = Number((node.props as any)?.gap) || 4
      const schema: any = { $el: 'div', attrs: { class: `grid grid-cols-${columns} gap-${gap}` } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'row': {
      const schema: any = { $el: 'div', attrs: { class: 'flex flex-row flex-wrap gap-2' } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
      if (ch.length) schema.children = ch
      schema.outerClass = nodeOuterClass(node)
      return schema as SchemaNode
    }
    case 'column': {
      const schema: any = { $el: 'div', attrs: { class: 'flex flex-col gap-2' } }
      if (node.key) schema.__key = node.key
      if (node.visibleIf) schema.if = exprToJs(node.visibleIf, 'formData')
      if (ch.length) schema.children = ch
      schema.outerClass = compileLayout(node.layout)
      return schema as SchemaNode
    }
    default: {
      const schema: any = { $cmp: node.type, props: { ...node.props } }
      if (node.key) schema.__key = node.key
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
      typeof anyS.id === 'string' && anyS.id ? anyS.id : typeof anyS.__key === 'string' ? anyS.__key : generateKey(),
    category: 'layout',
    type,
    children: ctx.children ? ctx.children(childrenArr) : [],
  }
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)

  parseOuterClass(anyS.outerClass, node)

  const props: Record<string, unknown> = {}
  if (anyS.props && typeof anyS.props === 'object') {
    for (const [key, value] of Object.entries(anyS.props)) {
      if (CONTAINER_INTERNAL_PROPS.has(key)) continue
      if (value === undefined) continue
      props[key] = value
    }
  }
  if (typeof anyS.props?.title === 'string') {
    node.label = node.label ?? anyS.props.title
    delete props.title
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
    children: ctx.children ? ctx.children(childrenArr) : [],
  }
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
  parseOuterClass(anyS.outerClass, node)
  return node as LayoutNode
}

// ─── 静态节点 ──────────────────────────────────────────────────────────────────

// FormKit 语义键放顶层（SHARED_FORMKIT_PROPS + 按钮类），其余组件配置放 props 嵌套
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
  'buttonProps',
])

export function staticNodeToSchema(node: StaticNode): SchemaNode {
  const anyProps = node.props && typeof node.props === 'object' ? node.props : {}
  const base: any = {}

  switch (node.type) {
    case 'submit':
      base.$formkit = 'submit'
      base.name = node.name ?? 'submit_button'
      base.label = node.label ?? 'Submit'
      base.type = 'submit'
      base.outerClass = 'col-span-12 pt-2'
      Object.assign(base, anyProps)
      break
    case 'reset':
      base.$formkit = 'reset'
      base.name = node.name ?? 'reset_button'
      base.label = node.label ?? 'Reset'
      base.type = 'reset'
      base.outerClass = 'col-span-12 pt-2'
      Object.assign(base, anyProps)
      break
    case 'button':
      base.$el = 'button'
      base.attrs = { type: anyProps.htmlType ?? 'button', ...(anyProps.attrs as object) }
      if (node.label) base.children = node.label
      break
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
      // $formkit 型静态（reset / naive*）
      base.$formkit = node.type
      if (node.name) base.name = node.name
      if (node.id) base.id = node.id
      if (node.label) base.label = node.label
      const nested: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(anyProps)) {
        if (STATIC_TOP_PROPS.has(key)) base[key] = value
        else nested[key] = value
      }
      if (Object.keys(nested).length) base.props = nested
      base.outerClass = nodeOuterClass(node)
    }
  }

  if (node.key) base.__key = node.key
  if (node.visibleIf) base.if = exprToJs(node.visibleIf, 'formData')
  Object.assign(base, resolveEvents(node.events))
  return base as SchemaNode
}

export function staticNodeFromSchema(s: SchemaNode, hintType?: string): StaticNode {
  const anyS: any = s
  const isSubmit = anyS.$formkit === 'submit'
  const type = isSubmit
    ? 'submit'
    : typeof anyS.$formkit === 'string'
      ? anyS.$formkit
      : typeof anyS.$el === 'string'
        ? mapElToStaticType(anyS.$el)
        : (hintType ?? 'html')
  const node: any = {
    id: typeof anyS.id === 'string' && anyS.id ? anyS.id : typeof anyS.__key === 'string' ? anyS.__key : generateKey(),
    category: 'static',
    type,
  }
  if (typeof anyS.__key === 'string' && anyS.__key) node.key = anyS.__key
  if (typeof anyS.name === 'string' && anyS.name && anyS.name !== node.id) node.name = anyS.name
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label

  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)
  else if (typeof anyS.if === 'boolean') node.visibleIf = { type: 'literal', value: anyS.if }

  if (node.type === 'paragraph' || node.type === 'heading') {
    if (typeof anyS.children === 'string') node.text = anyS.children
    else if (typeof anyS.children === 'number') node.text = String(anyS.children)
  }

  const events = parseEvents(anyS)
  if (events?.length) node.events = events

  parseOuterClass(anyS.outerClass, node)

  const props: Record<string, unknown> = {}
  if (anyS.props && typeof anyS.props === 'object') Object.assign(props, anyS.props)
  if (node.type === 'button' && anyS.attrs) props.attrs = anyS.attrs
  for (const [key, value] of Object.entries(anyS)) {
    if (
      ['$formkit', '$el', '$cmp', 'name', 'id', 'label', 'if', 'children', 'attrs', 'outerClass', 'props', '__key', '__preview_placeholder', 'type'].includes(
        key,
      )
    )
      continue
    if (value === undefined) continue
    props[key] = value
  }
  if (Object.keys(props).length) node.props = props

  return node as StaticNode
}

function mapElToStaticType(tag: string): string {
  if (tag === 'button') return 'button'
  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'heading'
  if (tag === 'hr') return 'divider'
  if (tag === 'p' || tag === 'span' || tag === 'div') return 'paragraph'
  return 'html'
}

// ─── 校验 ↔ schema ─────────────────────────────────────────────────────────────

export function parseValidation(validation: unknown, messages?: unknown): ValidationRule[] | undefined {
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
  const raw = (str: string): Expr => ({ type: 'call', fn: '__raw__', args: [{ type: 'literal', value: str }] })
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
    const result = parseOr()
    skip()
    if (!eof()) return raw(input)
    return result
  } catch {
    return raw(input)
  }
}
