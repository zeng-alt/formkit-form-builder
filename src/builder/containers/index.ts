import { getCanvasSchemaLibrary } from '@/elements/canvas'
// 副作用导入：注册画布容器组件（依赖 @formkit/drag-and-drop，见 canvas-designer.ts
// 顶部说明）+ 右侧属性面板的编辑器组件（可能依赖 CodeMirror，见 editor-bindings.ts
// 顶部说明），都必须先于下面取值执行——这是唯一引入这两个文件的地方，渲染入口不引入。
import '@/elements/canvas-designer'
import '@/elements/definitions/editor-bindings'

export const canvasSchemaLibrary = getCanvasSchemaLibrary()
