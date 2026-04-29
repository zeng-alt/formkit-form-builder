import FormBuilder from './builder/BuilderMain.vue'
import BuilderPreview from './builder/BuilderPreview.vue'
import BuilderProvider from './builder/BuilderProvider.vue'
import FormSchemaRenderer from './renderer/FormSchemaRenderer.vue'

export { useFormBuilderConfig, provideFormBuilderConfig } from './composables/use-config'
export type { FormBuilderConfig } from './types/env'
export type {
  FormDslDocument,
  DslNode,
  DslCondition,
  DslOperator,
  DslLayout,
  DslLogic,
  DslRules,
  DslExpr,
} from './dsl/types'
export { dslToFormKitSchema } from './dsl/compiler'

export { FormBuilder, BuilderProvider }
export { BuilderPreview, FormSchemaRenderer }
export { FormBuilder as FormKitFormBuilder }
export { BuilderProvider as FormBuilderProvider }
