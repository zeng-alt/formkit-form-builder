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
    },
    children: rootChildren,
  }

  return [formNode as FormKitSchemaFormKit]
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
  const settings: FormSettings = { layout: 'vertical' }

  // 识别 $formkit: form 包装层
  if (schema.length === 1) {
    const only = schema[0] as any
    if (only?.$formkit === 'form' && Array.isArray(only.children)) {
      if (typeof only.name === 'string' && only.name.trim()) name = only.name
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
    version: DSL_VERSION,
    id: options?.id ?? generateKey(),
    name,
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
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

function parseFormSettings(props: unknown): Partial<FormSettings> {
  const p: any = props ?? {}
  const settings: Partial<FormSettings> = {}
  if (p.labelPosition === 'left' || p.labelPosition === 'top') settings.labelAlign = p.labelPosition
  if (Number.isFinite(Number(p.labelWidth))) settings.labelWidth = Number(p.labelWidth)
  if (Number.isFinite(Number(p.columns))) settings.columns = Number(p.columns)
  if (p.layout === 'horizontal' || p.layout === 'inline') settings.layout = p.layout
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
