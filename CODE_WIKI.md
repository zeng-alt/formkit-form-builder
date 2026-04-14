# 项目 Code Wiki 文档

本文档提供了基于 Vue 3 和 FormKit 开发的表单设计器（Form Builder）项目的全面技术说明，涵盖整体架构、模块划分、核心类与函数、依赖项及运行指南。

## 1. 项目整体架构

本项目是一个可视化的表单搭建工具，采用典型的左右中三栏布局设计（组件库 -> 画布 -> 属性面板）。

*   **核心技术栈**：基于 Vue 3 (Composition API) + Vite + TypeScript 构建。
*   **表单引擎**：深度集成 **FormKit**（包含 `@formkit/vue`, `@formkit/core`）作为底层表单渲染和数据收集引擎。通过 `@formkit/drag-and-drop` 实现了表单元素的拖拽排序与构建功能。
*   **UI 体系**：
    *   采用了类似 `shadcn-vue` 的设计模式，现已全面重构，底层组件主要使用 **Naive UI**。
    *   样式由 **Tailwind CSS v4** 驱动（结合 `clsx` 和 `tailwind-merge` 管理动态类名）。
*   **状态管理**：未使用 Pinia 等重量级状态管理库，而是直接利用 Vue 自身的响应式 API (`ref`, `computed`)，将状态提取到独立的文件中（如 `default-form-elements.ts`）作为全局共享状态。

## 2. 主要模块职责

项目核心源代码主要集中在 `src/` 目录下。

### 2.1 `src/builder` (核心构建器模块)
作为整个表单设计器的主入口，负责串联所有界面。
*   **`BuilderMain.vue`**：主布局容器，组装了左侧组件库、右侧属性面板和中间的主工作区。
*   **`BuilderDropArea.vue`**：中间的表单拖拽画布，接收从左侧拖拽过来的组件。
*   **`BuilderHeader.vue`**：顶部操作栏，包含“清空表单”、“预览 (Preview)”、“AI 生成表单 (AiPrompt)”以及主题切换功能。
*   **`BuilderPreview.vue`**：预览组件，通过模态框调用 FormKit 引擎，实时渲染并测试当前配置好的表单 Schema。
*   **`BuilderProvider.vue`**：上下文提供者，用于向整个应用下发全局配置（如 AI 生成表单所需的 API Key）。

### 2.2 `src/components/sidebar-left` (左侧组件库)
*   **`SidebarLeft.vue` / `NavMain.vue`**：展示支持的所有 FormKit 原生表单组件（如文本、数字、日期、下拉框等）。提供搜索过滤功能，并作为拖拽操作的起始源。

### 2.3 `src/components/sidebar-right` (右侧属性面板)
当前选中表单项的配置中心。
*   **`edits/` 目录**：处理基础属性的编辑（如 Label、Placeholder、帮助文本、默认值、可选项配置等）。
*   **`validations/` 目录**：处理表单校验规则的配置，支持为不同字段动态挂载 FormKit 内置的校验规则（如 email、url、min、max、date_before 等）。

### 2.4 `src/components/ui` (通用 UI 组件库)
*   基于 Tailwind 和 Naive UI 封装的基础 UI 组件（例如 ThemeSwitcher、ValidationCard 等），主要供构建器自身界面使用，保证了高可定制性和一致的设计语言。

### 2.5 `src/composables` (组合式函数)
*   **`form-fields.ts`**：负责连接“右侧属性面板”和“全局表单 Schema”，封装了大量的 `computed` 属性（如 `label`, `placeholder`, `validationString` 等），实现属性修改时的双向数据绑定。
*   **`use-config.ts`**：负责通过 `provide/inject` 管理和获取全局配置。

## 3. 关键类与函数说明

*   **`formSchema` & `selectedIndex`** （位于 `src/utils/default-form-elements.ts`）
    *   **核心状态**：`formSchema` 是一个 `ref<FormKitSchemaFormKit[]>`，存储了当前表单的完整 JSON Schema。`selectedIndex` 记录了当前在画布中被选中的组件索引。整个应用的数据流向围绕这两个变量进行读写。
*   **`defaultFormElements`** （位于 `src/utils/default-form-elements.ts`）
    *   **基础物料库**：定义了所有可供拖拽的基础表单组件的初始 Schema 模板（包含 `$formkit`, `name`, `label`, `validation` 等属性）。
*   **`useFormField()`** （位于 `src/composables/form-fields.ts`）
    *   **核心逻辑钩子**：在右侧属性面板中被大量调用。它通过 `computed` 拦截了对当前选中组件 (`formSchema.value[selectedIndex.value]`) 的读写操作。例如，修改 Input 框里的 label 时，会自动定位并更新 `formSchema` 中对应项的数据。
*   **`updateValidationString()`** （位于 `src/composables/form-fields.ts`）
    *   **校验规则解析器**：FormKit 的校验规则基于字符串拼接（如 `required|email|length:5`）。此函数负责解析、添加或移除特定的校验规则片段。
*   **`createFormattedSchema(fields)`** （位于 `src/utils/format-schema.ts`）
    *   **Schema 格式化**：在最终渲染或预览前，负责清洗配置数据，自动为每个表单元素生成唯一的 `id` 和 `name`（避免重复和冲突），确保 FormKit 引擎能正确渲染。

## 4. 项目依赖关系

项目的核心依赖定义在 `package.json` 中，主要包括：

*   **UI 与表单框架**：
    *   `vue` (^3.5.31)
    *   `@formkit/vue`, `@formkit/core`, `@formkit/drag-and-drop`（表单引擎与拖拽核心）
    *   `naive-ui` (^2.44.1)（主力 UI 库）
*   **样式体系**：
    *   `tailwindcss` (^4.2.2) 及 `@tailwindcss/vite`
    *   `tailwind-merge`, `clsx`, `class-variance-authority` (用于构建原子组件)
    *   `tw-animate-css`（Tailwind 动画支持）
*   **功能辅助**：
    *   `@vueuse/core`（Vue 工具集）
    *   `lucide-vue-next`（图标库）
    *   `openai`（用于支持项目中的 AiPrompt 通过自然语言生成表单 Schema 的能力）
    *   `vue-sonner`（Toast 通知）
*   **工程化工具**：
    *   `vite` (^8.0.3)
    *   `typescript` (~6.0.0), `vue-tsc`
    *   `oxlint` / `oxfmt`（基于 Rust 的极速 Linter 和格式化工具），结合 `eslint`。

## 5. 项目运行方式

项目使用 Vite 作为构建工具，并推荐使用 `pnpm` 进行包管理。
**系统要求**：Node.js >= 20.19.0 或 >= 22.12.0。

1. **安装依赖**：
   在项目根目录下运行：
   ```bash
   pnpm install
   ```

2. **启动本地开发服务器**：
   ```bash
   pnpm dev
   ```
   这会启动 Vite 本地服务器，通常运行在 `http://localhost:5173`。

3. **生产环境构建**：
   ```bash
   pnpm build
   ```
   该命令会先执行 TypeScript 类型检查 (`vue-tsc --build`)，然后进行 Vite 产物构建。

4. **预览生产环境产物**：
   ```bash
   pnpm preview
   ```

5. **代码格式化与检查**（可选）：
   ```bash
   pnpm lint      # 运行 oxlint 和 eslint
   pnpm format    # 运行 oxfmt 格式化代码
   ```