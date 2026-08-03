# formkit-form-builder

基于 Vue 3 + FormKit 的可视化表单 Schema 设计器（左侧物料库 / 中间画布 / 右侧属性面板），支持拖拽搭建、校验配置、预览，以及可选的 AI 生成 Schema。

核心概念：设计器产出的是**版本化 DSL（`FormDefinition`）**而非裸 schema，通过 `FormRenderer`（内部 `dslToSchema` 转换）渲染成 FormKit 表单。DSL 是 JSON-safe 的结构，后端（如 Java）可直接反序列化。

## 安装

```bash
pnpm i @zeng-alt/formkit-form-builder
```

本库依赖以下 peer 依赖（需要你在项目里自行安装）：

```bash
pnpm i vue naive-ui @vueuse/core
```

## 样式引入

ESM 入口会自动加载样式，无需手动引入。仅在使用 UMD / script-tag 时需手动引入：

```ts
import "@zeng-alt/formkit-form-builder/builder.css";
```

## 快速开始

### 1) 安装并注册 FormKit

使用库内置的 `formkitConfig()` 工厂（会自动注册全部内置元素），完成 FormKit 装配：

```ts
// main.ts
import { createApp } from "vue";
import { plugin as formkitPlugin } from "@formkit/vue";
import { formkitConfig } from "@zeng-alt/formkit-form-builder";
import App from "./App.vue";

createApp(App).use(formkitPlugin, formkitConfig()).mount("#app");
```

> 也可以直接用一键插件 `FormBuilderPlugin`（自动装配 FormKit + 全局配置 + 元素注册），见下文。

### 2) 使用 FormBuilder

```vue
<script setup lang="ts">
import { ref } from "vue";
import { FormBuilder, BuilderProvider } from "@zeng-alt/formkit-form-builder";
import type { FormDefinition } from "@zeng-alt/formkit-form-builder";

const definition = ref<FormDefinition>();
const config = {
  apiKey: "", // 可选：AI 面板使用 OpenAI 时需要
};
</script>

<template>
  <BuilderProvider :config="config">
    <FormBuilder v-model="definition" />
  </BuilderProvider>
</template>
```

`FormBuilder` 通过 `v-model` 双向绑定 `FormDefinition`：预载已有表单并实时吐出编辑结果，可直接保存到后端。

### 3) 渲染表单

`FormRenderer`（`FormSchemaRenderer` 的现名）渲染 `FormDefinition` 为可填写、可提交的 FormKit 表单：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { FormRenderer } from "@zeng-alt/formkit-form-builder";
import type { FormDefinition } from "@zeng-alt/formkit-form-builder";

const definition = ref<FormDefinition>();
const data = ref({});
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
- `dataStructure`：`'flat'`（默认，扁平输出）| `'nested'`（容器转 group 嵌套）。
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
import { createApp } from "vue";
import { FormBuilderPlugin } from "@zeng-alt/formkit-form-builder";
import App from "./App.vue";

createApp(App).use(FormBuilderPlugin, {
  config: { apiKey: "" },
}).mount("#app");
```

```vue
<template>
  <!-- 无需 BuilderProvider，直接用 -->
  <FormBuilder v-model="definition" />
  <FormRenderer :definition="definition" />
</template>
```

## API

### 导出清单

```ts
import {
  FormBuilder, // 设计器主组件
  FormBuilderProvider, // BuilderProvider 别名
  BuilderProvider, // 全局配置提供者
  BuilderPreview, // 可复用弹窗预览组件
  FormRenderer, // 表单渲染组件（FormSchemaRenderer 的现名）
  FormSchemaRenderer, // @deprecated 用 FormRenderer
  FormBuilderPlugin, // 一键接入插件
  formkitConfig, // FormKit 装配工厂（可传扩展元素）
  registerElement, // 配置式扩展元素
  registerElements,
  setGlobalFormBuilderConfig, // 全局配置（插件/无 Provider 场景）
  useFormBuilderConfig,
  provideFormBuilderConfig,
  createFormBuilderState, // 多设计器实例状态
  useFormBuilderState,
  provideFormBuilderState,
  dslToSchema, // DSL → FormKit schema
  dslToOutputSchema, // DSL → 嵌套 group 输出 schema
  schemaToDsl, // 裸 schema → DSL
  buildFormkitInputs,
} from "@zeng-alt/formkit-form-builder";
```

### FormBuilderConfig

```ts
export interface FormBuilderConfig {
  apiKey?: string; // AI 面板使用 OpenAI 时需要
  locale?: string; // 默认 zh-CN
  messages?: Record<string, any>; // 多语言覆写（结构与默认 messages 一致）
  elements?: RegisterElementInput[]; // 扩展元素（配置式注册）
}
```

### DSL 与转换

DSL 节点类型：`FormDefinition` / `FormNode`（`FieldNode` / `ContainerNode` / `StaticNode` / `LayoutNode`）、`NodeCategory`（`field | container | layout | static`）、`RenderKind`（`formkit | cmp | el`）。DSL 是 JSON-safe 结构，可直接序列化给后端。

```ts
import { dslToSchema, schemaToDsl, dslToOutputSchema } from "@zeng-alt/formkit-form-builder";
import type { FormDefinition } from "@zeng-alt/formkit-form-builder";

const schema = dslToSchema(definition); // 渲染用
const outputSchema = dslToOutputSchema(definition); // 容器转 group 嵌套（后端模型友好）
const backToDsl = schemaToDsl(schema);
```

### 扩展元素

通过 `config.elements` 或 `registerElement(s)` 注册自定义元素（DSL 注册中心 + FormKit input + 画布/预览一次打通）：

```ts
import { registerElement, formkitConfig } from "@zeng-alt/formkit-form-builder";
import type { RegisterElementInput } from "@zeng-alt/formkit-form-builder";

registerElement({
  type: "myField",
  category: "field",
  label: "自定义字段",
  // ... 见 RegisterElementInput 类型
});

createApp(App).use(plugin, formkitConfig());
```

## i18n 覆写

`messages[locale]` 与内置文案结构同形，按 key **递归深合并**：传入的键覆写内置文案，
未覆写的键沿用原值（对齐 camunda7-ui 语义，数组整体替换）。也可注入全新 locale，
缺失的键在查找时回退到 `en`。

```ts
const config = {
  locale: "zh-CN",
  messages: {
    "zh-CN": {
      builder: {
        clearForm: "清空当前表单", // 仅覆写这一个键，其他 builder.* 保留
      },
    },
  },
};
```

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
