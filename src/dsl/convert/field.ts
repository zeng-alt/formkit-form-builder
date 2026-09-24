// ═══ 字段节点 ↔ FormKit schema ══════════════════════════════════════════════════
// toSchema（fieldNodeToSchema）：DSL FieldNode → $formkit/$cmp/$el schema 节点，
// FormKit 语义键（name/value/validation/options 等）按渲染原语放到顶层或
// props/attrs 嵌套；fromSchema（fieldNodeFromSchema）：反向解析，未知键回流 props。

import { generateKey } from '../../utils/dnd/schema'
import type { Expr, FieldNode } from '../../types/dsl'
import { exprToJs, resolveValidation, schemaCondition } from '../compile'
import { bindToEvents } from '../events'
import {
  type SchemaNode,
  type RenderTarget,
  inferRenderTarget,
  parseOuterClass,
  nodeOuterClass,
  putByKind,
  applyByKind,
  buildNodeHead,
} from './shared'
import { parseValidation } from './validation-parse'
import { parseExprString } from './expr-parse'

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
  '__disabledIf',
  '__readonlyIf',
  'outerClass',
  'children',
  '__key',
  'bind',
  'props',
  'attrs',
  '__bind',
])

// FormKit 语义键放顶层，其余组件配置放 props 嵌套（与 legacy 画布约定一致）
// 注：'__bind' 不在此列——它已由 events 统一产出（见 buildNodeHead），不再从 node.props 透传
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
  'buttonText',
])

// ─── 条件必填：requiredIf 为真时临时加一条 required 规则 ────────────────────────
// 字段已有静态 required 规则时静态规则优先（两个分支都含 required，条件真假都不
// 影响结果，等价于"条件必填不生效"，无需在这里额外判断跳过）。用 FormKit 的条件
// 属性 { if, then, else } 让 validation 数组整体随条件切换，复用同一套 exprToJs +
// compile() 求值链路，不用再写一个单独的表达式求值器。
function resolveFieldValidation(node: FieldNode): Record<string, unknown> {
  const resolved = resolveValidation(node.validation)
  if (!node.requiredIf) return resolved as unknown as Record<string, unknown>
  const hasStaticRequired = (node.validation ?? []).some((r) => r.rule === 'required')
  const thenValidation = hasStaticRequired
    ? resolved.validation
    : [...resolved.validation, ['required']]
  return {
    ...resolved,
    validation: schemaCondition(exprToJs(node.requiredIf), thenValidation, resolved.validation),
  }
}

export function fieldNodeToSchema(node: FieldNode, rt?: RenderTarget): SchemaNode {
  const kind = rt?.renderAs ?? 'formkit'
  const target = rt?.target ?? node.type
  const base: any = buildNodeHead(node, kind, target)

  if (node.name) putByKind(base, 'name', node.name, kind)
  else if (node.id) putByKind(base, 'name', node.id, kind)

  if (node.value !== undefined) {
    putByKind(base, 'value', node.value, kind)
  }
  if (typeof node.expr === 'string' && node.expr.trim()) {
    // expr 一律放 schema 顶层（与渲染原语无关）：运行时 useExprRun 只扫描顶层 expr
    base.expr = node.expr
    // 带 expr 的字段不设初始 value，由运行时求值填充
    if (kind === 'formkit') delete base.value
    else if (kind === 'cmp') delete base.props?.value
    else delete base.attrs?.value
  }
  applyByKind(base, resolveFieldValidation(node), kind)
  if (Array.isArray(node.options) ? node.options.length : node.options !== undefined)
    putByKind(base, 'options', node.options, kind)

  // 条件禁用 / 条件只读：编译为 FormKit 的条件属性 { if, then }（省略 else，
  // 条件不成立时该键的编译结果是 undefined）。这两个键只在 use-schema-attrs.ts
  // 里读取（config.__disabledIf / config.__readonlyIf），不会被当成真实组件属性
  // 透传给底层 naive-ui 组件（见 use-schema-attrs.ts 的 INTERNAL_KEYS）。
  // 选用条件属性而非直接把表达式编译值写进 FormKit 保留的 disabled/readonly
  // 属性名：后者是 FormKit 的级联属性（节点自身一旦有值就不再回退父级/表单级
  // disabled），会与表单级禁用叠加规则冲突；改在这里只产出一个原始布尔信号，
  // 实际叠加逻辑统一放在 use-schema-attrs.ts 的 disabled/readonly 计算属性里，
  // 与表单级 disabled/readonly、字段静态 disabled 三者一起做"任一为真即生效"的判断。
  if (node.disabledIf)
    putByKind(base, '__disabledIf', schemaCondition(exprToJs(node.disabledIf), true), kind)
  if (node.readonlyIf)
    putByKind(base, '__readonlyIf', schemaCondition(exprToJs(node.readonlyIf), true), kind)

  if (node.props) {
    const nested: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node.props)) {
      // __bind 已由 events 统一产出（见上），不再从 node.props 原样透传，避免重复/冲突
      if (key === '__bind') continue
      if (kind === 'formkit' && FIELD_TOP_PROPS.has(key)) base[key] = value
      else nested[key] = value
    }
    if (Object.keys(nested).length) {
      if (kind === 'cmp') base.props = { ...base.props, ...nested }
      else if (kind === 'el') base.attrs = { ...base.attrs, ...nested }
      else base.props = nested
    }
  }

  const outerClass = nodeOuterClass(node)
  base.outerClass = outerClass

  // $cmp 字段：FormKit 语义键与组件配置都收进 props（包装组件只转发 props），
  // 外框类顶层与 props 双写——画布 grid / DnD 读顶层 outerClass，渲染经 props 落到 FormKit；
  // 画布/面板读取顶层 name（key 兜底 / 唯一命名），组件经 props.name 接收（与 static 一致）
  if (kind === 'cmp') {
    if (Object.keys(base.props ?? {}).length === 0) delete base.props
    if (typeof base.outerClass === 'string' && base.outerClass)
      base.props = { ...base.props, outerClass: base.outerClass }
    if (typeof base.props?.name === 'string') base.name = base.props.name
  }

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

  // validation 可能是条件必填编译出的 { if, then, else }（见 resolveFieldValidation）：
  // else 分支始终是"未生效条件必填时"的静态规则数组，按它还原 node.validation，
  // if 还原成 requiredIf——两者互不干扰，含静态 required 时一并保留，与写入时对称。
  let requiredIf: Expr | undefined
  let validationSource: unknown = P.validation
  if (
    validationSource &&
    typeof validationSource === 'object' &&
    !Array.isArray(validationSource) &&
    typeof (validationSource as { if?: unknown }).if === 'string'
  ) {
    const cond = validationSource as { if: string; then?: unknown; else?: unknown }
    requiredIf = parseExprString(cond.if)
    validationSource = Array.isArray(cond.else)
      ? cond.else
      : Array.isArray(cond.then)
        ? cond.then
        : []
  }
  const validation = parseValidation(
    validationSource,
    P['validation-messages'] ?? P.validationMessages,
  )
  if (validation?.length) node.validation = validation
  if (requiredIf) node.requiredIf = requiredIf
  if (Array.isArray(P.options)) node.options = P.options

  if (typeof anyS.if === 'string' && anyS.if) node.visibleIf = parseExprString(anyS.if)
  else if (typeof anyS.if === 'boolean') node.visibleIf = { type: 'literal', value: anyS.if }

  // 条件禁用 / 条件只读：还原自 { if, then } 条件属性（见 fieldNodeToSchema）
  const disabledIfSrc = P.__disabledIf as { if?: unknown } | undefined
  if (disabledIfSrc && typeof disabledIfSrc === 'object' && typeof disabledIfSrc.if === 'string') {
    node.disabledIf = parseExprString(disabledIfSrc.if)
  }
  const readonlyIfSrc = P.__readonlyIf as { if?: unknown } | undefined
  if (readonlyIfSrc && typeof readonlyIfSrc === 'object' && typeof readonlyIfSrc.if === 'string') {
    node.readonlyIf = parseExprString(readonlyIfSrc.if)
  }

  // events 唯一真源：P.__bind 是真源位置（formkit 顶层 / cmp、el 节点各自的 props/attrs）
  const events = bindToEvents(P.__bind)
  if (events?.length) node.events = events

  parseOuterClass(anyS.outerClass, node)

  const props: Record<string, unknown> = {}
  // 事件键（onClick 等）已由上面的 __bind 消费，不再作为普通配置回流 props（与静态节点一致）。
  // nested：从嵌套 props / attrs 收集时，children 是组件的普通配置（如 range 的
  // '$slots.default' slot 转发），只有节点顶层的 children 才是 schema 结构键——
  // 不区分会让往返丢掉这个属性。
  const collect = (obj: Record<string, unknown>, nested = false) => {
    for (const [key, value] of Object.entries(obj)) {
      const structural =
        nested && key === 'children' ? Array.isArray(value) : FIELD_KNOWN_KEYS.has(key)
      if (structural || /^on[A-Z]/.test(key)) continue
      if (value === undefined) continue
      props[key] = value
    }
  }
  if (isCmp) {
    collect(anyS.props ?? {}, true)
    // 顶层遗留未知键（placeholder 等）回流 props，与 legacy 行为一致
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'props' || key === '$cmp' || FIELD_KNOWN_KEYS.has(key) || /^on[A-Z]/.test(key))
        continue
      if (value === undefined || props[key] !== undefined) continue
      props[key] = value
    }
  } else if (isEl) {
    collect(anyS.attrs ?? {}, true)
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'attrs' || key === '$el' || FIELD_KNOWN_KEYS.has(key) || /^on[A-Z]/.test(key))
        continue
      if (value === undefined) continue
      props[key] = value
    }
  } else {
    collect(anyS)
    // formkit 字段：非语义配置（disabled/clearable/maxlength/size 等）由 toSchema 放入
    // props 嵌套，需回流避免 schema→DSL 往返丢属性（数据表格搜索区重建元素依赖此处）
    collect(anyS.props ?? {}, true)
    for (const [key, value] of Object.entries(anyS)) {
      if (key === 'props' || FIELD_KNOWN_KEYS.has(key) || /^on[A-Z]/.test(key)) continue
      if (value === undefined || props[key] !== undefined) continue
      props[key] = value
    }
  }
  if (Object.keys(props).length) node.props = props

  return node as FieldNode
}
