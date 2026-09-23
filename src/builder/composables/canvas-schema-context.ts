import { inject, provide } from 'vue'
import type { Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'

type CanvasSchemaContext = {
  library: Record<string, Component>
  /** 按源节点身份缓存的单元素 schema 数组（见 use-canvas-schema.ts），
   *  同一个源节点每次调用得到同一个数组引用，供 FormKitSchema 的 schema prop 直接使用 */
  renderNode: (node: unknown) => unknown[]
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
