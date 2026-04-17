# formkit-form-builder

基于 Vue 3 + FormKit 的可视化表单 Schema 设计器（左侧物料库 / 中间画布 / 右侧属性面板），支持拖拽搭建、校验配置、预览，以及可选的 AI 生成 Schema。

## 安装

```bash
pnpm i @zeng-alt/formkit-form-builder
```

本库依赖以下 peer 依赖（需要你在项目里自行安装，版本按你项目实际选择即可）：

```bash
pnpm i vue naive-ui @vueuse/core
```

## 样式引入

```ts
import '@zeng-alt/formkit-form-builder/style.css'
```

## 快速开始

### 1) 安装并注册 FormKit

示例（Vite + Vue 3）：

```ts
// main.ts
import { createApp } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import App from './App.vue'
import formkitConfig from './formkit.config'

createApp(App).use(formkitPlugin, formkitConfig).mount('#app')
```

### 2) 使用 FormBuilder

```vue
<script setup lang="ts">
import { FormBuilder, BuilderProvider } from 'formkit-form-builder'
import 'formkit-form-builder/style.css'

const config = {
  locale: 'zh-CN',
  apiKey: '',
}
</script>

<template>
  <BuilderProvider :config="config">
    <FormBuilder />
  </BuilderProvider>
</template>
```

## API

### 导出

```ts
import {
  FormBuilder,
  BuilderProvider,
  FormBuilderProvider,
  useFormBuilderConfig,
  provideFormBuilderConfig,
} from 'formkit-form-builder'
```

- `FormBuilder`：主组件（设计器 UI）。
- `BuilderProvider / FormBuilderProvider`：提供全局配置（同一个组件，两个别名）。
- `useFormBuilderConfig / provideFormBuilderConfig`：低层配置注入工具（通常你只需要 `BuilderProvider`）。

### FormBuilderConfig

```ts
export interface FormBuilderConfig {
  apiKey?: string
  locale?: string
  messages?: Record<string, any>
}
```

- `apiKey`：可选，AI 面板使用 OpenAI 时需要。
- `locale`：可选，默认 `zh-CN`。
- `messages`：可选，多语言覆写（结构与默认 messages 一致）。

## i18n 覆写

```ts
const config = {
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      builder: {
        clearForm: '清空当前表单',
      },
    },
  },
}
```

## 界面效果
<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/db73d65c-9cda-4053-9cf1-8140d4db358a" />

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/0cd7a23e-db73-409b-892c-0632aaa57470" />

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/b0785ec4-aa4a-48ab-8422-0f989aebf884" />


## 发布到 npm（公共仓库）

1) 确认 `package.json`：
- `name` 是未被占用的包名
- `version` 已更新（遵循 semver）
- `publishConfig.access = "public"`
- `private` 已移除

2) 安装依赖并生成构建产物：

```bash
pnpm install --no-frozen-lockfile
pnpm build
```

3) 登录并发布：

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
```
