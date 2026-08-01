import { inject, provide } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'

export type CanvasSchemaContext = {
  library: Record<string, unknown>
  renderNode: (node: unknown) => unknown
  updateContainerChildren?: (containerKey: string, children: FormKitSchemaFormKit[]) => void
  selectByKey?: (key: string) => void
  /** 画布内联编辑写回：按 __key 给 schema 节点打补丁（如静态元素 text 内容） */
  updateNodePropsByKey?: (key: string, props: Record<string, unknown>) => void
}

const key: unique symbol = Symbol('canvas-schema-context')

export function provideCanvasSchemaContext(ctx: CanvasSchemaContext) {
  provide(key, ctx)
}

export function useCanvasSchemaContext() {
  return inject<CanvasSchemaContext | null>(key, null)
}
