import type { Component } from 'vue'
import { defineAsyncComponent } from 'vue'
import { createInput } from '@formkit/vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ElementCategory, ElementDefinition, ElementPaletteProp, ElementSchemaDef } from './types'

const defs = new Map<string, ElementDefinition>()

export function registerElement(def: ElementDefinition): void {
  if (defs.has(def.type)) {
    throw new Error(`[formkit-form-builder] 元素 "${def.type}" 重复注册`)
  }
  defs.set(def.type, def)
}

export function registerElements(list: ElementDefinition[]): void {
  for (const def of list) registerElement(def)
}

export function getElementDefinition(type: string | null | undefined): ElementDefinition | null {
  if (!type) return null
  return defs.get(type) ?? null
}

export function getElementDefinitions(): ElementDefinition[] {
  return Array.from(defs.values())
}

// ─── 右侧属性编辑器 ────────────────────────────────────────────────────────────

const editorCache = new Map<string, Component>()

export function getFieldEditorComponent(type: string | null | undefined): Component | null {
  const def = getElementDefinition(type)
  if (!def?.editor) return null
  const cached = editorCache.get(type!)
  if (cached) return cached
  const component = defineAsyncComponent(def.editor)
  editorCache.set(type!, component)
  return component
}

// ─── 左侧面板物料 ──────────────────────────────────────────────────────────────

export function createFieldProps(t: (key: string) => string): ElementPaletteProp[] {
  return getElementDefinitions().map((d) => ({
    name: d.type,
    tooltip: t(d.tooltipKey),
    icon: d.icon,
    category: d.category,
  }))
}

// 未翻译版本（用于按 name 查找分类/图标）
export const fieldProps: ElementPaletteProp[] = createFieldProps((v) => v)

// ─── 画布默认元素 ──────────────────────────────────────────────────────────────

function resolveSchemaI18n(
  { nameKey, labelKey, placeholderKey, helpKey, descriptionKey, ...rest }: ElementSchemaDef,
  t: (key: string) => string,
): FormKitSchemaFormKit {
  const next: any = {
    ...(rest as FormKitSchemaFormKit),
    name: t(nameKey),
    description: t(descriptionKey),
  }
  const isCmp = typeof next.$cmp === 'string' && Boolean(next.$cmp)

  const setText = (targetKey: 'label' | 'placeholder' | 'help', value: string | undefined) => {
    if (!value) return
    if (isCmp) next.props = { ...next.props, [targetKey]: value }
    else next[targetKey] = value
  }

  setText('label', labelKey ? t(labelKey) : undefined)
  setText('placeholder', placeholderKey ? t(placeholderKey) : undefined)
  setText('help', helpKey ? t(helpKey) : undefined)
  return next
}

export function createDefaultFormElements(t: (key: string) => string): FormKitSchemaFormKit[] {
  return getElementDefinitions().map((d) => resolveSchemaI18n(d.schema, t))
}

// ─── FormKit input 注册（画布/预览渲染）────────────────────────────────────────

export const SHARED_FORMKIT_PROPS = [
  'props',
  '__bind',
  'placeholder',
  'options',
  'min',
  'max',
  'step',
  'multiple',
  'accept',
]

export function buildFormkitInputs(): Record<string, ReturnType<typeof createInput>> {
  const inputs: Record<string, ReturnType<typeof createInput>> = {}
  for (const def of defs.values()) {
    const f = def.formkit
    if (!f) continue
    const family = f.family ?? 'naive'
    const props = f.props ?? SHARED_FORMKIT_PROPS

    if (f.wrap === false) {
      inputs[def.type] = createInput(f.component, { family, props })
      continue
    }

    const libraryName = f.libraryName ?? def.type
    inputs[def.type] = createInput(
      {
        $el: 'div',
        attrs: { class: 'w-full' },
        children: [
          {
            $cmp: libraryName,
            props: { context: '$node.context' },
          },
        ],
      },
      {
        family,
        props,
        library: { [libraryName]: f.component },
      },
    )
  }
  return inputs
}

export type { ElementCategory, ElementDefinition, ElementPaletteProp, ElementSchemaDef }
