# formkit-form-builder

[中文文档](./README-zh.md) | **English**

A visual FormKit Schema designer based on Vue 3 + FormKit (left sidebar / center canvas / right property panel), supporting drag-and-drop building, validation configuration, preview, and optional AI-powered Schema generation.

Core concept: The designer outputs a **versioned DSL (`FormDefinition`)** rather than raw schema. The `FormRenderer` (internally using `dslToSchema` conversion) renders it into a FormKit form. The DSL body is a JSON-safe structure that can be directly deserialized by backends (e.g., Java); `key` (canvas DnD identity) and `meta.rawSchema` (fallback for unregistered types) are frontend-only fields — strip them with `toPortableDefinition` before persisting (see "DSL & Conversion" below).

## Feature Overview

- **Elements**: three categories — field / container / static (full catalog in `src/elements/definitions/*`) — covering common inputs plus rich text, a signature pad, a collapsible panel, and a data table, among others.
- **Canvas**: drag-and-drop from the left palette, a floating toolbar on the selected element, a right-click context menu, copy / cut / paste, multi-select (Shift- or Ctrl/Cmd-click toggles an element; siblings in the same container only) with batch property edits, wrapping selected elements into a container, and converting an element to a compatible type.
- **Structure tree**: the left-side outline stays in sync with canvas selection.
- **Undo history panel**: browse past edits and jump back to any of them, in addition to Ctrl/Cmd+Z / Shift+Z.
- **Templates & empty-canvas onboarding**: built-in starter templates (leave request, contact form, employee registration, user registration, satisfaction survey) plus guidance on an empty canvas.
- **Form-level settings**: control size, disabled, readonly, success message / redirect after submit, reset button visibility, and submit/reset button text.
- **Conditional logic**: conditional visibility, conditional required / disabled / readonly, and expression-computed field values.
- **Validation rules**: a configurable rule library per field type (see `docs/dsl.md` / `docs/dsl.en.md` for the full rule list).
- **Form health check**: a one-click scan for common issues (e.g. a condition referencing a non-existent field), with click-to-locate on each issue.
- **Rename-sync**: renaming a field automatically rewrites every `visibleIf` / `requiredIf` / `disabledIf` / `readonlyIf` / `expr` that references it elsewhere in the form.
- **Import / export**: round-trip a form definition as JSON.
- **Multi-device preview**: preview the form at desktop / tablet / mobile widths.
- **Dark theme**: built-in light/dark/system theme switcher, kept in sync with UnoCSS `dark:` styles.

## Installation

```bash
pnpm i @zeng-alt/formkit-form-builder
```

This library depends on the following peer dependencies (you need to install them in your project). They are **required**:

```bash
pnpm i vue naive-ui @vueuse/core @formkit/core @formkit/vue @formkit/i18n
```

The following are only needed if you use the designer's expression / JS binding editors (they power the CodeMirror-based code editor panels):

```bash
pnpm i @codemirror/autocomplete @codemirror/commands @codemirror/lang-javascript @codemirror/language @codemirror/lint @codemirror/state @codemirror/theme-one-dark @codemirror/view
```

> Why are these `peerDependencies` instead of being bundled? So this library shares **the same instances** of FormKit / CodeMirror with your project. FormKit keeps a global node/plugin/input-type/i18n-locale registry per module instance — two copies of `@formkit/core` (yours + one bundled inside this library) would not recognize each other's registrations, and fields could silently fail to render or validate. CodeMirror actively detects multiple `@codemirror/state` instances in the same page and throws — the code editor would simply break. Installing these as regular dependencies of your app (as peers) guarantees there's only ever one copy loaded.

## Style Import

The ESM entry automatically loads styles — no manual import needed. Only required when using UMD / script-tag:

```ts
import '@zeng-alt/formkit-form-builder/builder.css'
```

## Quick Start

### 1) Install and Register FormKit

Use the built-in `formkitConfig()` factory (auto-registers all built-in elements) to set up FormKit:

```ts
// main.ts
import { createApp } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import { formkitConfig } from '@zeng-alt/formkit-form-builder'
import App from './App.vue'

createApp(App).use(formkitPlugin, formkitConfig()).mount('#app')
```

> Alternatively, use the one-step plugin `FormBuilderPlugin` (auto-configures FormKit + global config + element registration), see below.

### 2) Use FormBuilder

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FormBuilder, BuilderProvider } from '@zeng-alt/formkit-form-builder'
import type { FormDefinition } from '@zeng-alt/formkit-form-builder'

const definition = ref<FormDefinition>()
const config = {
  apiKey: '', // Optional: required for AI panel with OpenAI. Never ship a real key to
  // the browser in production — point `aiBaseUrl` at your own server-side proxy instead.
  // See "Security" below.
}
</script>

<template>
  <BuilderProvider :config="config">
    <FormBuilder v-model="definition" />
  </BuilderProvider>
</template>
```

`FormBuilder` binds `FormDefinition` via `v-model` bidirectionally: preload existing forms and emit edits in real time, ready to save to backend.

> The definition emitted through `update:modelValue` is treated as immutable (in dev builds it is deeply frozen): don't mutate it in place — copy it first if you need a modified version. This lets the builder keep unchanged nodes' object identity across edits, which is what makes incremental re-rendering possible.

### 3) Render Forms

`FormRenderer` renders `FormDefinition` into a fillable, submittable FormKit form:

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

- `definition`: Primary input (versioned DSL); alternatively pass raw FormKit schema via `schema` (choose one; `definition` takes priority if both provided).
- `dataStructure`: `'flat'` (default, flat output) | `'nested'` (containers converted to group nesting). Field references (`visibleIf` / `expr`) are resolved by field name across the whole form data tree, so behavior is consistent between `flat` and `nested` — when referencing a field across containers, keep field names globally unique (a duplicate name resolves to the first match found).
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
  <!-- No BuilderProvider needed, use directly -->
  <FormBuilder v-model="definition" />
  <FormRenderer :definition="definition" />
</template>
```

## Keyboard Shortcuts

Shortcuts apply while focus is inside the designer's canvas root (not while typing in a text field, code editor, or a modal). Deleting/duplicating/copying etc. act on the current selection.

| Action                                | Windows / Linux               | macOS                        |
| ------------------------------------- | ----------------------------- | ---------------------------- |
| Delete selected element(s)            | `Delete` / `Backspace`        | `Delete` / `Backspace`       |
| Undo                                  | `Ctrl+Z`                      | `Cmd+Z`                      |
| Redo                                  | `Ctrl+Shift+Z` or `Ctrl+Y`    | `Cmd+Shift+Z` or `Cmd+Y`     |
| Duplicate in place                    | `Ctrl+D`                      | `Cmd+D`                      |
| Copy                                  | `Ctrl+C`                      | `Cmd+C`                      |
| Cut                                   | `Ctrl+X`                      | `Cmd+X`                      |
| Paste                                 | `Ctrl+V`                      | `Cmd+V`                      |
| Clear multi-selection                 | `Esc`                         | `Esc`                        |
| Toggle an element in/out of selection | `Shift`+click or `Ctrl`+click | `Shift`+click or `Cmd`+click |

The same actions are also available from the floating toolbar and the right-click context menu on the canvas (which additionally offer "wrap into container" and "convert to" another type), and from the header's undo/redo buttons.

## API

### Exports

```ts
import {
  FormBuilder, // Main designer component
  FormBuilderProvider, // BuilderProvider alias
  BuilderProvider, // Global config provider
  BuilderPreview, // Reusable preview modal component
  FormDefinitionPreview, // Standalone split preview: form left, live data right
  FormRenderer, // Form rendering component
  FormBuilderPlugin, // One-step plugin
  formkitConfig, // FormKit config factory (accepts custom elements)
  registerElement, // Config-based element extension
  registerElements,
  setGlobalFormBuilderConfig, // Global config (plugin / no Provider scenarios)
  useFormBuilderConfig,
  provideFormBuilderConfig,
  createFormBuilderState, // Multi-designer instance state
  useFormBuilderState,
  useOptionalFormBuilderState, // Nullable variant for components used outside a FormBuilder/FormRenderer subtree
  provideFormBuilderState,
  dslToSchema, // DSL → FormKit schema
  dslToOutputSchema, // DSL → nested group output schema
  schemaToDsl, // Raw schema → DSL
  toPortableDefinition, // Strip frontend-only fields before persisting (see "DSL & Conversion")
  buildFormkitInputs,
  buildElementSchemaLibrary, // Element $cmp → component library (advanced: custom schemaLibrary)
  getElementCmpName, // Element type → its $cmp render name
  CanvasActionsBar, // Default #toolbar content (import/export, language switch); reusable in #toolbar
} from '@zeng-alt/formkit-form-builder'
```

`FormKitFormBuilder` and `FormBuilderProvider` are plain aliases of `FormBuilder` and
`BuilderProvider`, exported for naming preference only — both pairs are the same component.
`setExprLocale` / `resolveTimeZoneForLocale` / `LOCALE_TIME_ZONES` are also exported (see
"i18n Overrides" below).

`useFormBuilderState()` only works inside a `FormBuilder` / `FormRenderer` subtree (including
one set up via `provideFormBuilderState()`); calling it outside one throws instead of silently
falling back to a shared global instance. Components meant to be used standalone should call
`useOptionalFormBuilderState()` instead, which returns `null` outside such a subtree. In
particular, `BuilderPreview` used standalone (outside a `FormBuilder`) needs a `schema` prop —
without it there is no form definition to render.

---

### FormBuilder API

#### Props

| Prop                     | Type                                 | Default       | Description                                                                                                                   |
| ------------------------ | ------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`             | `FormDefinition`                     | -             | Form definition: v-model bidirectional binding; preload existing form and emit edits in real time                             |
| `config`                 | `FormBuilderConfig`                  | -             | Instance config; if provided, self-contained (registerElements + provide); otherwise falls back to injected `BuilderProvider` |
| `theme`                  | `BuilderTheme` (`'light' \| 'dark'`) | Auto (system) | Custom theme: maps to naive-ui's `darkTheme` / `lightTheme`                                                                   |
| `...ConfigProviderProps` | `Partial<ConfigProviderProps>`       | -             | Pass-through for remaining naive-ui ConfigProvider props (`themeOverrides`, `breakpoints`, etc.)                              |

#### Events

| Event               | Payload                 | Description                                                                                                                           |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `update:modelValue` | `value: FormDefinition` | Emitted when form definition changes (v-model bidirectional binding). Treated as immutable — see note above; don't mutate it in place |

#### Slots

| Slot            | Scope | Description                                                                           |
| --------------- | ----- | ------------------------------------------------------------------------------------- |
| `header`        | -     | Entire header bar (including default content)                                         |
| `header-left`   | -     | Header left area (clear / preview); uses default if not provided                      |
| `header-center` | -     | Header center area (AI prompt); uses default if not provided                          |
| `header-right`  | -     | Header right area (undo/redo / theme); uses default if not provided                   |
| `empty`         | -     | Canvas empty state; uses default NEmpty if not provided                               |
| `toolbar`       | -     | Right sidebar actions (import/export / language switch); uses default if not provided |

---

### FormRenderer API

#### Props

| Prop                     | Type                                              | Default                                        | Description                                                                                                                                              |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `definition`             | `FormDefinition`                                  | -                                              | **Primary input**: Versioned DSL form definition; internally converted via `dslToSchema`                                                                 |
| `schema`                 | `FormKitSchemaFormKit[]`                          | -                                              | **Alternative input**: Raw FormKit schema array; if both `definition` and `schema` provided, `definition` takes priority                                 |
| `dataStructure`          | `'flat' \| 'nested'`                              | `'flat'`                                       | Output structure when `definition` provided: `flat` (flat) \| `nested` (containers as group nesting)                                                     |
| `modelValue`             | `Record<string, unknown>`                         | `{}`                                           | Form data v-model bidirectional binding                                                                                                                  |
| `actions`                | `boolean`                                         | `false`                                        | Render default action bar (submit/reset buttons); `false` hides it, use `#actions` slot for custom                                                       |
| `submitLabel`            | `string`                                          | i18n: Submit                                   | Default submit button label                                                                                                                              |
| `resetLabel`             | `string`                                          | i18n: Reset                                    | Default reset button label                                                                                                                               |
| `submitAttrs`            | `Record<string, unknown>`                         | -                                              | Default submit button pass-through attrs (naive NButton props)                                                                                           |
| `resetAttrs`             | `Record<string, unknown>`                         | -                                              | Default reset button pass-through attrs (naive NButton props)                                                                                            |
| `actionsJustify`         | `'start' \| 'center' \| 'end' \| 'space-between'` | `'start'`                                      | Default action bar button alignment                                                                                                                      |
| `formClass`              | `string`                                          | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | Form root element class                                                                                                                                  |
| `formName`               | `string`                                          | -                                              | Form name (priority: schema form.name > this prop)                                                                                                       |
| `labelPosition`          | `'top' \| 'left'`                                 | `'top'`                                        | Label position (priority: schema form.props.labelPosition > this prop)                                                                                   |
| `labelWidth`             | `number`                                          | `80`                                           | Label width (priority: schema form.props.labelWidth > this prop)                                                                                         |
| `schemaLibrary`          | `Record<string, Component>`                       | Built-in preview lib                           | Custom schema component library (overrides built-in preview components)                                                                                  |
| `interactiveContainers`  | `boolean`                                         | `true`                                         | Enable interactions (add/remove rows) for list/card/input-group/button-group/tabs containers                                                             |
| `config`                 | `FormBuilderConfig`                               | -                                              | Self-contained instance config (registers elements + provides locale/i18n/http); if omitted, falls back to an injected `BuilderProvider` / `FormBuilder` |
| `theme`                  | `BuilderTheme` (`'light' \| 'dark'`)              | Auto (system)                                  | Custom theme: maps to naive-ui's `darkTheme` / `lightTheme`                                                                                              |
| `http`                   | `AxiosInstance`                                   | Built-in `axios`                               | Custom HTTP client used by JS binding code (`axios` variable) and `settings.submit`; takes priority over `config.http`                                   |
| `disabled`               | `boolean`                                         | `false`                                        | Disable the whole form (all inputs + the default action bar); ORed with `definition.settings.disabled`                                                   |
| `...ConfigProviderProps` | `Partial<ConfigProviderProps>`                    | -                                              | Pass-through for remaining naive-ui ConfigProvider props                                                                                                 |

#### Events

| Event               | Payload                          | Description                                                                                                                                                   |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update:modelValue` | `value: Record<string, unknown>` | Emitted when form data changes (v-model bidirectional binding)                                                                                                |
| `submit`            | `formData, id?, version?`        | Emitted on form submit (not triggered if required validation fails, and not emitted when `definition.settings.submit` is set — that custom code runs instead) |

#### Slots

| Slot      | Scope                                                                            | Description                                                |
| --------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `actions` | `{ submit: () => void, reset: () => void, loading: boolean, disabled: boolean }` | Custom action bar (overrides default submit/reset buttons) |

#### Methods (via `defineExpose`)

| Method     | Type                     | Description                                                                                              |
| ---------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `submit`   | `() => void`             | Submit form (does not trigger submit event if required validation fails)                                 |
| `reset`    | `() => void`             | Reset form to initial values                                                                             |
| `validate` | `() => Promise<boolean>` | Trigger validation and show error messages without submitting; resolves to whether all validation passed |
| `loading`  | `Ref<boolean>`           | Submit loading state                                                                                     |

---

### Preview Components

Two ready-made preview components reuse `FormRenderer` internally to fill and test a form in a modal dialog (naive-ui `n-modal` + `n-scrollbar`). Both render the produced FormKit schema into a truly interactive, submittable form.

| Component               | Internal renderer | Layout                                                    |
| ----------------------- | ----------------- | --------------------------------------------------------- |
| `BuilderPreview`        | `FormRenderer`    | Single form; optional data panel below                    |
| `FormDefinitionPreview` | `FormRenderer`    | Split view: form on the left, live form data on the right |

Both expose `open` / `close` / `validate` methods via `defineExpose` (`validate` triggers validation and returns whether it passed, same as `FormRenderer.validate`), and emit `update:show` + `submit` (`formData, id?, version?`).

#### BuilderPreview Props

| Prop                    | Type                      | Default                                        | Description                                                                                  |
| ----------------------- | ------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `show`                  | `boolean`                 | -                                              | Modal visibility; a `v-model:show` two-way binding                                           |
| `schema`                | `FormKitSchemaFormKit[]`  | -                                              | Raw schema to preview; if omitted, built from the current `FormDefinition` via `dslToSchema` |
| `title`                 | `string`                  | i18n: 表单预览                                 | Modal title                                                                                  |
| `description`           | `string`                  | i18n: 预览表单并测试其功能                     | Header subtitle                                                                              |
| `showDataPanel`         | `boolean`                 | `true`                                         | Show the live form-data panel below the form                                                 |
| `initialData`           | `Record<string, unknown>` | `{}`                                           | Initial form data                                                                            |
| `view`                  | `CanvasView`              | Canvas state                                   | Desktop / tablet / mobile preview container width                                            |
| `actions`               | `boolean`                 | `false`                                        | Render default action bar (submit/reset)                                                     |
| `formClass`             | `string`                  | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | Form root element class                                                                      |
| `interactiveContainers` | `boolean`                 | `true`                                         | Enable list/card/group/tabs interactive add/remove rows                                      |
| `resetOnSubmit`         | `boolean`                 | `true`                                         | Reset form data after submit                                                                 |
| `disabled`              | `boolean`                 | `false`                                        | Disable the whole previewed form                                                             |

#### FormDefinitionPreview Props

| Prop                    | Type                      | Default                                        | Description                                                                                           |
| ----------------------- | ------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `show`                  | `boolean`                 | -                                              | Modal visibility; a `v-model` two-way binding                                                         |
| `formDefinition`        | `FormDefinition`          | required                                       | Versioned DSL form definition (result of the designer export), converted via `dslToSchema` internally |
| `title`                 | `string`                  | `''`                                           | Modal title                                                                                           |
| `initialData`           | `Record<string, unknown>` | `{}`                                           | Initial form data                                                                                     |
| `actions`               | `boolean`                 | `false`                                        | Render the default action bar (submit/reset)                                                          |
| `formClass`             | `string`                  | `'w-full !grid !grid-cols-12 gap-x-4 gap-y-2'` | Form root element class                                                                               |
| `interactiveContainers` | `boolean`                 | `true`                                         | Enable interactive containers                                                                         |
| `showDataPanel`         | `boolean`                 | `true`                                         | Show the right-side live data panel                                                                   |
| `dataPanelWidth`        | `string`                  | `'320px'`                                      | Right data panel width                                                                                |
| `resetOnSubmit`         | `boolean`                 | `true`                                         | Reset form data after submit                                                                          |
| `disabled`              | `boolean`                 | `false`                                        | Disable the whole previewed form                                                                      |

`FormDefinitionPreview` additionally exposes a `reset` method (clears the local form data, distinct from `FormRenderer`'s `reset` which restores initial values). Both read the running locale / theme from the enclosing `BuilderProvider` / `FormBuilder`.

---

### FormBuilderConfig

```ts
export interface FormBuilderConfig {
  apiKey?: string // AI service API key (recommended: only via a server-side proxy, never expose a real key to the browser)
  aiBaseUrl?: string // OpenAI-compatible endpoint; default https://api.deepseek.com (point at your own proxy)
  aiModel?: string // AI model name; default deepseek-chat (e.g. gpt-4o-mini for OpenAI)
  aiSystemPrompt?: string // Custom AI system prompt; defaults to the built-in Instructions.txt
  http?: AxiosInstance // Custom HTTP client for JS binding code's `axios` variable (canvas preview + renderer); defaults to a built-in axios instance. FormRenderer's `http` prop takes priority
  locale?: string
  localeFallback?: string // Fallback locale when `locale` isn't in `availableLocales`; default zh-CN
  messages?: Record<string, any> // i18n overrides (same structure as default messages)
  availableLocales?: string[] // Available locales; default ['zh-CN', 'en']
  elements?: RegisterElementInput[] // Extended elements (config-based registration)
  fetchDictionary?: (code: string) => Promise<DictionaryOption[]> // Look up a dictionary's options [{label,value}] by code (used when rendering dynamic-dictionary fields)
  fetchDictionaryPage?: (params: DictionaryPageQuery) => Promise<DictionaryPageResult> // Paged dictionary search, used by the edit panel's dictionary picker
  fetchTreeDictionary?: (code: string) => Promise<TreeDictionaryOption[]> // Look up a tree-shaped dictionary's options by code (tree-select / cascader)
  fetchTreeDictionaryPage?: (params: TreeDictionaryPageQuery) => Promise<TreeDictionaryPageResult> // Paged tree-dictionary search, used by the edit panel's picker
}
```

`locale` defaults to `zh-CN` when unset. The nested types (`DictionaryOption`,
`DictionaryPageQuery`, `DictionaryPageResult`, `TreeDictionaryOption`, `TreeDictionaryPageQuery`,
`TreeDictionaryPageResult`, defined in `src/types/env.ts`) are not currently re-exported from the
package entry point — TypeScript consumers can still get their shape through `FormBuilderConfig`'s
own field types, just not as standalone named imports. The `fetchDictionary*` /
`fetchTreeDictionary*` callbacks are only used by select / radio / checkbox / cascader /
tree-select fields whose `options` is a dynamic-dictionary reference (`{ dynamic: true, code }`)
rather than a static option list.

### DSL & Conversion

DSL node types: `FormDefinition` / `FormNode` (`FieldNode` / `ContainerNode` / `StaticNode` / `LayoutNode`), `NodeCategory` (`field | container | layout | static`), `RenderKind` (`formkit | cmp | el`). The DSL body is JSON-safe and meant to be persisted and deserialized directly by a backend (e.g. Java).

```ts
import {
  dslToSchema,
  schemaToDsl,
  dslToOutputSchema,
  toPortableDefinition,
} from '@zeng-alt/formkit-form-builder'
import type { FormDefinition } from '@zeng-alt/formkit-form-builder'

const schema = dslToSchema(definition) // DSL → FormKit schema, for rendering
const outputSchema = dslToOutputSchema(definition) // Same, but containers/layouts nest as groups (see below)
const backToDsl = schemaToDsl(schema) // FormKit schema → DSL (best-effort import)

// Before persisting to the backend, strip frontend-only fields (BaseNode.key, meta.rawSchema):
const portable = toPortableDefinition(definition)
await saveFormDefinition(portable)
```

For the full DSL reference aimed at backend integration — every field of `FormDefinition` /
`FormSettings` / node types, the expression AST and its built-in functions, validation rule
structure, event bindings, each container's data shape (and how `flat` vs `nested`
`dataStructure` changes the submitted JSON), what `toPortableDefinition` strips, and a complete
worked example — see **[docs/dsl.en.md](./docs/dsl.en.md)** (Chinese: [docs/dsl.md](./docs/dsl.md)).

### Extending Elements

Register custom elements via `config.elements` or `registerElement(s)` (DSL registry + FormKit input + canvas/preview all at once):

```ts
import { registerElement, formkitConfig } from '@zeng-alt/formkit-form-builder'
import type { RegisterElementInput } from '@zeng-alt/formkit-form-builder'

registerElement({
  type: 'myField',
  category: 'field',
  label: 'Custom Field',
  // ... see RegisterElementInput type
})

createApp(App).use(plugin, formkitConfig())
```

## i18n Overrides

`messages[locale]` merges **recursively** with built-in copy (same structure). Provided keys override built-in; missing keys fall back to defaults (aligned with camunda7-ui semantics; arrays replaced wholesale). New locales can be injected; missing keys fall back to `en` during lookup.

```ts
const config = {
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      builder: {
        clearForm: 'Clear current form', // Only overrides this key; other builder.* preserved
      },
    },
  },
}
```

The DSL expression function `today()` resolves its time zone from the currently active
runtime language (`zh-CN` → `Asia/Shanghai`, `ja` → `Asia/Tokyo`, etc.; `en` has no fixed
mapping and falls back to the browser's local time zone) instead of a fixed UTC offset,
avoiding an off-by-one-day result in the evening for users east of UTC. It syncs
automatically on language switch; hosts can also extend the mapping via
`LOCALE_TIME_ZONES`, or set the evaluation language manually with `setExprLocale` (useful
when using the DSL conversion utilities standalone, outside `FormBuilder` / `FormRenderer`).

```ts
import { setExprLocale, LOCALE_TIME_ZONES } from '@zeng-alt/formkit-form-builder'

LOCALE_TIME_ZONES['fr'] = 'Europe/Paris' // extend the mapping
setExprLocale('zh-CN') // manual override (synced automatically inside FormBuilder/FormRenderer)
```

## Security

A `FormDefinition` can carry opaque JS strings in a few places: field/static-node
`events` (event bindings, e.g. `onClick`), `settings.submit` (custom submit logic),
and a data-table's `getData` / `createData` / `updateData` / `deleteData` (remote
data hooks). `FormRenderer` executes these client-side with `new Function`, and the
executed code can reach the injected `axios` instance — which by default carries
the page's same-origin credentials (cookies).

What this means: **whoever can edit a form definition can run arbitrary JS in the
browser of every user who fills that form.** This is a standard trade-off for a
low-code/no-code platform, not a bug — but if the people who design forms and the
people who fill them out sit in different trust zones (e.g. an internal ops team
authors forms that end customers fill in), an unreviewed `FormDefinition` is
equivalent to stored XSS.

Recommendations:

- When persisting a `FormDefinition` on the backend, apply an allow-list or a
  signature check to `props.__bind` (event handlers), `settings.submit`, and the
  data-table `getData`/`createData`/`updateData`/`deleteData` fields before
  trusting them again.
- Only expose the designer (`FormBuilder`) to roles you trust to write JS; treat a
  submitted `FormDefinition` from a lower-trust role as untrusted input.
- `config.apiKey` is sent straight from the browser to the AI endpoint. Never ship
  a real key to production; point `config.aiBaseUrl` at your own server-side proxy
  instead and keep the key there.

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
