# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vue 3 + FormKit 2 visual form builder, published as the npm library `@zeng-alt/formkit-form-builder` (this repo is the library, not an app). Everything the builder produces is a FormKit schema. Code comments are Chinese. `AGENTS.md` covers UI conventions and legacy context; **this file documents the current DSL-first architecture**, which supersedes the state-layer description in AGENTS.md.

## Commands

- `pnpm dev` — Vite dev server (root is `./playground`, not the repo root; playground imports the library via the `@/` → `src/` alias). Serves on http://localhost:5173.
- `pnpm build` — runs `type-check` + library build in parallel; emits ESM/CJS + `.d.ts` to `dist/` (`src/index.ts` is the only public entry; `src/style-entry.ts` → `dist/style.css`).
- `pnpm type-check` — `vue-tsc --build` (project references).
- `pnpm lint` — oxlint then eslint, both auto-fix.
- `pnpm format` — oxfmt. Repo style is **no semicolons, single quotes** (`.oxfmtrc.json`).
- No test framework is configured. Scratch tests:
  - `npx tsx test-dsl.ts` — pure DSL ⇄ schema round-trip, no browser.
  - `test-*.mjs` / `test-*.mts` at the repo root are Playwright scratch scripts — start `pnpm dev` first, then `node test-*.mjs`. They launch Chrome from `C:\Program Files\Google\Chrome\Application\chrome.exe` (see `test-playwright.mjs`).

## Architecture (DSL-first)

Four layers: state → element registry → node⇄schema conversion → FormKit renderer.

### State — DSL is the single source of truth
- `src/state/form-definition.ts` — `formDefinition` (a `FormDefinition`, `src/types/dsl.ts`) is the canonical state. `formSchema` is a **read-only** `computed` projection via `dslToSchema(formDefinition)`.
- `src/state/form-schema.ts` — re-exports `formSchema`; holds selection (`selectedIndex`, `selectedKey`, `selectedTarget`).
- All mutations funnel through `src/composables/schema-history.ts`: `commitFormDefinition` (direct DSL submit + undo/redo), `commitSchemaReconcile` (schema-array submit for DnD/canvas). **Never mutate `formDefinition`/`formSchema` in place** — commit a new object through the funnel or undo snapshots corrupt.

### Two write paths
1. **Sidebar editor**: `useFormField()` (`src/composables/form-fields.ts`) → `patchSelected` clones the selected DSL node, applies the change, patches by key via `updateDslNodeAtKey` (`src/utils/schema/dsl-tree.ts`), and commits with `commitFormDefinition`. Direct DSL write — no schema round-trip.
2. **DnD / canvas / containers**: `commitSchemaReconcile` → `reconcileDslTree` (`src/dsl/schema-adapter.ts`) diffs by key and reuses unchanged subtrees, converting only changed schema nodes back to DSL.

### Element registry — how a "type" becomes schema + UI
- `src/elements/definitions/{fields,static,containers}.ts` are pure-data catalogs (`ElementCatalogEntry`); registered into `src/dsl/registry.ts` via `elementTypeFromSchema` (through `registerBuiltinElementTypes`, `src/dsl/definitions.ts`).
- Each `ElementTypeDef` carries `renderAs` (`formkit` | `cmp` | `el`), `defaults()` (new-node DSL), `toSchema`, `fromSchema`, `match`. The conversion core is `src/dsl/convert-common.ts` — `nodeToSchemaByCategory` dispatches to `fieldNodeToSchema` / `containerNodeToSchema` / `layoutNodeToSchema` / `staticNodeToSchema`.
- `renderAs` decides the output shape: `formkit` → `$formkit` node; `cmp` → `$cmp` node (config in a `props` object); `el` → `$el` node (attrs in `attrs`). Changing it changes both sides of the round-trip.
- Render bindings live apart from the registry: `src/elements/formkit.ts` maps type → FormKit input (`formkitBindings`, `buildFormkitInputs`) and builds the `$cmp` wrapper components (`buildElementSchemaLibrary`); `src/elements/canvas.ts` holds container canvas/preview components and `formatContainerPreviewNode`. `src/containers/registry.ts` is a compat re-export shim.

### Rendering
- `src/renderer/FormSchemaRenderer.vue` renders a schema with `<FormKit type="form">` + `<FormKitSchema>`, library from `getPreviewSchemaLibrary()`. The canvas renders each item via `ContainerChildrenGrid` → `FormKitSchema` with `getCanvasSchemaLibrary()`, wired in `src/builder/composables/use-canvas-schema.ts` (DnD list synced from `formSchema`).
- `src/formkit.config.ts` registers every input with FormKit via `buildFormkitInputs()`; `src/formkit.theme.ts` provides `rootClasses`.

## FormKit gotchas (cost real debugging time)

- **FormKit only syncs `attrs` that existed at node creation into `node.props`.** A custom prop added to the schema later (e.g. writing `buttonText` onto a button that didn't have it) is silently dropped — the canvas won't re-render. `createElementCmpWrapper` (`src/elements/formkit.ts`) works around this for the button types (`submit`/`reset`/`naiveButton`) by keying the inner `<FormKit>` on a content hash, forcing node recreation when config changes. If you add custom config to other element types, expect the same issue and reuse that pattern.
- `wrap: false` inputs (buttons: `CustomButton.vue`) receive only `context`; they read config from `context.node.props`. Wrapped inputs receive `context` plus reserved props.
- `useFormField().buttonText` falls back to `props.text` / `label` so the sidebar editor stays in sync with what `CustomButton` actually renders (`buttonText` → `text` → `label` → `context.label`).
- The build `external`s `vue`, `@formkit/core`, `naive-ui`, `@vueuse/core`, `vue-sonner`, `openai` — never import these as internal modules.
- `tsconfig.app.json` enables `noUncheckedIndexedAccess` (index access yields `T | undefined`). `dist/` is gitignored — never commit build output.
