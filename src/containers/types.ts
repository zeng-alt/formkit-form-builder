import type { Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'

export type SchemaNode = FormKitSchemaFormKit & Record<string, unknown>

export type ContainerFormatCtx = {
  key?: string
  isPlaceholder: boolean
  format: (node: FormKitSchemaFormKit, index: number) => FormKitSchemaFormKit
}

export type ContainerDefinition = {
  id: string
  match: (node: unknown) => boolean
  canvas?: { libraryKey: string; component: Component }
  preview?: { libraryKey: string; component: Component }
  normalize?: (node: SchemaNode) => SchemaNode
  formatPreview?: (node: SchemaNode, ctx: ContainerFormatCtx) => FormKitSchemaFormKit
}

