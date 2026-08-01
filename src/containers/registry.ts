// 兼容转发：容器渲染层已并入 src/elements/canvas.ts（统一注册表）。
import {
  getContainerDefinition,
  normalizeContainerNode,
  getCanvasSchemaLibrary,
  getPreviewSchemaLibrary,
  formatContainerPreviewNode,
} from '@/elements/canvas'
export type { ContainerDefinition, ContainerFormatCtx } from '@/elements/canvas'

export {
  getContainerDefinition,
  normalizeContainerNode,
  getCanvasSchemaLibrary,
  getPreviewSchemaLibrary,
  formatContainerPreviewNode,
}
