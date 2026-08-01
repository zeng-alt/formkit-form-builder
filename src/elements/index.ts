// 元素注册中心：统一 DSL 注册表（src/dsl/registry.ts）之上的公共访问层。
// 元素目录（elements/definitions/*）为纯数据，经 dsl/definitions.ts 注册；
// 渲染层绑定：formkit.ts（字段/静态组件）、canvas.ts（容器画布/预览）。
export * from './types'
export * from './constants'
export {
  getElementDefinition,
  getElementDefinitions,
  getFieldEditorComponent,
  createFieldProps,
  fieldProps,
  createDefaultFormElements,
  getElementTypeBySchema,
} from './registry'
export {
  buildFormkitInputs,
  buildElementSchemaLibrary,
  getElementCmpName,
  registerFormkitBinding,
  getFormkitBinding,
  SHARED_FORMKIT_PROPS,
  BUTTON_PROPS,
  formkitBindings,
} from './formkit'
export {
  getContainerDefinition,
  normalizeContainerNode,
  formatContainerPreviewNode,
  getCanvasSchemaLibrary,
  getPreviewSchemaLibrary,
  registerContainerDefinition,
} from './canvas'
export type { ContainerDefinition, ContainerFormatCtx } from './canvas'
export type { FormkitBinding } from './formkit'
