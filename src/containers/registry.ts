import { markRaw } from 'vue'
import type { Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ContainerDefinition, SchemaNode } from './types'
import { listContainerDef } from './definitions/list'
import { cardContainerDef } from './definitions/card'
import { inputGroupContainerDef } from './definitions/input-group'
import { tabsContainerDef } from './definitions/tabs'

const defs: ContainerDefinition[] = [listContainerDef, cardContainerDef, inputGroupContainerDef, tabsContainerDef]

export function getContainerDefinition(node: unknown): ContainerDefinition | null {
  for (const def of defs) {
    if (def.match(node)) return def
  }
  return null
}

export function normalizeContainerNode(node: unknown): unknown {
  const def = getContainerDefinition(node)
  if (!def?.normalize) return node
  return def.normalize(node as SchemaNode)
}

export function getCanvasSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = {}
  for (const def of defs) {
    if (!def.canvas) continue
    lib[def.canvas.libraryKey] = markRaw(def.canvas.component) as unknown as Component
  }
  return lib
}

export function getPreviewSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = {}
  for (const def of defs) {
    if (!def.preview) continue
    lib[def.preview.libraryKey] = markRaw(def.preview.component) as unknown as Component
  }
  return lib
}

export function formatContainerPreviewNode(
  node: unknown,
  ctx: { key?: string; isPlaceholder: boolean; format: (n: FormKitSchemaFormKit, i: number) => FormKitSchemaFormKit },
): FormKitSchemaFormKit | null {
  const def = getContainerDefinition(node)
  if (!def?.formatPreview) return null
  return def.formatPreview(node as SchemaNode, ctx)
}
