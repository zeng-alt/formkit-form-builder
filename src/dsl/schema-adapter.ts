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

registerBuiltinElementTypes()

// 按 DSL 节点身份缓存转换结果：toSchema 只读 node 本身与 ctx.children（不读整个
// form，见 DslToSchemaCtx），是节点身份的纯函数。DSL 的编辑路径全部不可变更新，
// 节点引用不变 ⇒ 其整棵子树不变，命中缓存时直接复用同一个 schema 对象（含其全部
// 子孙），未改动的字段在设计器画布上因此保持 === 引用，Vue/FormKit 的 props 浅比较
// 才能跳过它们的重渲染——这是本文件"增量转换"的核心。
const schemaCache = new WeakMap<FormNode, SchemaNode>()

function convertNode(input: FormNode): SchemaNode {
  // DSL 节点按设计应当是纯 JS 数据（formDefinition 是 shallowRef，从不套 reactive()），
  // 但外部消费方（如 FormRenderer 的调用方）可能把 definition 包进了 reactive()/传给
  // 一个会做响应式包装的宿主——这种情况下 node 是 Vue 的响应式 Proxy。toRaw 拿到的
  // 原始对象上直接读属性不会再经过 reactive 的 get 陷阱，其嵌套属性（如 props.options）
  // 也就还是普通对象，不会把响应式代理带进缓存/冻结（Object.freeze 一个响应式 Proxy
  // 再读它会触发 Proxy 不变量校验失败，见测试里复现的场景）。缓存同样按 toRaw 后的
  // 引用为键，保证同一份数据无论是否被外部套了 reactive() 都命中同一个缓存条目。
  const node = toRaw(input)
  const cached = schemaCache.get(node)
  if (cached) return cached

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
      ? (node as { children: FormNode[] }).children.map(convertNode)
      : undefined
    schema = def.toSchema(node, { children })
  }

  freezeDeepDev(schema)
  schemaCache.set(node, schema)
  return schema
}

export function dslToSchema(form: FormDefinition): FormKitSchemaFormKit[] {
  // 同 convertNode：防御外部传入的响应式 definition，取 raw 后再读顶层字段
  const rawForm = toRaw(form)
  const rootChildren = rawForm.root.children.map(convertNode)
  const settings = rawForm.settings

  const formNode: any = {
    $formkit: 'form',
    name: rawForm.name,
    props: {
      labelPosition: settings.labelAlign === 'left' ? 'left' : 'top',
      labelWidth: settings.labelWidth ?? 80,
      columns: settings.columns ?? 12,
      layout: settings.layout,
      submit: settings.submit,
      // id / version 位于 DSL 顶层（非 settings），随 schema 带入表单节点 props，
      // 供 renderer 的 submit 逻辑与字段 bind 代码经 runBindCode 读取
      id: rawForm.id,
      version: rawForm.version,
    },
    children: rootChildren,
  }

  return [formNode as FormKitSchemaFormKit]
}

/** 公开 API：将 DSL 转为含 Group 包裹的 FormKit schema，子节点嵌套为 JSON object 数据 */
export function dslToOutputSchema(form: FormDefinition): FormKitSchemaFormKit[] {
  const raw = dslToSchema(form)
  const wrapped = raw.map((node) => wrapFormChildren(node))
  return wrapped
}

/** 将表单 children 中的容器/布局节点包裹在 $formkit: 'group' 中。
 *  纯函数，不改动输入——dslToSchema 缓存复用同一个 schema 对象供下次调用命中缓存，
 *  这里原地改写会污染缓存（开发态下这些对象已被冻结，改写会直接抛错）。 */
function wrapFormChildren(schemaNode: FormKitSchemaFormKit): FormKitSchemaFormKit {
  const n: SchemaNode = schemaNode
  if (!n || typeof n !== 'object' || !Array.isArray(n.children)) return schemaNode
  return {
    ...n,
    children: n.children.map((child) => wrapNodeWithGroup(child)),
  } as FormKitSchemaFormKit
}

function wrapNodeWithGroup(input: any): any {
  if (!input || typeof input !== 'object') return input

  // 递归处理子节点：不改动传入节点，子节点有变化时换成拷贝后的新节点
  const node = Array.isArray(input.children)
    ? { ...input, children: input.children.map((c: any) => wrapNodeWithGroup(c)) }
    : input

  // 跳过已包裹的节点
  if (node.$formkit === 'group' || node.$formkit === 'form' || node.$formkit === 'list') return node
  if (node.$formkit === 'submit' || node.$formkit === 'reset') return node

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
  if (!isContainerOrLayout) return node

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

  return group
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
  const settings: FormSettings = { layout: 'vertical' }

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
  if (Number.isFinite(Number(p.columns))) settings.columns = Number(p.columns)
  if (p.layout === 'horizontal' || p.layout === 'inline') settings.layout = p.layout
  if (typeof p.submit === 'string' && p.submit) settings.submit = p.submit
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
