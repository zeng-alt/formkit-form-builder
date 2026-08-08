# formkit-form-builder

[中文文档](./README-zh.md) | **English**

A visual FormKit Schema designer based on Vue 3 + FormKit (left sidebar / center canvas / right property panel), supporting drag-and-drop building, validation configuration, preview, and optional AI-powered Schema generation.

Core concept: The designer outputs a **versioned DSL (`FormDefinition`)** rather than raw schema. The `FormRenderer` (internally using `dslToSchema` conversion) renders it into a FormKit form. The DSL is a JSON-safe structure that can be directly deserialized by backends (e.g., Java).

## Installation

```bash
pnpm i @zeng-alt/formkit-form-builder
```

This library depends on the following peer dependencies (you need to install them in your project):

```bash
pnpm i vue naive-ui @vueuse/core
```

## Style Import

The ESM entry automatically loads styles — no manual import needed. Only required when using UMD / script-tag:

```ts
import "@zeng-alt/formkit-form-builder/builder.css";
```

## Quick Start

### 1) Install and Register FormKit

Use the built-in `formkitConfig()` factory (auto-registers all built-in elements) to set up FormKit:

```ts
// main.ts
import { createApp } from "vue";
import { plugin as formkitPlugin } from "@formkit/vue";
import { formkitConfig } from "@zeng-alt/formkit-form-builder";
import App from "./App.vue";

createApp(App).use(formkitPlugin, formkitConfig()).mount("#app");
```

> Alternatively, use the one-step plugin `FormBuilderPlugin` (auto-configures FormKit + global config + element registration), see below.

### 2) Use FormBuilder

```vue
<script setup lang="ts">
import { ref } from "vue";
import { FormBuilder, BuilderProvider } from "@zeng-alt/formkit-form-builder";
import type { FormDefinition } from "@zeng-alt/formkit-form-builder";

const definition = ref<FormDefinition>();
const config = {
  apiKey: "", // Optional: required for AI panel with OpenAI
};
</script>

<template>
  <BuilderProvider :config="config">
    <FormBuilder v-model="definition" />
  </BuilderProvider>
</template>
```

`FormBuilder` binds `FormDefinition` via `v-model` bidirectionally: preload existing forms and emit edits in real time, ready to save to backend.

### 3) Render Forms

`FormRenderer` (renamed from `FormSchemaRenderer`) renders `FormDefinition` into a fillable, submittable FormKit form:

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

- `definition`: Primary input (versioned DSL); alternatively pass raw FormKit schema via `schema` (choose one; `definition` takes priority if both provided).
- `dataStructure`: `'flat'` (default, flat output) | `'nested'` (containers converted to group nesting).
- Other optional props: `formName`, `labelPosition` (`'top' | 'left'`), `labelWidth`, `formClass`, `interactiveContainers`, etc.
- **Theming**: The single source of truth is `BuilderProvider` (renders an `n-config-provider`). Supports `theme` prop (`BuilderTheme`: `'light' | 'dark'`, defaults to system preference) + remaining `ConfigProviderProps` (`themeOverrides` / `breakpoints`, etc.) passed through. `FormBuilder` / `FormRenderer` as children inherit the Provider's theme, ensuring consistency; both also retain independent `theme` / `ConfigProviderProps` props (only effective when not wrapped by `BuilderProvider`, used standalone). Built-in `ThemeSwitcher` (dark / light / system) shares the same `useColorMode` data source as the `theme` prop, keeping naive-ui theme and UnoCSS `dark:` styles in sync.
- **i18n**: Reads runtime locale from the containing `BuilderProvider` / `FormBuilder` (default `zh-CN`), syncing FormKit submit button and validation messages; can also override via `:locale` / `:date-locale` with naive language packs.

`FormRenderer` can be used alongside `FormBuilder` inside `BuilderProvider` (sharing `config.locale` / element registration / theme). Configure theme once on Provider, both stay consistent:

```vue
<BuilderProvider :config="config" :theme="isDark ? 'dark' : 'light'">
  <div class="grid grid-cols-2">
    <FormBuilder v-model="definition" />
    <FormRenderer :definition="definition" />
  </div>
</BuilderProvider>
```

## One-Step Plugin

Don't want to manually `app.use(plugin, formkitConfig())` + wrap `BuilderProvider`? Use `FormBuilderPlugin` to do it all in one step:

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
  <!-- No BuilderProvider needed, use directly -->
  <FormBuilder v-model="definition" />
  <FormRenderer :definition="definition" />
</template>
```

## API

### Exports

```ts
import {
  FormBuilder, // Main designer component
  FormBuilderProvider, // BuilderProvider alias
  BuilderProvider, // Global config provider
  BuilderPreview, // Reusable preview modal component
  FormDefinitionPreview, // Standalone split preview: form left, live data right
  FormRenderer, // Form rendering component (renamed from FormSchemaRenderer)
  FormSchemaRenderer, // @deprecated use FormRenderer
  FormBuilderPlugin, // One-step plugin
  formkitConfig, // FormKit config factory (accepts custom elements)
  registerElement, // Config-based element extension
  registerElements,
  setGlobalFormBuilderConfig, // Global config (plugin / no Provider scenarios)
  useFormBuilderConfig,
  provideFormBuilderConfig,
  createFormBuilderState, // Multi-designer instance state
  useFormBuilderState,
  provideFormBuilderState,
  dslToSchema, // DSL → FormKit schema
  dslToOutputSchema, // DSL → nested group output schema
  schemaToDsl, // Raw schema → DSL
  buildFormkitInputs,
} from "@zeng-alt/formkit-form-builder";
```

---

### FormBuilder API

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `FormDefinition` | - | Form definition: v-model bidirectional binding; preload existing form and emit edits in real time |
| `config` | `FormBuilderConfig` | - | Instance config; if provided, self-contained (registerElements + provide); otherwise falls back to injected `BuilderProvider` |
| `theme` | `BuilderTheme` (`'light' \| 'dark'`) | Auto (system) | Custom theme: maps to naive-ui's `darkTheme` / `lightTheme` |
| `...ConfigProviderProps` | `Partial<ConfigProviderProps>` | - | Pass-through for remaining naive-ui ConfigProvider props (`themeOverrides`, `breakpoints`, etc.) |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `value: FormDefinition` | Emitted when form definition changes (v-model bidirectional binding) |

#### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | - | Entire header bar (including default content) |
| `header-left` | - | Header left area (clear / preview); uses default if not provided |
| `header-center` | - | Header center area (AI prompt); uses default if not provided |
| `header-right` | - | Header right area (undo/redo / theme); uses default if not provided |
| `empty` | - | Canvas empty state; uses default NEmpty if not provided |
| `toolbar` | - | Right sidebar actions (import/export / language switch); uses default if not provided |

---

### FormRenderer API (formerly FormSchemaRenderer)

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `definition` | `FormDefinition` | - | **Primary input**: Versioned DSL form definition; internally converted via `dslToSchema` |
| `schema` | `FormKitSchemaFormKit[]` | - | **Alternative input**: Raw FormKit schema array; if both `definition` and `schema` provided, `definition` takes priority |
| `dataStructure` | `'flat' \| 'nested'` | `'flat'` | Output structure when `definition` provided: `flat` (flat) \| `nested` (containers as group nesting) |
| `modelValue` | `Record<string, unknown>` | `{}` | Form data v-model bidirectional binding |
| `actions` | `boolean` | `false` | Render default action bar (submit/reset buttons); `false` hides it, use `#actions` slot for custom |
| `submitLabel` | `string` | i18n: Submit | Default submit button label |
| `resetLabel` | `string` | i18n: Reset | Default reset button label |
| `submitAttrs` | `Record<string, unknown>` | - | Default submit button pass-through attrs (naive NButton props) |
| `resetAttrs` | `Record<string, unknown>` | - | Default reset button pass-through attrs (naive NButton props) |
| `actionsJustify` | `'start' \| 'center' \| 'end' \| 'space-between'` | `'start'` | Default action bar button alignment |
| `formClass` | `string` | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | Form root element class |
| `formName` | `string` | - | Form name (priority: schema form.name > this prop) |
| `labelPosition` | `'top' \| 'left'` | `'top'` | Label position (priority: schema form.props.labelPosition > this prop) |
| `labelWidth` | `number` | `80` | Label width (priority: schema form.props.labelWidth > this prop) |
| `schemaLibrary` | `Record<string, Component>` | Built-in preview lib | Custom schema component library (overrides built-in preview components) |
| `interactiveContainers` | `boolean` | `true` | Enable interactions (add/remove rows) for list/card/input-group/button-group/tabs containers |
| `theme` | `BuilderTheme` (`'light' \| 'dark'`) | Auto (system) | Custom theme: maps to naive-ui's `darkTheme` / `lightTheme` |
| `...ConfigProviderProps` | `Partial<ConfigProviderProps>` | - | Pass-through for remaining naive-ui ConfigProvider props |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `value: Record<string, unknown>` | Emitted when form data changes (v-model bidirectional binding) |
| `submit` | `formData, id?, version?` | Emitted on form submit (not triggered if required validation fails) |

#### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `actions` | `{ submit: () => void, reset: () => void, loading: boolean }` | Custom action bar (overrides default submit/reset buttons) |

#### Methods (via `defineExpose`)

| Method | Type | Description |
|--------|------|-------------|
| `submit` | `() => void` | Submit form (does not trigger submit event if required validation fails) |
| `reset` | `() => void` | Reset form to initial values |
| `loading` | `Ref<boolean>` | Submit loading state |

---

### Preview Components

Two ready-made preview components reuse `FormRenderer` internally to fill and test a form in a modal dialog (naive-ui `n-modal` + `n-scrollbar`). Both render the produced FormKit schema into a truly interactive, submittable form.

| Component | Internal renderer | Layout |
|-----------|-------------------|--------|
| `BuilderPreview` | `FormSchemaRenderer` | Single form; optional data panel below |
| `FormDefinitionPreview` | `FormSchemaRenderer` | Split view: form on the left, live form data on the right |

Both expose `open` / `close` methods via `defineExpose`, and emit `update:show` + `submit` (`formData, id?, version?`).

#### BuilderPreview Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `boolean` | - | Modal visibility; a `v-model:show` two-way binding |
| `schema` | `FormKitSchemaFormKit[]` | - | Raw schema to preview; if omitted, built from the current `FormDefinition` via `dslToSchema` |
| `title` | `string` | i18n: 表单预览 | Modal title |
| `description` | `string` | i18n: 预览表单并测试其功能 | Header subtitle |
| `showDataPanel` | `boolean` | `true` | Show the live form-data panel below the form |
| `initialData` | `Record<string, unknown>` | `{}` | Initial form data |
| `view` | `CanvasView` | Canvas state | Desktop / tablet / mobile preview container width |
| `actions` | `boolean` | `false` | Render default action bar (submit/reset) |
| `formClass` | `string` | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | Form root element class |
| `interactiveContainers` | `boolean` | `true` | Enable list/card/group/tabs interactive add/remove rows |
| `resetOnSubmit` | `boolean` | `true` | Reset form data after submit |

#### FormDefinitionPreview Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `boolean` | - | Modal visibility; a `v-model` two-way binding |
| `formDefinition` | `FormDefinition` | required | Versioned DSL form definition (result of the designer export), converted via `dslToSchema` internally |
| `title` | `string` | `''` | Modal title |
| `initialData` | `Record<string, unknown>` | `{}` | Initial form data |
| `actions` | `boolean` | `false` | Render the default action bar (submit/reset) |
| `formClass` | `string` | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | Form root element class |
| `interactiveContainers` | `boolean` | `true` | Enable interactive containers |
| `showDataPanel` | `boolean` | `true` | Show the right-side live data panel |
| `dataPanelWidth` | `string` | `'320px'` | Right data panel width |
| `resetOnSubmit` | `boolean` | `true` | Reset form data after submit |

`FormDefinitionPreview` additionally exposes a `reset` method. Both read the running locale / theme from the enclosing `BuilderProvider` / `FormBuilder`.

---

### FormBuilderConfig

```ts
export interface FormBuilderConfig {
  apiKey?: string; // Required for AI panel with OpenAI
  locale?: string; // Default: zh-CN
  messages?: Record<string, any>; // i18n overrides (same structure as default messages)
  elements?: RegisterElementInput[]; // Extended elements (config-based registration)
}
```

### DSL & Conversion

DSL node types: `FormDefinition` / `FormNode` (`FieldNode` / `ContainerNode` / `StaticNode` / `LayoutNode`), `NodeCategory` (`field | container | layout | static`), `RenderKind` (`formkit | cmp | el`). DSL is JSON-safe, serializable directly to backend.

```ts
import { dslToSchema, schemaToDsl, dslToOutputSchema } from "@zeng-alt/formkit-form-builder";
import type { FormDefinition } from "@zeng-alt/formkit-form-builder";

const schema = dslToSchema(definition); // For rendering
const outputSchema = dslToOutputSchema(definition); // Containers as group nesting (backend-model friendly)
const backToDsl = schemaToDsl(schema);
```

### Extending Elements

Register custom elements via `config.elements` or `registerElement(s)` (DSL registry + FormKit input + canvas/preview all at once):

```ts
import { registerElement, formkitConfig } from "@zeng-alt/formkit-form-builder";
import type { RegisterElementInput } from "@zeng-alt/formkit-form-builder";

registerElement({
  type: "myField",
  category: "field",
  label: "Custom Field",
  // ... see RegisterElementInput type
});

createApp(App).use(plugin, formkitConfig());
```

## i18n Overrides

`messages[locale]` merges **recursively** with built-in copy (same structure). Provided keys override built-in; missing keys fall back to defaults (aligned with camunda7-ui semantics; arrays replaced wholesale). New locales can be injected; missing keys fall back to `en` during lookup.

```ts
const config = {
  locale: "zh-CN",
  messages: {
    "zh-CN": {
      builder: {
        clearForm: "Clear current form", // Only overrides this key; other builder.* preserved
      },
    },
  },
};
```

## Examples

![light](./img/light.png)
![dark](./img/dark.png)
![preview](./img/preview.png)

## Publish to npm (Public Registry)

1. Verify `package.json`:
   - `name` is an available package name
   - `version` updated (semver)
   - `publishConfig.access = "public"`
   - `private` removed

2. Install deps and build:

```bash
pnpm install --no-frozen-lockfile
pnpm build
```

3. Login and publish:

```bash
npm login
npm publish --access public
```

Or with pnpm:

```bash
pnpm publish --access public
```

## Development (This Repo)

```bash
pnpm install
pnpm dev

pnpm version patch   # 1.0.0 → 1.0.1
pnpm version minor   # 1.0.0 → 1.1.0
pnpm version major   # 1.0.0 → 2.0.0
pnpm publish
```