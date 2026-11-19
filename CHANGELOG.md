# Changelog

## 2.0.0 — 2026-11-19

This release includes the changes since npm version 1.4.0. It requires migration for consumers of the removed APIs below.

### Breaking changes and migration

- The deprecated `FormSchemaRenderer` export has been removed. Import and use `FormRenderer` instead; it still accepts a `definition` or raw `schema` prop.
- The unused renderer-engine types `IRendererEngine`, `RendererPlugin`, `RenderContext`, `FieldRenderer`, `ContainerRenderer`, and `StaticRenderer` are no longer exported. Use `registerElement` / `registerElements` and `RegisterElementInput` for custom elements.
- `FormSettings` no longer declares the ineffective `layout`, `columns`, and `fullWidth` properties. Remove them from typed settings objects. `labelAlign` now accepts only `top` or `left`; replace the previously ineffective `right` value with one of these supported values.
- `useFormBuilderState()` requires a `FormBuilder` or `provideFormBuilderState()` ancestor and throws when that context is absent. Components that can run outside the designer should use `useOptionalFormBuilderState()` and account for a `null` return value. The renderer no longer provides the full designer state.
- FormKit is now provided by the consuming application rather than bundled into the library. Install compatible `@formkit/core`, `@formkit/vue`, and `@formkit/i18n` 2.x packages alongside the existing Vue, Naive UI, VueUse, and CodeMirror peers. The library and application must share the same FormKit and CodeMirror instances.
- DSL event bindings are limited to `click`, `change`, `input`, `focus`, and `blur`. Review saved bindings that used other names such as `dblclick`, keyboard events, mouse-enter/leave events, or `submit`; these are no longer part of the supported binding contract.

The JSON DSL version remains `1`. Persisted definitions are not automatically migrated; review form settings and custom event bindings against the current [DSL reference](https://github.com/zeng-alt/formkit-form-builder/blob/main/docs/dsl.en.md).

### Added

- A `/renderer` entry for form-filling pages, with ESM, UMD, and TypeScript declarations.
- `toPortableDefinition()` to remove frontend-only metadata before persistence, plus expression locale and timezone configuration exports.
- Rich-text, signature, and collapse elements; starter templates and empty-canvas guidance.
- Canvas copy, cut, paste, multi-selection, batch edits, context menus, container wrapping, type conversion, keyboard shortcuts, and navigable undo history.
- Conditional required, disabled, and readonly rules; automatic reference updates when renaming fields; a form health-check panel.
- Form-level size, disabled, readonly, submission feedback, redirect, and action-button settings.
- Data-table column validation and improved column and fixed-data editing.

### Improved

- Incremental designer and renderer updates preserve unchanged nodes and avoid rebuilding later fields on insertion.
- ESM code splitting, lazy loading of heavier fields and editors, lazy HTTP loading, and smaller dark-theme imports reduce initial loading work.
- `preloadElementComponents()` and `collectElementTypes()` are available to custom rendering pipelines.
- FormKit and CodeMirror peer externalization prevents duplicate runtime instances.
- Existing tests now cover DSL round trips, multi-instance state, rendered components, canvas interactions, generated CSS, lazy loading, and bundle budgets.

### Fixed

- Updated Vue declaration tooling to avoid nonportable internal component types in the published API; declaration errors now fail the build.
- Disabled and readonly behavior, conditional rendering, nested field expressions, validation serialization, and event bindings.
- Copy/paste rendering errors, drag-and-drop feedback, container selection, data-table field insertion, and field renaming.
- Dark-theme collapse headings, typography settings, image sizing, and canvas layout and toolbar issues.
