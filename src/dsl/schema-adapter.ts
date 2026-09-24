// ═══ DSL ⇄ FormKit schema 顶层适配器 ═══════════════════════════════════════════
// dslToSchema：渲染 / 导出给前端运行时
// schemaToDsl：导入 / 解析外部 schema（best-effort，未知节点无损保留到 meta）

import { toRaw } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormDefinition, FormNode, FormSettings } from '../types/dsl'
import { DSL_VERSION } from '../types/dsl'
import { generateKey } from '../utils/dnd/schema'
import { getElementTypeDef, getElementTypeDefs } from './registry'
import { registerBuiltinElementTypes } from './definitions'
import type { SchemaNode } from './convert'
import { freezeDeepDev } from '../utils/freeze'
import { DEFAULT_LABEL_WIDTH } from '../utils/form-layout'

registerBuiltinElementTypes()

// ── 转换核心（无缓存、无冻结的纯函数）──────────────────────────────────────────
// convertNode / buildSchema / wrapNodeWithGroup 只依赖各自的输入参数，`cache` 为
// null 时就是普通的递归转换，公开的 dslToSchema / dslToOutputSchema 走这条路径：
// 每次调用都重新转换整棵树，返回全新对象，互不污染。
// `cache` 非空时按节点身份记录转换结果并做开发态冻结——这是 createSchemaProjector()
// 的增量转换实现：DSL 的编辑路径全部不可变更新，节点引用不变 ⇒ 其整棵子树不变，
// 命中缓存时直接复用同一个 schema 对象（含其全部子孙），未改动的字段因此保持 ===
// 引用，Vue/FormKit 的 props 浅比较才能跳过它们的重渲染。

function convertNode(input: FormNode, cache: WeakMap<FormNode, SchemaNode> | null): SchemaNode {
  // DSL 节点按设计应当是纯 JS 数据（formDefinition 是 shallowRef，从不套 reactive()），
  // 但外部消费方（如 FormRenderer 的调用方）可能把 definition 包进了 reactive()/传给
  // 一个会做响应式包装的宿主——这种情况下 node 是 Vue 的响应式 Proxy。toRaw 拿到的
  // 原始对象上直接读属性不会再经过 reactive 的 get 陷阱，其嵌套属性（如 props.options）
  // 也就还是普通对象，不会把响应式代理带进缓存/冻结（Object.freeze 一个响应式 Proxy
  // 再读它会触发 Proxy 不变量校验失败，见测试里复现的场景）。缓存同样按 toRaw 后的
  // 引用为键，保证同一份数据无论是否被外部套了 reactive() 都命中同一个缓存条目。
  const node = toRaw(input)
  if (cache) {
    const cached = cache.get(node)
    if (cached) return cached
  }

  const def = getElementTypeDef(node.type)
  let schema: SchemaNode
  if (!def) {
    // 未注册类型：若来自 schemaToDsl 的 fallback（meta.rawSchema），原样透传，保证渲染不崩。
    // rawSchema 是 node 自身携带的数据，同一个 node 引用下它也不变，缓存策略一致。
    const raw = (node as { meta?: { rawSchema?: unknown } }).meta?.rawSchema
    if (raw && typeof raw === 'object') {
      schema = raw as SchemaNode
    } else {
      throw new Error(`[dslToSchema] 未注册的 DSL 类型: ${node.category}/${node.type}`)
    }
  } else {
    const hasChildren =
      (node.category === 'container' || node.category === 'layout') &&
      Array.isArray((node as { children?: FormNode[] }).children)
    const children: SchemaNode[] | undefined = hasChildren
      ? (node as { children: FormNode[] }).children.map((c) => convertNode(c, cache))
      : undefined
    schema = def.toSchema(node, { children })
  }

  if (cache) {
    freezeDeepDev(schema)
    cache.set(node, schema)
  }
  return schema
}

function buildSchema(
  form: FormDefinition,
  cache: WeakMap<FormNode, SchemaNode> | null,
): FormKitSchemaFormKit[] {
  // 同 convertNode：防御外部传入的响应式 definition，取 raw 后再读顶层字段
  const rawForm = toRaw(form)
  const rootChildren = rawForm.root.children.map((c) => convertNode(c, cache))
  const settings = rawForm.settings

  const formNode: any = {
    $formkit: 'form',
    name: rawForm.name,
    props: {
      labelPosition: settings.labelAlign === 'left' ? 'left' : 'top',
      labelWidth: settings.labelWidth ?? DEFAULT_LABEL_WIDTH,
      submit: settings.submit,
      // B1：表单级设置随 schema 带入表单节点 props，供 schemaToDsl 往返读回
      // （parseFormSettings）——级联渲染本身不依赖这份 schema props，直接读
      // FormDefinition.settings（见 use-schema-attrs.ts / FormRenderer.vue）
      size: settings.size,
      disabled: settings.disabled,
      readonly: settings.readonly,
      successMessage: settings.successMessage,
      successRedirect: settings.successRedirect,
      showReset: settings.showReset,
      submitText: settings.submitText,
      resetText: settings.resetText,
      // id / version 位于 DSL 顶层（非 settings），随 schema 带入表单节点 props，
      // 供 renderer 的 submit 逻辑与字段 bind 代码经 runBindCode 读取
      id: rawForm.id,
      version: rawForm.version,
    },
    children: rootChildren,
  }

  return [formNode as FormKitSchemaFormKit]
}

/** 将表单 children 中的容器/布局节点包裹在 $formkit: 'group' 中。
 *  纯函数，不改动输入——`cache` 非空时按源节点身份缓存并冻结结果，供 nested 模式
 *  投影复用；为 null 时每次都重新构建，不写入任何共享状态。 */
function wrapFormChildren(
  schemaNode: FormKitSchemaFormKit,
  cache: WeakMap<object, unknown> | null,
): FormKitSchemaFormKit {
  const n: SchemaNode = schemaNode
  if (!n || typeof n !== 'object' || !Array.isArray(n.children)) return schemaNode
  return {
    ...n,
    children: n.children.map((child) => wrapNodeWithGroup(child, cache)),
  } as FormKitSchemaFormKit
}

function wrapNodeWithGroup(input: any, cache: WeakMap<object, unknown> | null): any {
  if (!input || typeof input !== 'object') return input
  if (cache) {
    const cached = cache.get(input)
    if (cached) return cached
  }

  // 递归处理子节点：不改动传入节点，子节点有变化时换成拷贝后的新节点
  const node = Array.isArray(input.children)
    ? { ...input, children: input.children.map((c: any) => wrapNodeWithGroup(c, cache)) }
    : input

  let result: any
  // 跳过已包裹的节点
  if (node.$formkit === 'group' || node.$formkit === 'form' || node.$formkit === 'list') {
    result = node
  } else if (node.$formkit === 'submit' || node.$formkit === 'reset') {
    result = node
  } else {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    // $cmp 化后字段（如 $cmp: text）不再是容器，不能按旧“$cmp 即容器”的规则误判包裹；
    // 容器/布局按注册表分类判断，未注册节点沿用旧行为（$cmp 即包）
    const cmpType = typeof node.$cmp === 'string' && node.$cmp !== '' ? node.$cmp : undefined
    const def = cmpType ? getElementTypeDef(cmpType) : undefined
    const isContainerOrLayout =
      (typeof node.$cmp === 'string' &&
        node.$cmp !== '' &&
        (def ? def.category === 'container' || def.category === 'layout' : true)) ||
      (typeof node.$el === 'string' && hasChildren)

    if (!isContainerOrLayout) {
      result = node
    } else {
      const nodeName = node.props?.name ?? node.name
      const original: any = { ...node }
      // 容器/布局自身不再携带 name（由外层 group 提供）；props 与 node 共享，删前先拷贝
      if (original.props && original.props.name) {
        original.props = { ...original.props }
        delete original.props.name
      }
      delete original.name
      const outerClass = original.outerClass
      delete original.outerClass

      const group: any = {
        $formkit: 'group',
        children: [original],
        outerClass: [
          outerClass || 'col-span-12',
          '!border-0',
          '!p-0',
          '!m-0',
          '[&>.formkit-wrapper]:!border-0',
          '[&>.formkit-wrapper]:!p-0',
          '[&>.formkit-wrapper]:!m-0',
          '[&>.formkit-wrapper>fieldset]:!border-0',
          '[&>.formkit-wrapper>fieldset]:!p-0',
          '[&>.formkit-wrapper>fieldset]:!m-0',
        ].join(' '),
      }
      if (typeof nodeName === 'string' && nodeName.trim()) group.name = nodeName
      result = group
    }
  }

  if (cache) {
    freezeDeepDev(result)
    cache.set(input, result)
  }
  return result
}

/** 公开 API：DSL → FormKit schema。每次调用都重新转换整棵树，不缓存、不冻结、
 *  返回全新对象——外部调用方（reactive() 包裹 + 原地修改、或改写返回结果）不会
 *  互相污染，也不会因为命中过期缓存而拿到旧结果。渲染增量场景请用
 *  createSchemaProjector()。 */
export function dslToSchema(form: FormDefinition): FormKitSchemaFormKit[] {
  return buildSchema(form, null)
}

/** 公开 API：将 DSL 转为含 Group 包裹的 FormKit schema，子节点嵌套为 JSON object 数据。
 *  同 dslToSchema：不缓存、不冻结。 */
export function dslToOutputSchema(form: FormDefinition): FormKitSchemaFormKit[] {
  const raw = buildSchema(form, null)
  return raw.map((node) => wrapFormChildren(node, null))
}

/** 增量转换投影：持有本实例的 WeakMap 缓存（节点转换 + group 包裹各一份），
 *  `toSchema` / `toOutputSchema` 与公开的 dslToSchema / dslToOutputSchema 语义等价，
 *  区别是同一个节点引用命中缓存时直接复用上次的 schema 对象（含冻结），配合不可变
 *  的 DSL 编辑路径实现增量渲染。每个使用方（设计器状态实例、每个 FormRenderer 实例）
 *  应各自持有一个 projector，不共享，否则不同调用方的编辑历史会互相污染缓存。 */
export function createSchemaProjector(): {
  toSchema: (form: FormDefinition) => FormKitSchemaFormKit[]
  toOutputSchema: (form: FormDefinition) => FormKitSchemaFormKit[]
} {
  const nodeCache = new WeakMap<FormNode, SchemaNode>()
  const wrapCache = new WeakMap<object, unknown>()
  return {
    toSchema: (form) => buildSchema(form, nodeCache),
    toOutputSchema: (form) => {
      const raw = buildSchema(form, nodeCache)
      return raw.map((node) => wrapFormChildren(node, wrapCache))
    },
  }
}

interface SchemaToDslOptions {
  id?: string
  name?: string
}

export function schemaToDsl(
  schema: FormKitSchemaFormKit[],
  options?: SchemaToDslOptions,
): FormDefinition {
  registerBuiltinElementTypes()

  let children: SchemaNode[] = schema as SchemaNode[]
  let name = options?.name ?? 'form'
  let id = options?.id ?? generateKey()
  let version = DSL_VERSION
  const settings: FormSettings = {}

  // 识别 $formkit: form 包装层
  if (schema.length === 1) {
    const only: SchemaNode | undefined = schema[0]
    if (only?.$formkit === 'form' && Array.isArray(only.children)) {
      if (typeof only.name === 'string' && only.name.trim()) name = only.name
      if (typeof only.props?.id === 'string' && only.props.id.trim()) id = only.props.id
      if (Number.isFinite(Number(only.props?.version))) version = Number(only.props.version)
      Object.assign(settings, parseFormSettings(only.props))
      // only.children 已由上面的 Array.isArray 收窄；FormKit 自己的 children 类型是
      // string | FormKitSchemaNode[] | FormKitSchemaCondition 的并集，narrow 完仍是这套
      // 宽泛的节点联合，读不到 SchemaNode 的扩展键，按本文件的 SchemaNode 断言
      children = only.children as SchemaNode[]
    }
  }

  const convert = (node: SchemaNode): FormNode => {
    for (const def of getElementTypeDefs()) {
      if (!def.match?.(node)) continue
      if (def.fromSchema) {
        const converted = def.fromSchema(node, {
          children: (sc) => (Array.isArray(sc) ? sc.map(convert) : []),
        })
        if (converted) return converted
      }
      break
    }
    return fallbackToNode(node)
  }

  return {
    version,
    id,
    name,
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: children.map(convert),
    },
    settings,
  }
}

// 单节点 schema → DSL（编辑写路径用：只转换被编辑节点，避免整树往返）
export function schemaNodeToDslNode(node: SchemaNode): FormNode {
  registerBuiltinElementTypes()
  const convert = (n: SchemaNode): FormNode => {
    for (const def of getElementTypeDefs()) {
      if (!def.match?.(n)) continue
      if (def.fromSchema) {
        const converted = def.fromSchema(n, {
          children: (sc) => (Array.isArray(sc) ? sc.map(convert) : []),
        })
        if (converted) return converted
      }
      break
    }
    return fallbackToNode(n)
  }
  return convert(node)
}

function keyOfSchemaNode(s: SchemaNode): string | undefined {
  const anyS: any = s
  if (typeof anyS?.__key === 'string' && anyS.__key) return anyS.__key
  if (typeof anyS?.id === 'string' && anyS.id) return anyS.id
  return undefined
}

function schemaChildrenOf(s: SchemaNode): SchemaNode[] {
  const anyS: any = s
  const children = Array.isArray(anyS?.children) ? anyS.children : anyS?.props?.modelValue
  return Array.isArray(children) ? children : []
}

// DnD/画布写路径：按 key 对 DSL 树做差异调和，仅转换变更节点，未变子树原样复用
export function reconcileDslTree(
  currentDslChildren: FormNode[],
  currentSchema: FormKitSchemaFormKit[],
  nextSchema: FormKitSchemaFormKit[],
): FormNode[] {
  const dslIndex = new Map<string, FormNode>()
  const walkDsl = (nodes: FormNode[]) => {
    for (const n of nodes) {
      if (n.key) dslIndex.set(n.key, n)
      if (n.id) dslIndex.set(n.id, n)
      const children = (n as { children?: FormNode[] }).children
      if (Array.isArray(children)) walkDsl(children)
    }
  }
  walkDsl(currentDslChildren)

  const schemaIndex = new Map<string, SchemaNode>()
  const walkSchema = (nodes: SchemaNode[]) => {
    for (const n of nodes) {
      const k = keyOfSchemaNode(n)
      if (k) schemaIndex.set(k, n)
      const children = schemaChildrenOf(n)
      if (children.length) walkSchema(children)
    }
  }
  walkSchema(currentSchema as SchemaNode[])

  const reconcile = (children: FormNode[], nextNodes: SchemaNode[]): FormNode[] => {
    return nextNodes.map((schemaNode) => {
      const key = keyOfSchemaNode(schemaNode)
      let existing = dslIndex.get(key as string)
      if (!key) return schemaNodeToDslNode(schemaNode)
      existing = dslIndex.get(key)
      const oldSchema = schemaIndex.get(key)
      // 引用快路径：画布/DnD 提交的 schema 节点常来自缓存投影（dslToSchema 命中缓存）
      // 或 toRaw 后与旧投影同一份，直接 === 即可判定未变，免去整树 JSON.stringify；
      // 代理/拷贝后仍等价（值相同但引用不同）时落到下面的深比较兜底
      if (existing && oldSchema && toRaw(oldSchema) === toRaw(schemaNode)) {
        return existing
      }
      if (existing && oldSchema && JSON.stringify(oldSchema) === JSON.stringify(schemaNode)) {
        return existing
      }
      const converted = schemaNodeToDslNode(schemaNode)
      if (!existing) return converted
      const next: Record<string, unknown> = { ...converted }
      next.id = existing.id
      next.key = existing.key
      if (existing.category === 'container' || existing.category === 'layout') {
        const existingChildren = existing.children
        const newChildren = schemaChildrenOf(schemaNode)
        const oldChildren = oldSchema ? schemaChildrenOf(oldSchema) : []
        const sameChildrenByRef =
          oldSchema != null &&
          oldChildren.length === newChildren.length &&
          oldChildren.every((c, i) => toRaw(c) === toRaw(newChildren[i]))
        if (
          sameChildrenByRef ||
          (oldSchema && JSON.stringify(oldChildren) === JSON.stringify(newChildren))
        ) {
          next.children = existingChildren
        } else {
          next.children = reconcile(existingChildren, newChildren)
        }
      }
      return next as unknown as FormNode
    })
  }

  return reconcile(currentDslChildren, nextSchema as SchemaNode[])
}

function parseFormSettings(props: unknown): Partial<FormSettings> {
  const p: any = props ?? {}
  const settings: Partial<FormSettings> = {}
  if (p.labelPosition === 'left' || p.labelPosition === 'top') settings.labelAlign = p.labelPosition
  if (Number.isFinite(Number(p.labelWidth))) settings.labelWidth = Number(p.labelWidth)
  if (typeof p.submit === 'string' && p.submit) settings.submit = p.submit
  if (p.size === 'small' || p.size === 'medium' || p.size === 'large') settings.size = p.size
  if (typeof p.disabled === 'boolean') settings.disabled = p.disabled
  if (typeof p.readonly === 'boolean') settings.readonly = p.readonly
  if (typeof p.successMessage === 'string' && p.successMessage)
    settings.successMessage = p.successMessage
  if (typeof p.successRedirect === 'string' && p.successRedirect)
    settings.successRedirect = p.successRedirect
  if (typeof p.showReset === 'boolean') settings.showReset = p.showReset
  if (typeof p.submitText === 'string' && p.submitText) settings.submitText = p.submitText
  if (typeof p.resetText === 'string' && p.resetText) settings.resetText = p.resetText
  return settings
}

function fallbackToNode(s: SchemaNode): FormNode {
  const anyS: any = s
  const category = anyS.$formkit ? 'field' : anyS.$cmp ? 'container' : 'layout'
  const node: any = {
    id: typeof anyS.id === 'string' && anyS.id ? anyS.id : generateKey(),
    category,
    type: (anyS.$formkit ?? anyS.$cmp ?? anyS.$el ?? 'unknown') as string,
    meta: { rawSchema: s },
  }
  if (typeof anyS.label === 'string' && anyS.label) node.label = anyS.label
  if (category === 'container' || category === 'layout') {
    node.children = Array.isArray(anyS.children) ? anyS.children.map(fallbackToNode) : []
  }
  return node as FormNode
}
