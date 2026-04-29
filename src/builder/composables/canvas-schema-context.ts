import { inject, provide } from 'vue'
import type { DslNode } from '@/dsl/types'

export type CanvasSchemaContext = {
  library: Record<string, unknown>
  updateContainerChildren?: (containerKey: string, children: DslNode[]) => void
  selectByKey?: (key: string) => void
}

const key: unique symbol = Symbol('canvas-schema-context')

export function provideCanvasSchemaContext(ctx: CanvasSchemaContext) {
  provide(key, ctx)
}

export function useCanvasSchemaContext() {
  return inject<CanvasSchemaContext | null>(key, null)
}
