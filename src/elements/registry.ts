// ═══ 元素公共访问层（基于统一 DSL 注册表）═══════════════════════════════════════
// 定义/面板/编辑器/默认元素 直接读 dsl/registry.ts 的统一注册表；
// FormKit input 注册与 $cmp schema 组件库见 ./formkit.ts，容器画布见 ./canvas.ts。

import type { Component } from 'vue'
import { defineAsyncComponent } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { getElementTypeDef, getElementTypeDefs, type ElementTypeDef } from '../dsl/registry'
import { registerBuiltinElementTypes } from '../dsl/definitions'
import type { SchemaNode } from '../dsl/convert-common'
import type { FormNode } from '../types/dsl'
import type { ElementDefinition, ElementPaletteProp } from './types'

// 确保内置 DSL 元素类型已在 fieldProps 创建前注册
registerBuiltinElementTypes()

export function getElementDefinition(type: string | null | undefined): ElementDefinition | null {
  if (!type) return null
  const def = getElementTypeDef(type)
  if (!def || !def.template) return null
  return {
    type: def.type,
    category: def.category,
    icon: def.icon ?? '',
    tooltipKey: def.tooltipKey ?? '',
    schema: def.template,
    editor: def.editor,
  }
}

export function getElementDefinitions(): ElementDefinition[] {
  return getElementTypeDefs()
    .filter((d) => d.template)
    .map((d) => ({
      type: d.type,
      category: d.category,
      icon: d.icon ?? '',
      tooltipKey: d.tooltipKey ?? '',
      schema: d.template!,
      editor: d.editor,
    }))
}

// ─── 右侧属性编辑器 ────────────────────────────────────────────────────────────

const editorCache = new Map<string, Component>()

export function getFieldEditorComponent(type: string | null | undefined): Component | null {
  const def = getElementTypeDef(type ?? undefined)
  if (!def?.editor) return null
  const cached = editorCache.get(type!)
  if (cached) return cached
  const component = defineAsyncComponent(def.editor)
  editorCache.set(type!, component)
  return component
}

// ─── 左侧面板物料 ──────────────────────────────────────────────────────────────

export function createFieldProps(t: (key: string) => string): ElementPaletteProp[] {
  return getElementTypeDefs()
    .filter((d) => d.template && d.icon)
    .map((d) => ({
      name: d.type,
      tooltip: t(d.tooltipKey ?? ''),
      icon: d.icon!,
      category: d.category,
    }))
}

// 未翻译版本（用于按 name 查找分类/图标）
export const fieldProps: ElementPaletteProp[] = createFieldProps((v) => v)

// ─── 画布默认元素（DSL 模板 → 翻译 → toSchema）─────────────────────────────────

function defaultDslNodeFromTemplate(def: ElementTypeDef, t: (key: string) => string): FormNode {
  const node = def.defaults()
  const tmpl = def.template!
  if (tmpl.nameKey) node.name = t(tmpl.nameKey)
  if (tmpl.labelKey) node.label = t(tmpl.labelKey)
  const props = { ...node.props }
  if (tmpl.placeholderKey) props.placeholder = t(tmpl.placeholderKey)
  if (tmpl.helpKey) props.help = t(tmpl.helpKey)
  // 按钮类静态元素：内容统一存 props.text（画布内联编辑 / 右侧"内容"输入框读写），
  // 首次拖入时用 label 文案播种，保证内容框与按钮显示一致
  if (
    tmpl.labelKey &&
    def.category === 'static' &&
    (def.type === 'submit' || def.type === 'reset' || def.type === 'naiveButton')
  ) {
    props.text = t(tmpl.labelKey)
  }
  node.props = Object.keys(props).length ? props : undefined
  return node
}

export function createDefaultFormElements(t: (key: string) => string): FormKitSchemaFormKit[] {
  // DSL 节点 → schema：容器/布局需先递归转换 children 再交给 toSchema，
  // 否则 ctx.children 为空，预置子节点（如 nestedList 内置 group）会被丢弃。
  const convert = (node: FormNode): SchemaNode => {
    const def = getElementTypeDef(node.type)
    const hasChildren =
      (node.category === 'container' || node.category === 'layout') &&
      Array.isArray((node as { children?: FormNode[] }).children)
    const children: SchemaNode[] | undefined = hasChildren
      ? (node as { children: FormNode[] }).children.map(convert)
      : undefined
    return def!.toSchema(node, { children })
  }
  const out: FormKitSchemaFormKit[] = []
  for (const def of getElementTypeDefs()) {
    if (!def.template) continue
    const node = defaultDslNodeFromTemplate(def, t)
    const schema = convert(node) as any
    // 面板展示元数据（副标题 / 便捷项图标）：仅左侧面板使用，标记为不可枚举，
    // 保证拖拽 payload 经 JSON 序列化（JSON.parse(JSON.stringify(...))）时不会带进 DSL。
    // description 若可枚举会泄漏进字段 props.description（DSL 里多出面板文案）。
    Object.defineProperty(schema, 'description', {
      value: t(def.template.descriptionKey),
      enumerable: false,
      configurable: true,
    })
    if (def.icon) {
      Object.defineProperty(schema, '__paletteIcon', {
        value: def.icon,
        enumerable: false,
        configurable: true,
      })
    }
    out.push(schema as FormKitSchemaFormKit)
  }
  return out
}

// ─── 由 schema 节点反查元素 type（走统一注册表 match）──────────────────────────

export function getElementTypeBySchema(node: unknown): string | undefined {
  const n: any = node
  if (!n || typeof n !== 'object') return undefined
  for (const def of getElementTypeDefs()) {
    if (def.match?.(n)) return def.type
  }
  return undefined
}

export type { ElementCategory, ElementDefinition, ElementPaletteProp, ElementEditor } from './types'
