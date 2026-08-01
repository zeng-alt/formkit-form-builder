import FormBuilder from './builder/BuilderMain.vue'
import BuilderPreview from './builder/BuilderPreview.vue'
import BuilderProvider from './builder/BuilderProvider.vue'
import FormSchemaRenderer from './renderer/FormSchemaRenderer.vue'

export { useFormBuilderConfig, provideFormBuilderConfig } from './composables/use-config'
export type { FormBuilderConfig } from './types/env'
export type { FormNode, FieldNode, ContainerNode, StaticNode, FormDefinition } from './types/dsl'
export type {
  RendererEngine as IRendererEngine,
  RendererPlugin,
  RenderContext,
  FieldRenderer,
  ContainerRenderer,
  StaticRenderer,
} from './types/renderer'

export { FormBuilder, BuilderProvider }
export { BuilderPreview, FormSchemaRenderer }
export { FormBuilder as FormKitFormBuilder }
export { BuilderProvider as FormBuilderProvider }
