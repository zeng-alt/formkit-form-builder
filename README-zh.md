# formkit-form-builder

**中文文档** | [English](./README.md)

基于 Vue 3 + FormKit 的可视化表单 Schema 设计器（左侧物料库 / 中间画布 / 右侧属性面板），支持拖拽搭建、校验配置、预览，以及可选的 AI 生成 Schema。

核心概念：设计器产出的是**版本化 DSL（`FormDefinition`）**而非裸 schema，通过 `FormRenderer`（内部 `dslToSchema` 转换）渲染成 FormKit 表单。DSL 主体是 JSON-safe 的结构，后端（如 Java）可直接反序列化；其中 `key`（画布 DnD 身份）与 `meta.rawSchema`（未注册类型兜底）是前端专用字段，持久化前建议先用 `toPortableDefinition` 剥离（见下文「DSL 与转换」）。

## 功能一览

- **元素**：字段 / 容器 / 静态三大类（完整清单见 `src/elements/definitions/*`），除常见输入控件外还包含富文本、签名板、折叠面板、数据表格等。
- **画布**：从左侧物料库拖入元素、选中时的浮动工具条、右键菜单、复制 / 剪切 / 粘贴、多选（Shift 或 Ctrl/Cmd+点击逐个加入 / 移出，限同一容器内的兄弟元素）与批量设置、把选中元素包进容器、把元素转换为兼容的其他类型。
- **结构树联动**：左侧结构树与画布选中状态实时同步。
- **撤销历史面板**：除了 Ctrl/Cmd+Z / Shift+Z 之外，还能在历史面板里浏览并跳回任意一步。
- **模板与空画布引导**：内置请假申请、联系表单、员工登记、用户注册、满意度调查等起始模板，空画布时给出引导。
- **表单级设置**：控件尺寸、整表禁用 / 只读、提交成功提示与跳转、是否显示重置按钮、提交 / 重置按钮文案。
- **逻辑**：条件显示、条件必填 / 禁用 / 只读、表达式计算字段值。
- **校验规则**：按字段类型提供可配置的规则库（完整规则清单见 `docs/dsl.md` / `docs/dsl.en.md`）。
- **表单体检**：一键扫描常见问题（如条件引用了不存在的字段），点击问题可定位到对应元素。
- **改名同步引用**：给字段改名后，表单里所有引用它的 `visibleIf` / `requiredIf` / `disabledIf` / `readonlyIf` / `expr` 自动同步更新。
- **导入导出**：表单定义可导出为 JSON，也可从 JSON 导入。
- **多端预览**：桌面 / 平板 / 手机三种视口宽度预览表单。
- **暗色主题**：内置浅色 / 深色 / 跟随系统切换，与 UnoCSS 的 `dark:` 样式保持同步。

## 安装

```bash
pnpm i @zeng-alt/formkit-form-builder
```

本库依赖以下 peer 依赖（需要你在项目里自行安装）。以下为**必装**依赖：

```bash
pnpm i vue naive-ui @vueuse/core @formkit/core @formkit/vue @formkit/i18n
```

以下依赖仅在使用设计器的表达式 / JS 绑定编辑器时才需要（用于驱动基于 CodeMirror 的代码编辑面板）：

```bash
pnpm i @codemirror/autocomplete @codemirror/commands @codemirror/lang-javascript @codemirror/language @codemirror/lint @codemirror/state @codemirror/theme-one-dark @codemirror/view
```

> 为什么这些包是 `peerDependencies` 而不是直接打进产物？是为了让本库与你的项目**共用同一份实例**。FormKit 在每份模块实例内部维护全局的节点 / 插件 / input 类型 / i18n locale 注册表，两份 `@formkit/core`（你项目里一份 + 本库内打包一份）互相不认识对方注册的内容，字段可能悄悄渲染不出来或校验失效；CodeMirror 则会主动检测同一页面内是否存在多份 `@codemirror/state` 实例，一旦发现就直接抛错，代码编辑器会直接不可用。把这些包作为 peer 依赖装在你的项目里，能保证全局只加载一份。

## 样式引入

ESM 入口会自动加载样式，无需手动引入。仅在使用 UMD / script-tag 时需手动引入：

```ts
import '@zeng-alt/formkit-form-builder/builder.css'
```

## 渲染入口（只填写表单的页面）

如果你的页面只需要把已保存的 `FormDefinition` 渲染成可填写、可提交的表单——不需要拖拽画布、不需要左右侧属性面板——可以改用只含运行时渲染能力的子路径 `@zeng-alt/formkit-form-builder/renderer`：

```ts
import {
  FormRenderer,
  formkitConfig,
  registerElement,
  dslToSchema,
  useFormBuilderConfig,
} from '@zeng-alt/formkit-form-builder/renderer'
import type { FormDefinition } from '@zeng-alt/formkit-form-builder/renderer'
```

样式仍然用同一份 `@zeng-alt/formkit-form-builder/builder.css`（不需要单独引入其他 CSS）。这个入口导出的是「填写表单的页面用得到的」那部分 API：`FormRenderer`、`formkitConfig`、`FormBuilderPlugin`、`registerElement`/`registerElements`、`buildFormkitInputs`/`buildElementSchemaLibrary`/`getElementCmpName`、DSL 转换工具（`dslToSchema`/`dslToOutputSchema`/`schemaToDsl`/`toPortableDefinition`/`setExprLocale` 等）、配置相关的 composable，以及对应的类型——不包含设计器（画布、左右侧面板）、拖拽库 `@formkit/drag-and-drop`、CodeMirror 代码编辑器。示例见 `playground/renderer-only.html`。

实测体积（`pnpm build-only` 产物，gzip）：

| 产物 | 首屏静态依赖合计（gzip） |
| --- | --- |
| 完整入口 `.`（设计器 + 渲染器） | 167.2KB |
| 渲染入口 `./renderer` | **70.3KB** |

对只填表单的页面来说，改用 `/renderer` 能少加载约 97KB（gzip）的设计器专属代码。

体积较大的字段/容器组件（日期/时间/文件/颜色、级联/树选择/穿梭框/提及/自动完成/评分、富文本/签名、滑块/头像/图片、二维码/进度条/提示/返回顶部，以及数据表格的预览组件）都改成按需加载，表单里只用到文本/下拉/复选框这类轻量字段时完全不会加载它们。在使用方工程里，一个只填文本类字段的表单页面，首屏 JS 里 naive-ui 部分能从约 732KB 降到 300KB 以内（gzip 后首屏 JS 总量从约 422KB 降到约 280KB），完整前后对比见任务报告。

## 快速开始

### 1) 安装并注册 FormKit

使用库内置的 `formkitConfig()` 工厂（会自动注册全部内置元素），完成 FormKit 装配：

```ts
// main.ts
import { createApp } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import { formkitConfig } from '@zeng-alt/formkit-form-builder'
import App from './App.vue'

createApp(App).use(formkitPlugin, formkitConfig()).mount('#app')
```

> 也可以直接用一键插件 `FormBuilderPlugin`（自动装配 FormKit + 全局配置 + 元素注册），见下文。

### 2) 使用 FormBuilder

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FormBuilder, BuilderProvider } from '@zeng-alt/formkit-form-builder'
import type { FormDefinition } from '@zeng-alt/formkit-form-builder'

const definition = ref<FormDefinition>()
const config = {
  apiKey: '', // 可选：AI 面板使用 OpenAI 时需要。生产环境不要把真实密钥下发到浏览器，
  // 应改用 `aiBaseUrl` 指向自建服务端代理，见下方"安全说明"。
}
</script>

<template>
  <BuilderProvider :config="config">
    <FormBuilder v-model="definition" />
  </BuilderProvider>
</template>
```

`FormBuilder` 通过 `v-model` 双向绑定 `FormDefinition`：预载已有表单并实时吐出编辑结果，可直接保存到后端。

> 经 `update:modelValue` 吐出的定义视为不可变（开发构建下会被深度冻结）：请勿原地修改，需要改动时先拷贝一份。设计器依靠这一点在编辑之间保持未改动节点的对象身份，从而只重渲染发生变化的部分。

### 3) 渲染表单

`FormRenderer` 渲染 `FormDefinition` 为可填写、可提交的 FormKit 表单：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FormRenderer } from '@zeng-alt/formkit-form-builder'
import type { FormDefinition } from '@zeng-alt/formkit-form-builder'

const definition = ref<FormDefinition>()
const data = ref({})
</script>

<template>
  <FormRenderer
    :definition="definition"
    v-model="data"
    :actions="true"
    @submit="(v) => console.log(v)"
  />
</template>
```

- `definition`：主输入（版本化 DSL）；也可用 `schema` 直接传裸 FormKit schema（二选一，同传时优先 `definition`）。
- `dataStructure`：`'flat'`（默认，扁平输出）| `'nested'`（容器转 group 嵌套）。字段引用（`visibleIf` / `expr`）按字段名在整棵表单数据里解析，flat 与 nested 两种模式行为一致；跨容器引用字段时，建议让字段名保持全局唯一（重名取第一个命中）。
- 其余可选 props：`formName`、`labelPosition`（`'top' | 'left'`）、`labelWidth`、`formClass`、`interactiveContainers` 等。
- **主题**：主题的唯一来源是 `BuilderProvider`（渲染一个 `n-config-provider`），支持 `theme` prop（`BuilderTheme`：`'light' | 'dark'`，缺省自动跟随系统）+ 其余 `ConfigProviderProps`（`themeOverrides` / `breakpoints` 等）透传。`FormBuilder` / `FormRenderer` 作为子树继承 Provider 的主题，保证两者一致；二者各自也保留独立的 `theme` / `ConfigProviderProps` prop（仅当未被 `BuilderProvider` 包裹、独立使用时生效）。内置 `ThemeSwitcher`（深色 / 浅色 / 跟随系统）与 `theme` prop 共用同一个 `useColorMode` 数据源，naive-ui 主题与 UnoCSS 的 `dark:` 样式始终一致。
- **locale**：读取所在 `BuilderProvider` / `FormBuilder` 提供的运行时代码（缺省 `zh-CN`），同步 FormKit 提交按钮与校验文案；也可用 `:locale` / `:date-locale` 直接传 naive 语言包覆盖。

`FormRenderer` 可与 `FormBuilder` 一起放在 `BuilderProvider` 内配合使用（共享 `config.locale` / 元素注册 / 主题），主题只需在 Provider 上配一次，两者保持一致：

```vue
<BuilderProvider :config="config" :theme="isDark ? 'dark' : 'light'">
  <div class="grid grid-cols-2">
    <FormBuilder v-model="definition" />
    <FormRenderer :definition="definition" />
  </div>
</BuilderProvider>
```

## 一键接入插件

不想手动 `app.use(plugin, formkitConfig())` + 套 `BuilderProvider` 时，可用 `FormBuilderPlugin` 一步完成：

```ts
// main.ts
import { createApp } from 'vue'
import { FormBuilderPlugin } from '@zeng-alt/formkit-form-builder'
import App from './App.vue'

createApp(App)
  .use(FormBuilderPlugin, {
    config: { apiKey: '' },
  })
  .mount('#app')
```

```vue
<template>
  <!-- 无需 BuilderProvider，直接用 -->
  <FormBuilder v-model="definition" />
  <FormRenderer :definition="definition" />
</template>
```

## 键盘快捷键

以下快捷键在焦点位于设计器画布根元素内时生效（在文本输入框、代码编辑器、弹窗内输入时不生效）；删除 / 复制一份 / 复制等操作作用于当前选中元素。

| 操作            | Windows / Linux             | macOS                      |
| --------------- | --------------------------- | -------------------------- |
| 删除选中元素    | `Delete` / `Backspace`      | `Delete` / `Backspace`     |
| 撤销            | `Ctrl+Z`                    | `Cmd+Z`                    |
| 重做            | `Ctrl+Shift+Z` 或 `Ctrl+Y`  | `Cmd+Shift+Z` 或 `Cmd+Y`   |
| 原地复制一份    | `Ctrl+D`                    | `Cmd+D`                    |
| 复制            | `Ctrl+C`                    | `Cmd+C`                    |
| 剪切            | `Ctrl+X`                    | `Cmd+X`                    |
| 粘贴            | `Ctrl+V`                    | `Cmd+V`                    |
| 清空多选        | `Esc`                       | `Esc`                      |
| 加入 / 移出多选 | `Shift`+点击 或 `Ctrl`+点击 | `Shift`+点击 或 `Cmd`+点击 |

画布的浮动工具条与右键菜单也提供同一批操作（并额外提供「包进容器」「转换为」其他类型），顶栏也有撤销 / 重做按钮。

## API

### 导出清单

```ts
import {
  FormBuilder, // 设计器主组件
  FormBuilderProvider, // BuilderProvider 别名
  BuilderProvider, // 全局配置提供者
  BuilderPreview, // 可复用弹窗预览组件
  FormDefinitionPreview, // 独立分栏预览组件：左侧渲染表单、右侧实时展示数据
  FormRenderer, // 表单渲染组件
  FormBuilderPlugin, // 一键接入插件
  formkitConfig, // FormKit 装配工厂（可传扩展元素）
  registerElement, // 配置式扩展元素
  registerElements,
  setGlobalFormBuilderConfig, // 全局配置（插件/无 Provider 场景）
  useFormBuilderConfig,
  provideFormBuilderConfig,
  createFormBuilderState, // 多设计器实例状态
  useFormBuilderState,
  useOptionalFormBuilderState, // 可选版本：供脱离 FormBuilder/FormRenderer 子树使用的组件调用
  provideFormBuilderState,
  dslToSchema, // DSL → FormKit schema
  dslToOutputSchema, // DSL → 嵌套 group 输出 schema
  schemaToDsl, // 裸 schema → DSL
  toPortableDefinition, // 持久化前剥离前端专用字段（见下文「DSL 与转换」）
  buildFormkitInputs,
  buildElementSchemaLibrary, // 元素 $cmp → 组件库（进阶：自定义 schemaLibrary 时用）
  getElementCmpName, // 元素类型 → 对应的 $cmp 渲染名
  CanvasActionsBar, // #toolbar 默认内容（导入导出 / 语言切换），可在 #toolbar 插槽复用
} from '@zeng-alt/formkit-form-builder'
```

`FormKitFormBuilder`、`FormBuilderProvider` 分别是 `FormBuilder`、`BuilderProvider` 的别名导出，
仅为命名习惯提供，两组各自完全等价。`setExprLocale` / `resolveTimeZoneForLocale` /
`LOCALE_TIME_ZONES` 也一并导出（见下文「i18n 覆写」）。

> 只需要渲染表单、不需要设计器？`@zeng-alt/formkit-form-builder/renderer` 导出上面这份清单里
> 「填写表单用得到」的那部分（`FormRenderer`、`formkitConfig`、`FormBuilderPlugin`、
> `registerElement`/`registerElements`、DSL 转换工具、配置相关的 composable），不含设计器本身
> 及其 CodeMirror / 拖拽库依赖——见上文「渲染入口」一节。

`useFormBuilderState()` 只能在 `FormBuilder` / `FormRenderer` 子树内调用（含手动
`provideFormBuilderState()` 的子树）；子树外调用会直接抛错，不再回落到某个全局共享实例。
需要脱离 `FormBuilder` 独立使用的组件请改用 `useOptionalFormBuilderState()`，子树外它返回
`null`。特别地，`BuilderPreview` 独立使用（不在 `FormBuilder` 内）时需要传入 `schema` prop，
否则没有可渲染的表单结构。

### FormBuilder API

#### Props

| 属性                     | 类型                                 | 默认值       | 说明                                                                                    |
| ------------------------ | ------------------------------------ | ------------ | --------------------------------------------------------------------------------------- |
| `modelValue`             | `FormDefinition`                     | -            | 表单定义：v-model 双向绑定，预载已有表单并实时吐出编辑结果                              |
| `config`                 | `FormBuilderConfig`                  | -            | 本实例配置；传了则自给（registerElements + provide），不传回落外层 BuilderProvider 注入 |
| `theme`                  | `BuilderTheme` (`'light' \| 'dark'`) | 自动跟随系统 | 自定义主题：内部映射到 naive-ui 的 darkTheme / lightTheme                               |
| `...ConfigProviderProps` | `Partial<ConfigProviderProps>`       | -            | naive-ui ConfigProvider 其余属性透传（`themeOverrides`、`breakpoints` 等）              |

#### Events

| 事件                | 参数                    | 说明                                                                         |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `update:modelValue` | `value: FormDefinition` | 表单定义变更时触发（v-model 双向绑定）。视为不可变，见上文说明，请勿原地修改 |

#### Slots

| 插槽名          | 作用域 | 说明                                            |
| --------------- | ------ | ----------------------------------------------- |
| `header`        | -      | 整个顶栏（含默认内容）                          |
| `header-left`   | -      | 顶栏左侧区（清除 / 预览），不传则用默认         |
| `header-center` | -      | 顶栏中间区（AI 提示），不传则用默认             |
| `header-right`  | -      | 顶栏右侧区（undo/redo / 主题），不传则用默认    |
| `empty`         | -      | 画布空状态，不传则用默认 NEmpty                 |
| `toolbar`       | -      | 右侧操作列（导入导出 / 语言切换），不传则用默认 |

---

### FormRenderer API

#### Props

| 属性                     | 类型                                              | 默认值                                         | 说明                                                                                                                       |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `definition`             | `FormDefinition`                                  | -                                              | **主输入**：版本化 DSL 表单定义，内部 `dslToSchema` 转换                                                                   |
| `schema`                 | `FormKitSchemaFormKit[]`                          | -                                              | **备选输入**：裸 FormKit schema 数组；与 `definition` 同传时优先 `definition`                                              |
| `dataStructure`          | `'flat' \| 'nested'`                              | `'flat'`                                       | 有 `definition` 时的数据输出结构：flat 扁平 \| nested 容器转 group 嵌套                                                    |
| `modelValue`             | `Record<string, unknown>`                         | `{}`                                           | 表单数据 v-model 双向绑定                                                                                                  |
| `actions`                | `boolean`                                         | `false`                                        | 渲染默认操作区（提交/重置两按钮）；`false` 则不显示，配合 `#actions` 槽自定义                                              |
| `submitLabel`            | `string`                                          | i18n: 提交/Submit                              | 默认提交按钮文案                                                                                                           |
| `resetLabel`             | `string`                                          | i18n: 重置/Reset                               | 默认重置按钮文案                                                                                                           |
| `submitAttrs`            | `Record<string, unknown>`                         | -                                              | 默认提交按钮透传属性（naive NButton props）                                                                                |
| `resetAttrs`             | `Record<string, unknown>`                         | -                                              | 默认重置按钮透传属性（naive NButton props）                                                                                |
| `actionsJustify`         | `'start' \| 'center' \| 'end' \| 'space-between'` | `'start'`                                      | 默认操作区按钮对齐方式                                                                                                     |
| `formClass`              | `string`                                          | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | 表单根元素 class                                                                                                           |
| `formName`               | `string`                                          | -                                              | 表单名称（优先级：schema 中 form.name > 此 prop）                                                                          |
| `labelPosition`          | `'top' \| 'left'`                                 | `'top'`                                        | 标签位置（优先级：schema 中 form.props.labelPosition > 此 prop）                                                           |
| `labelWidth`             | `number`                                          | `80`                                           | 标签宽度（优先级：schema 中 form.props.labelWidth > 此 prop）                                                              |
| `schemaLibrary`          | `Record<string, Component>`                       | 内置预览库                                     | 自定义 schema 组件库（覆盖内置预览组件）                                                                                   |
| `interactiveContainers`  | `boolean`                                         | `true`                                         | 启用列表/卡片/输入组/按钮组/标签页等容器的交互（增删行）                                                                   |
| `config`                 | `FormBuilderConfig`                               | -                                              | 本实例配置；传了则自给（registerElements + provide locale/i18n/http），不传回落外层 `BuilderProvider` / `FormBuilder` 注入 |
| `theme`                  | `BuilderTheme` (`'light' \| 'dark'`)              | 自动跟随系统                                   | 自定义主题：内部映射到 naive-ui 的 darkTheme / lightTheme                                                                  |
| `http`                   | `AxiosInstance`                                   | 内置 `axios`                                   | JS 绑定代码（`axios` 变量）与 `settings.submit` 用的自定义 HTTP 客户端；优先级高于 `config.http`                           |
| `disabled`               | `boolean`                                         | `false`                                        | 禁用整个表单（所有输入 + 默认操作区）；与 `definition.settings.disabled` 取或                                              |
| `...ConfigProviderProps` | `Partial<ConfigProviderProps>`                    | -                                              | naive-ui ConfigProvider 其余属性透传                                                                                       |

#### Events

| 事件                | 参数                             | 说明                                                                                                                |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `update:modelValue` | `value: Record<string, unknown>` | 表单数据变更时触发（v-model 双向绑定）                                                                              |
| `submit`            | `formData, id?, version?`        | 表单提交时触发（未填必填校验时不触发；`definition.settings.submit` 有自定义提交逻辑时改为执行该逻辑，不触发此事件） |

#### Slots

| 插槽名    | 作用域                                                                           | 说明                                    |
| --------- | -------------------------------------------------------------------------------- | --------------------------------------- |
| `actions` | `{ submit: () => void, reset: () => void, loading: boolean, disabled: boolean }` | 自定义操作区（覆盖默认提交/重置两按钮） |

#### Methods (via `defineExpose`)

| 方法       | 类型                     | 说明                                             |
| ---------- | ------------------------ | ------------------------------------------------ |
| `submit`   | `() => void`             | 提交表单（未填必填校验时不触发 submit 事件）     |
| `reset`    | `() => void`             | 重置表单到初始值                                 |
| `validate` | `() => Promise<boolean>` | 触发校验并展示错误提示，不提交；返回是否全部通过 |
| `loading`  | `Ref<boolean>`           | 提交中 loading 状态                              |

---

### 预览组件

两个开箱即用的预览组件，内部复用 `FormRenderer`，在弹窗（naive-ui `n-modal` + `n-scrollbar`）中填充并测试表单。二者都把生成的 FormKit schema 渲染成可交互、可提交的真实表单。

| 组件                    | 内部渲染器     | 布局                             |
| ----------------------- | -------------- | -------------------------------- |
| `BuilderPreview`        | `FormRenderer` | 单个表单；可选数据面板在下方     |
| `FormDefinitionPreview` | `FormRenderer` | 分栏：左侧表单，右侧实时表单数据 |

两者都通过 `defineExpose` 暴露 `open` / `close` / `validate` 方法（`validate` 触发校验并返回是否通过，等价于 `FormRenderer.validate`），并触发 `update:show` 与 `submit`（`formData, id?, version?`）事件。

#### BuilderPreview Props

| 属性                    | 类型                      | 默认值                                         | 说明                                                                     |
| ----------------------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `show`                  | `boolean`                 | -                                              | 弹窗显隐；可 `v-model:show` 双向绑定                                     |
| `schema`                | `FormKitSchemaFormKit[]`  | -                                              | 要预览的裸 schema；不传则用当前 `FormDefinition` 通过 `dslToSchema` 生成 |
| `title`                 | `string`                  | i18n: 表单预览                                 | 弹窗标题                                                                 |
| `description`           | `string`                  | i18n: 预览表单并测试其功能                     | 头部副标题                                                               |
| `showDataPanel`         | `boolean`                 | `true`                                         | 是否在表单下方显示实时数据面板                                           |
| `initialData`           | `Record<string, unknown>` | `{}`                                           | 初始表单数据                                                             |
| `view`                  | `CanvasView`              | 画布状态                                       | 桌面 / 平板 / 手机 预览容器宽度                                          |
| `actions`               | `boolean`                 | `false`                                        | 渲染默认操作区（提交/重置两按钮）                                        |
| `formClass`             | `string`                  | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | 表单根元素 class                                                         |
| `interactiveContainers` | `boolean`                 | `true`                                         | 启用列表/卡片/分组/标签页等容器交互（增删行）                            |
| `resetOnSubmit`         | `boolean`                 | `true`                                         | 提交后重置表单数据                                                       |
| `disabled`              | `boolean`                 | `false`                                        | 禁用整个预览表单                                                         |

#### FormDefinitionPreview Props

| 属性                    | 类型                      | 默认值                                         | 说明                                                             |
| ----------------------- | ------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| `show`                  | `boolean`                 | -                                              | 弹窗显隐，可 `v-model` 双向绑定                                  |
| `formDefinition`        | `FormDefinition`          | 必填                                           | 版本化 DSL 表单定义（设计器导出的结果），内部 `dslToSchema` 转换 |
| `title`                 | `string`                  | `''`                                           | 弹窗标题                                                         |
| `initialData`           | `Record<string, unknown>` | `{}`                                           | 初始表单数据                                                     |
| `actions`               | `boolean`                 | `false`                                        | 渲染默认操作区（提交/重置两按钮）                                |
| `formClass`             | `string`                  | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | 表单根元素 class                                                 |
| `interactiveContainers` | `boolean`                 | `true`                                         | 启用可交互容器                                                   |
| `showDataPanel`         | `boolean`                 | `true`                                         | 是否显示右侧实时数据面板                                         |
| `dataPanelWidth`        | `string`                  | `'320px'`                                      | 右侧数据面板宽度                                                 |
| `resetOnSubmit`         | `boolean`                 | `true`                                         | 提交后重置表单数据                                               |
| `disabled`              | `boolean`                 | `false`                                        | 禁用整个预览表单                                                 |

`FormDefinitionPreview` 额外暴露 `reset` 方法（清空本地表单数据，与 `FormRenderer` 恢复初始值的 `reset` 不同）。两者都会从所在的 `BuilderProvider` / `FormBuilder` 读取运行期 locale / 主题。

---

### FormBuilderConfig

```ts
export interface FormBuilderConfig {
  apiKey?: string // AI 服务 API Key（建议仅在服务端代理场景使用，勿在前端暴露真实密钥）
  aiBaseUrl?: string // OpenAI 兼容接口地址，默认 https://api.deepseek.com（可指向自建服务端代理）
  aiModel?: string // AI 模型名，默认 deepseek-chat（OpenAI 用户可设 gpt-4o-mini 等）
  aiSystemPrompt?: string // 自定义 AI 系统提示词；默认使用内置 Instructions.txt
  http?: AxiosInstance // 自定义 HTTP 请求库实例：供 JS 绑定代码里的 axios 变量使用（画布预览 + 渲染器）；缺省使用内置 axios。FormRenderer 的 http prop 优先级更高
  locale?: string
  localeFallback?: string // locale 不在 availableLocales 内时的兜底语言，默认 zh-CN
  messages?: Record<string, any> // 多语言覆写（结构与默认 messages 一致）
  availableLocales?: string[] // 可用语言列表，默认 ['zh-CN', 'en']
  elements?: RegisterElementInput[] // 扩展元素（配置式注册）
  fetchDictionary?: (code: string) => Promise<DictionaryOption[]> // 字典查询：按 code 取字典项 [{label,value}]（动态字段渲染时调用）
  fetchDictionaryPage?: (params: DictionaryPageQuery) => Promise<DictionaryPageResult> // 字典分页搜索：编辑面板弹窗查找字典定义用
  fetchTreeDictionary?: (code: string) => Promise<TreeDictionaryOption[]> // 树型字典查询：按 code 取树型字典项（树选择/级联选择渲染时调用）
  fetchTreeDictionaryPage?: (params: TreeDictionaryPageQuery) => Promise<TreeDictionaryPageResult> // 树型字典分页搜索：编辑面板弹窗查找用
}
```

`locale` 不传时缺省 `zh-CN`。嵌套类型（`DictionaryOption`、`DictionaryPageQuery`、
`DictionaryPageResult`、`TreeDictionaryOption`、`TreeDictionaryPageQuery`、
`TreeDictionaryPageResult`，定义在 `src/types/env.ts`）目前未从包入口单独导出——
TypeScript 使用方仍可通过 `FormBuilderConfig` 的字段类型间接拿到其结构，只是不能作为独立
具名类型 `import`。`fetchDictionary*` / `fetchTreeDictionary*` 只在字段的 `options` 是动态字典
引用（`{ dynamic: true, code }`）而非静态选项数组时才会被调用，适用于下拉 / 单选 / 多选 /
级联选择 / 树选择等字段。

### DSL 与转换

DSL 节点类型：`FormDefinition` / `FormNode`（`FieldNode` / `ContainerNode` / `StaticNode` / `LayoutNode`）、`NodeCategory`（`field | container | layout | static`）、`RenderKind`（`formkit | cmp | el`）。DSL 主体是 JSON-safe 结构，设计上就是要交给后端（如 Java）直接持久化 / 反序列化的契约。

```ts
import {
  dslToSchema,
  schemaToDsl,
  dslToOutputSchema,
  toPortableDefinition,
} from '@zeng-alt/formkit-form-builder'
import type { FormDefinition } from '@zeng-alt/formkit-form-builder'

const schema = dslToSchema(definition) // DSL → FormKit schema，渲染用
const outputSchema = dslToOutputSchema(definition) // 同上，但容器/布局转 group 嵌套（见下文）
const backToDsl = schemaToDsl(schema) // FormKit schema → DSL（尽力而为的导入）

// 持久化到后端前剥离前端专用字段（BaseNode.key、meta.rawSchema）：
const portable = toPortableDefinition(definition)
await saveFormDefinition(portable)
```

面向后端对接的完整 DSL 参考——`FormDefinition` / `FormSettings` / 各节点类型的每个字段、
表达式 AST 与内置函数、校验规则结构、事件绑定、每种容器的数据结构（以及 `dataStructure`
的 `flat` / `nested` 如何影响提交出的 JSON 形状）、`toPortableDefinition` 具体剥离了什么、
以及一份完整示例——见**[docs/dsl.md](./docs/dsl.md)**（英文版：[docs/dsl.en.md](./docs/dsl.en.md)）。

### 扩展元素

通过 `config.elements` 或 `registerElement(s)` 注册自定义元素（DSL 注册中心 + FormKit input + 画布/预览一次打通）：

```ts
import { registerElement, formkitConfig } from '@zeng-alt/formkit-form-builder'
import type { RegisterElementInput } from '@zeng-alt/formkit-form-builder'

registerElement({
  type: 'myField',
  category: 'field',
  label: '自定义字段',
  // ... 见 RegisterElementInput 类型
})

createApp(App).use(plugin, formkitConfig())
```

## i18n 覆写

`messages[locale]` 与内置文案结构同形，按 key **递归深合并**：传入的键覆写内置文案，
未覆写的键沿用原值（对齐 camunda7-ui 语义，数组整体替换）。也可注入全新 locale，
缺失的键在查找时回退到 `en`。

```ts
const config = {
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      builder: {
        clearForm: '清空当前表单', // 仅覆写这一个键，其他 builder.* 保留
      },
    },
  },
}
```

DSL 表达式函数 `today()` 按当前运行语言解析时区（`zh-CN` → `Asia/Shanghai`、`ja` →
`Asia/Tokyo` 等，`en` 无固定映射，回落浏览器本地时区），而非固定 UTC，避免夜间取到
昨天的日期。语言切换会自动同步；宿主也可用 `LOCALE_TIME_ZONES` 扩展映射表，或用
`setExprLocale` 手动设置求值语言（脱离 `FormBuilder` / `FormRenderer` 单独使用 DSL 转换
工具时适用）。

```ts
import { setExprLocale, LOCALE_TIME_ZONES } from '@zeng-alt/formkit-form-builder'

LOCALE_TIME_ZONES['fr'] = 'Europe/Paris' // 扩展映射
setExprLocale('zh-CN') // 手动设置（FormBuilder/FormRenderer 内会随 locale 自动同步）
```

## 安全说明

`FormDefinition` 有几处会携带不透明的 JS 字符串：字段/静态节点的 `events`（事件绑定，
如 `onClick`）、`settings.submit`（自定义提交逻辑）、数据表格的 `getData` /
`createData` / `updateData` / `deleteData`（远程数据钩子）。`FormRenderer` 在浏览器端
用 `new Function` 执行这些代码，代码里可以访问注入的 `axios` 实例——默认携带页面的
同源凭据（cookie）。

含义：**谁能编辑表单定义，谁就能在所有填表用户的浏览器里执行任意 JS。** 这是低代码/
无代码平台的常见设计取舍，不是漏洞——但如果设计表单的人和填表的人处于不同的信任域
（例如运营团队配表单、终端客户来填），一份未经审查的 `FormDefinition` 就等价于存储型
XSS。

建议：

- 后端持久化 `FormDefinition` 时，对 `props.__bind`（事件绑定）、`settings.submit`、
  数据表格的 `getData`/`createData`/`updateData`/`deleteData` 字段做白名单或签名校验，
  再重新信任它们。
- 只把设计器（`FormBuilder`）开放给你信任其可以写 JS 的角色；对来自低信任角色提交的
  `FormDefinition`，按不可信输入处理。
- `config.apiKey` 由浏览器直接发往 AI 端点。生产环境不要下发真实密钥，应改用
  `config.aiBaseUrl` 指向自建服务端代理，密钥留在服务端。

## 示例

![light](./img/light.png)
![dark](./img/dark.png)
![preview](./img/preview.png)

## 发布到 npm（公共仓库）

1. 确认 `package.json`：

- `name` 是未被占用的包名
- `version` 已更新（遵循 semver）
- `publishConfig.access = "public"`
- `private` 已移除

2. 安装依赖并生成构建产物：

```bash
pnpm install --no-frozen-lockfile
pnpm build
```

3. 登录并发布：

```bash
npm login
npm publish --access public
```

如果你用 pnpm：

```bash
pnpm publish --access public
```

## 开发（本仓库）

```bash
pnpm install
pnpm dev

pnpm version patch   # 1.0.0 → 1.0.1
pnpm version minor   # 1.0.0 → 1.1.0
pnpm version major   # 1.0.0 → 2.0.0
pnpm publish
```
