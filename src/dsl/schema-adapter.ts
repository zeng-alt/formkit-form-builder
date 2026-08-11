// ═══ DSL ⇄ FormKit schema 顶层适配器 ═══════════════════════════════════════════
// dslToSchema：渲染 / 导出给前端运行时
// schemaToDsl：导入 / 解析外部 schema（best-effort，未知节点无损保留到 meta）

import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormDefinition, FormNode, FormSettings } from '../types/dsl'
import { DSL_VERSION } from '../types/dsl'
import { generateKey } from '../utils/dnd/schema'
import { getElementTypeDef, getElementTypeDefs } from './registry'
import { registerBuiltinElementTypes } from './definitions'
import type { SchemaNode } from './convert-common'

registerBuiltinElementTypes()

export function dslToSchema(form: FormDefinition): FormKitSchemaFormKit[] {
  const convert = (node: FormNode): SchemaNode => {
    const def = getElementTypeDef(node.type)
    if (!def) {
      // 未注册类型：若来自 schemaToDsl 的 fallback（meta.rawSchema），原样透传，保证渲染不崩
      const raw = (node as { meta?: { rawSchema?: unknown } }).meta?.rawSchema
      if (raw && typeof raw === 'object') return raw as SchemaNode
      throw new Error(`[dslToSchema] 未注册的 DSL 类型: ${node.category}/${node.type}`)
    }
    const hasChildren =
      (node.category === 'container' || node.category === 'layout') &&
      Array.isArray((node as { children?: FormNode[] }).children)
    const children: SchemaNode[] | undefined = hasChildren
      ? (node as { children: FormNode[] }).children.map(convert)
      : undefined
    return def.toSchema(node, { form, children })
  }

  const rootChildren = form.root.children.map(convert)
  const settings = form.settings

  const formNode: any = {
    $formkit: 'form',
    name: form.name,
    props: {
      labelPosition: settings.labelAlign === 'left' ? 'left' : 'top',
      labelWidth: settings.labelWidth ?? 80,
      columns: settings.columns ?? 12,
      layout: settings.layout,
      submit: settings.submit,
      // id / version 位于 DSL 顶层（非 settings），随 schema 带入表单节点 props，
      // 供 renderer 的 submit 逻辑与字段 bind 代码经 runBindCode 读取
      id: form.id,
      version: form.version,
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

/** 将表单 children 中的容器/布局节点包裹在 $formkit: 'group' 中 */
function wrapFormChildren(schemaNode: FormKitSchemaFormKit): FormKitSchemaFormKit {
  const n: any = schemaNode as any
  if (!n || typeof n !== 'object') return schemaNode
  if (Array.isArray(n.children)) {
    n.children = n.children.map((child: any) => wrapNodeWithGroup(child))
  }
  return schemaNode
}

function wrapNodeWithGroup(node: any): any {
  if (!node || typeof node !== 'object') return node

  // 递归处理子节点
  if (Array.isArray(node.children)) {
    node.children = node.children.map((c: any) => wrapNodeWithGroup(c))
  }

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
  const original = { ...node }
  // 容器/布局自身不再携带 name（由外层 group 提供）
  if (original.props && original.props.name) delete original.props.name
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

export interface SchemaToDslOptions {
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
    const only = schema[0] as any
    if (only?.$formkit === 'form' && Array.isArray(only.children)) {
      if (typeof only.name === 'string' && only.name.trim()) name = only.name
      if (typeof only.props?.id === 'string' && only.props.id.trim()) id = only.props.id
      if (Number.isFinite(Number(only.props?.version))) version = Number(only.props.version)
      Object.assign(settings, parseFormSettings(only.props))
      children = only.children
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
        if (
          oldSchema &&
          JSON.stringify(schemaChildrenOf(oldSchema)) === JSON.stringify(newChildren)
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
