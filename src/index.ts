import 'uno.css'
import './style.css'
import FormBuilder from './builder/BuilderMain.vue'
import BuilderPreview from './builder/BuilderPreview.vue'
import BuilderProvider from './builder/BuilderProvider.vue'
import FormSchemaRenderer from './renderer/FormSchemaRenderer.vue'

export {
  useFormBuilderConfig,
  provideFormBuilderConfig,
  setGlobalFormBuilderConfig,
} from './composables/use-config'
export type { FormBuilderConfig } from './types/env'
export type {
  FormNode,
  FieldNode,
  ContainerNode,
  StaticNode,
  FormDefinition,
  NodeCategory,
  RenderKind,
  LayoutNode,
  LayoutType,
  FormSettings,
} from './types/dsl'
// 自定义主题：FormBuilder / FormRenderer 共用的 theme prop 类型
export type { BuilderTheme } from './types/theme'
// 元素模板 / 目录类型（编写扩展元素用）
export type { ElementTemplate, ElementCatalogEntry, ElementTypeDef, DslToSchemaCtx } from './dsl/registry'
export type { ElementDefinition, ElementCategory, ElementPaletteProp } from './elements'
export type {
  RendererEngine as IRendererEngine,
  RendererPlugin,
  RenderContext,
  FieldRenderer,
  ContainerRenderer,
  StaticRenderer,
} from './types/renderer'

// 元素扩展（配置式）：registerElement / config.elements + FormKit 插件装配
export { registerElement, registerElements } from './plugin/register-element'
export type { RegisterElementInput } from './plugin/register-element'
export { formkitConfig } from './formkit.config'
export { buildFormkitInputs, buildElementSchemaLibrary, getElementCmpName } from './elements'

export { FormBuilder, BuilderProvider }
export { BuilderPreview }
// 表单操作器：FormRenderer 为主名，FormSchemaRenderer 保留为废弃别名。
// @deprecated 使用 FormRenderer
export { FormSchemaRenderer as FormRenderer, FormSchemaRenderer }
export { FormBuilder as FormKitFormBuilder }
export { BuilderProvider as FormBuilderProvider }

// 实例状态（多设计器并存 / 高级用法）
export {
  useFormBuilderState,
  provideFormBuilderState,
  createFormBuilderState,
} from './state/create-form-builder-state'
export type { FormBuilderState } from './state/create-form-builder-state'

// 一键接入插件：app.use(FormBuilderPlugin, { config })
export { FormBuilderPlugin } from './plugin/form-builder-plugin'
export type { FormBuilderPluginOptions } from './plugin/form-builder-plugin'

// DSL 转换工具（含 group 包裹的结构化输出）
export { dslToSchema, dslToOutputSchema, schemaToDsl } from './dsl'
