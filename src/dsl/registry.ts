// ═══ 统一元素注册表 ════════════════════════════════════════════════════════════
// 每个元素类型（字段 / 容器 / 布局 / 静态）注册一条定义，同时驱动：
//   - DSL → FormKit schema（toSchema）
//   - FormKit schema → DSL（match + fromSchema）
//   - 新建节点的默认 DSL（defaults）
//   - 画布 / 预览 / 右侧编辑器（canvas / preview / editor）

import type { Component } from 'vue'
import type { FormNode, NodeCategory, FormDefinition, LayoutType } from '../types/dsl'
import { generateKey } from '../utils/dnd/schema'
import {
  fieldNodeToSchema,
  fieldNodeFromSchema,
  containerNodeToSchema,
  containerNodeFromSchema,
  layoutNodeToSchema,
  layoutNodeFromSchema,
  staticNodeToSchema,
  staticNodeFromSchema,
  tabsPaneToSchema,
  tabsPaneFromSchema,
  type SchemaNode,
  type ChildrenConvertCtx,
} from './convert-common'

export interface DslToSchemaCtx {
  form?: FormDefinition
  children?: SchemaNode[]
}

export interface ElementTypeDef {
  type: string
  category: NodeCategory
  /** $cmp 组件名：toSchema 时输出 $cmp: '<cmp>'（空则输出 $formkit: type） */
  cmp?: string
  /** 新建节点默认 DSL */
  defaults: () => FormNode
  toSchema: (node: FormNode, ctx: DslToSchemaCtx) => SchemaNode
  /** 反向识别：schema 是否属于该类型 */
  match?: (schema: SchemaNode) => boolean
  fromSchema?: (schema: SchemaNode, ctx: ChildrenConvertCtx) => FormNode | null
  normalize?: (schema: SchemaNode) => SchemaNode
  /** 画布容器组件 */
  canvas?: { libraryKey: string; component: Component }
  /** 预览容器组件 */
  preview?: { libraryKey: string; component: Component }
  editor?: () => Promise<{ default: Component }>
  icon?: string
  tooltipKey?: string
}

const defs = new Map<string, ElementTypeDef>()

export function registerElementType(def: ElementTypeDef): void {
  if (defs.has(def.type)) {
    throw new Error(`[formkit-form-builder] DSL 元素类型 "${def.type}" 重复注册`)
  }
  defs.set(def.type, def)
}

export function getElementTypeDef(type: string | undefined): ElementTypeDef | undefined {
  if (!type) return undefined
  return defs.get(type)
}

export function getElementTypeDefs(): ElementTypeDef[] {
  return Array.from(defs.values())
}

// ─── 构造器：字段 ───────────────────────────────────────────────────────────────

export function fieldType(type: string, extra?: Partial<ElementTypeDef>): ElementTypeDef {
  const cmp = extra?.cmp
  const def: ElementTypeDef = {
    type,
    category: 'field',
    defaults: () => ({ id: generateKey(), category: 'field', type }),
    toSchema: (node, _ctx) => fieldNodeToSchema(node as never, cmp),
    match: (s) => (s as any).$formkit === type || (cmp ? (s as any).$cmp === cmp : false),
    fromSchema: (s) => fieldNodeFromSchema(s, type),
    ...extra,
  }
  return def
}

// ─── 构造器：容器 ───────────────────────────────────────────────────────────────

export function containerType(
  type: string,
  extra?: Partial<ElementTypeDef> & { dataType?: 'object' | 'array' },
): ElementTypeDef {
  const dataType = extra?.dataType ?? 'object'
  const def: ElementTypeDef = {
    type,
    category: 'container',
    defaults: () => ({
      id: generateKey(),
      category: 'container',
      type,
      dataType,
      children: [],
    }),
    toSchema: (node, ctx) => containerNodeToSchema(node as never, ctx.children),
    match: (s) => s.$formkit === type || s.$cmp === type,
    fromSchema: (s, ctx) => containerNodeFromSchema(s, ctx),
    ...extra,
  }
  return def
}

// ─── 构造器：布局 ───────────────────────────────────────────────────────────────

export function layoutType(type: string, extra?: Partial<ElementTypeDef>): ElementTypeDef {
  const def: ElementTypeDef = {
    type,
    category: 'layout',
    defaults: () => ({
      id: generateKey(),
      category: 'layout',
      type: type as LayoutType,
      children: [],
    }),
    toSchema: (node, ctx) => layoutNodeToSchema(node as never, ctx.children),
    match: (s) => {
      const anyS: any = s
      if (type === 'card') return anyS.$cmp === 'card' || anyS.$formkit === 'card'
      if (type === 'tabs') return anyS.$cmp === 'tabs' || anyS.$formkit === 'tabs'
      if (type === 'grid')
        return (
          anyS.$el === 'div' &&
          typeof anyS.attrs?.class === 'string' &&
          String(anyS.attrs.class).includes('grid-cols')
        )
      if (type === 'row')
        return (
          anyS.$el === 'div' &&
          typeof anyS.attrs?.class === 'string' &&
          String(anyS.attrs.class).includes('flex-row')
        )
      if (type === 'column')
        return (
          anyS.$el === 'div' &&
          typeof anyS.attrs?.class === 'string' &&
          String(anyS.attrs.class).includes('flex-col')
        )
      return anyS.$cmp === type
    },
    fromSchema: (s, ctx) => layoutNodeFromSchema(s, ctx),
    ...extra,
  }
  return def
}

// ─── 构造器：静态 ───────────────────────────────────────────────────────────────

export function staticType(type: string, extra?: Partial<ElementTypeDef>): ElementTypeDef {
  const cmp = extra?.cmp
  const def: ElementTypeDef = {
    type,
    category: 'static',
    defaults: () => ({ id: generateKey(), category: 'static', type }),
    toSchema: (node, _ctx) => staticNodeToSchema(node as never, cmp),
    match: (s) => {
      const anyS: any = s
      if (cmp) {
        if (anyS.$cmp === cmp) return true
        if (anyS.$formkit === type) return true
        return false
      }
      if (type === 'submit') return anyS.$formkit === 'submit'
      return anyS.$el === type
    },
    fromSchema: (s) => staticNodeFromSchema(s, type),
    ...extra,
  }
  return def
}

// tabs 布局的 pane 特殊处理（非独立布局类型，由 tabs 容器内部使用）
export function tabsPaneType(): ElementTypeDef {
  return {
    type: 'tabsPane',
    category: 'layout',
    defaults: () => ({ id: generateKey(), category: 'layout', type: 'tabsPane', children: [] }),
    toSchema: (node, ctx) => tabsPaneToSchema(node as never, ctx.children),
    match: (s) => {
      const anyS: any = s
      return typeof anyS.__key === 'string' && !anyS.$formkit && !anyS.$cmp && !anyS.$el
    },
    fromSchema: (s, ctx) => tabsPaneFromSchema(s, ctx),
  }
}
