// ═══ 渲染入口:@zeng-alt/formkit-form-builder/renderer ═══════════════════════════
// 只给"填写表单"的页面用:渲染 DSL / 提交数据,不含设计器(画布、左右侧面板)。
// 产物里不应出现:BuilderMain/画布/侧边栏、@formkit/drag-and-drop、src/utils/dnd、
// AiPrompt、@codemirror/*——见 build-tools/check-bundle.mjs 的体积守护检查。
//
// FormRenderer.vue 内部用到的 getPreviewSchemaLibrary（来自 elements/canvas.ts）只
// 静态引入容器的"预览版"组件,画布版组件（依赖拖拽库）被拆到 elements/canvas-designer.ts,
// 这个入口不引入那个文件,因此不会连带拖入 @formkit/drag-and-drop。
import 'uno.css'
import './style.css'
import FormRenderer from './renderer/FormRenderer.vue'

export { FormRenderer }

// 配置：prop 优先、否则回落注入（BuilderProvider 或 FormRenderer 自身 config prop）
export {
  useFormBuilderConfig,
  provideFormBuilderConfig,
  setGlobalFormBuilderConfig,
} from './composables/use-config'
export type { FormBuilderConfig } from './types/env'

// DSL 类型：描述表单结构，填写表单的页面构造/解析 FormDefinition 时需要
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
export type { BuilderTheme } from './types/theme'

// 元素扩展（配置式）：渲染自定义元素类型需要先 registerElement 打通渲染绑定
export { registerElement, registerElements } from './plugin/register-element'
export type { RegisterElementInput } from './plugin/register-element'
export type {
  ElementTemplate,
  ElementCatalogEntry,
  ElementTypeDef,
  DslToSchemaCtx,
} from './dsl/registry'
export type { ElementDefinition, ElementCategory, ElementPaletteProp } from './elements'

// FormKit 装配：app.use(plugin, formkitConfig())；buildFormkitInputs/
// buildElementSchemaLibrary/getElementCmpName 是自定义渲染管线时的底层积木
export { formkitConfig } from './formkit.config'
export { buildFormkitInputs, buildElementSchemaLibrary, getElementCmpName } from './elements'

// 字段/容器按需加载：日期/数据表格/级联等重型组件默认懒加载（见
// elements/component-loader.ts），FormRenderer 内部已经会在渲染前自动预取；
// 这里额外导出给自定义渲染管线——想在展示表单前提前把即将用到的类型取到缓存里
// （避免用户看到加载态），可以自行 collectElementTypes(definition) 后调用它。
export { preloadElementComponents, collectElementTypes } from './elements/component-loader'

// 一键接入插件：app.use(FormBuilderPlugin, { config })。install 只做 FormKit 装配 +
// 元素注册 + 全局配置，不依赖设计器，渲染专用页面同样可以用它简化接入。
export { FormBuilderPlugin } from './plugin/form-builder-plugin'
export type { FormBuilderPluginOptions } from './plugin/form-builder-plugin'

// DSL 转换工具（含 group 包裹的结构化输出）
export { dslToSchema, dslToOutputSchema, schemaToDsl } from './dsl'
// 后端持久化前剥离前端专用字段（key / meta.rawSchema）
export { toPortableDefinition } from './dsl'
// today() 表达式的语言 → 时区映射
export { setExprLocale, resolveTimeZoneForLocale, LOCALE_TIME_ZONES } from './dsl'
