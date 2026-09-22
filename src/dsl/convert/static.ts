// ═══ 静态节点 ↔ FormKit schema ══════════════════════════════════════════════════
// toSchema（staticNodeToSchema）：DSL StaticNode → schema，submit/reset 走
// $formkit（或 cmp/el 原语），button/paragraph/heading/divider 有各自固定的
// $el 标签，其余走 keyOf(node.type) 按渲染原语选 $cmp/$el/$formkit；
// fromSchema（staticNodeFromSchema，含 mapElToStaticType 标签→类型映射）：反向解析。

import { generateKey } from '../../utils/dnd/schema'
import type { StaticNode } from '../../types/dsl'
import { exprToJs, resolveEvents } from '../compile'
import { bindToEvents } from '../events'
import {
  type SchemaNode,
  type RenderTarget,
  inferRenderTarget,
  parseOuterClass,
  nodeOuterClass,
  putByKind,
  applyByKind,
} from './shared'
import { parseExprString } from './expr-parse'

// FormKit 语义键放顶层（$formkit 渲染），其余组件配置放 props / attrs 嵌套
// 注：'__bind' 不在此列——它已由 events 统一产出（见 buildNodeHead/staticNodeToSchema），
// 不再从 node.props 透传
const STATIC_TOP_PROPS = new Set([
  'options',
  'value',
  'min',
  'max',
  'step',
  'multiple',
  'accept',
  'placeholder',
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
  '__bind',
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
      base.outerClass = outer === 'col-span-12' && !node.outerClass ? 'col-span-12 pt-2' : outer
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
        // __bind 已由 events 统一产出（见下），不再从 node.props 原样透传
        if (key === '__bind') continue
        if (kind === 'formkit' && STATIC_TOP_PROPS.has(key)) base[key] = value
        else putByKind(base, key, value, kind)
      }
      base.outerClass = nodeOuterClass(node)
    }
  }

  if (node.key) base.__key = node.key
  if (node.visibleIf) base.if = exprToJs(node.visibleIf)
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

  // events 唯一真源：P.__bind 是真源位置（formkit 顶层 / cmp、el 节点各自的 props/attrs）
  const events = bindToEvents(P.__bind)
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
    // 顶层遗留未知键回流 props，与 legacy 行为一致；事件键（onXxx）已由 parseEvents 消费
    for (const [key, value] of Object.entries(anyS)) {
      if (
        key === 'props' ||
        key === '$cmp' ||
        STATIC_CONSUMED_KEYS.has(key) ||
        /^on[A-Z]/.test(key)
      )
        continue
      if (value === undefined || props[key] !== undefined) continue
      props[key] = value
    }
  } else if (isEl) {
    collect(anyS.attrs ?? {})
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'attrs' || key === '$el' || STATIC_CONSUMED_KEYS.has(key) || /^on[A-Z]/.test(key))
        continue
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
