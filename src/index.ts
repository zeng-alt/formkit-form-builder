import FormBuilder from './builder/BuilderMain.vue'
import BuilderPreview from './builder/BuilderPreview.vue'
import BuilderProvider from './builder/BuilderProvider.vue'
import FormSchemaRenderer from './renderer/FormSchemaRenderer.vue'

export { useFormBuilderConfig, provideFormBuilderConfig } from './composables/use-config'
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
export { BuilderPreview, FormSchemaRenderer }
export { FormBuilder as FormKitFormBuilder }
export { BuilderProvider as FormBuilderProvider }

// DSL 转换工具（含 group 包裹的结构化输出）
export { dslToSchema, dslToOutputSchema, schemaToDsl } from './dsl'
