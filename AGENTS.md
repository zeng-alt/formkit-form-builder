# AGENTS.md

Vue 3 + FormKit 2 visual form-builder, published as the npm library `@zeng-alt/formkit-form-builder` (this repo is the library, not an app). The underlying form engine is **FormKit** (`@formkit/vue` + `@formkit/core`) — everything the builder produces is a FormKit schema. Prose and comments in the codebase are Chinese.

## Commands

- `pnpm dev` — Vite dev server. The Vite `root` is `./playground`, **not** the repo root (vite.config.ts:25); playground imports the library via the real package name `@zeng-alt/formkit-form-builder` (aliased to `src/index.ts` in vite.config.ts + tsconfig.app.json paths), so playground code matches real consumer usage and the README examples.
- `pnpm build` — runs `type-check` and the library build (in parallel). **Single** `vite build` emits exactly four files to `dist/`: `builder.es.js` (ESM), `builder.umd.js` (UMD, same externals as ESM), `index.d.ts` (single bundled declaration via `rollupTypes`), `builder.css`. Only `vue`/`naive-ui`/`@vueuse/core` (peerDependencies) are externalized — everything else is bundled, so UMD script-tag users must also load those three as globals (`Vue`, `naiveUi`, `VueUse`). CSS is imported from `src/index.ts` (`uno.css` + `./style.css`), so the ESM entry auto-loads styles; the `./builder.css` subpath export stays for UMD/script-tag users.
- `pnpm type-check` — `vue-tsc --build` over project references (`tsconfig.node.json`, `tsconfig.app.json`); tsbuildinfo goes to `node_modules/.tmp`.
- `pnpm lint` — `oxlint . --fix` then `eslint . --fix --cache`. Both auto-fix; run after changing files.
- `pnpm format` — `oxfmt src/`. Repo style is **no semicolons, single quotes** (`.oxfmtrc.json`) — not prettier defaults.
- **No test framework is configured.** `test-dsl.ts` at the root is a scratch script (exercises `RendererEngine` + `FormKitPlugin`); run it with `npx tsx test-dsl.ts`.

## UI conventions

- **Styling is Tailwind CSS syntax**, implemented by UnoCSS (`uno.config.ts`) — write utilities like `flex`, `px-3`, `text-[11px]`, `dark:text-*`, and semantic tokens (`bg-card`, `text-muted-foreground`, `border-border/50`). Icons via `presetIcons` (`i-lucide-*` classes); any dynamically-composed class must be added to the `safelist` in `uno.config.ts`. Not actual Tailwind — no `tailwind.config`.
- **Components are naive-ui** (`n-button`, `n-layout`, `n-dropdown`, `n-modal`, …); custom form controls live in `src/components/ui/fields/` as `Naive*` wrappers (`NaiveSelect`, `NaiveDatePicker`, …).
- **Overall style is compact**: small controls (`size="small"`, `h-5 w-5`, `text-[11px]`) and tight spacing.
- **i18n**: built-in lightweight system (`src/i18n/`). Use `useFormBuilderI18n()`'s `t('key')` — never hardcode UI strings; add new keys to both `zh.ts` and `en.ts`. Users override via `locale` + `messages` config.
- **Light/dark themes**: `useColorMode` from `@vueuse/core` (`ThemeSwitcher.vue`), toggled via `dark:` variants + CSS variables (`--background`, `--card`, … defined in `src/style.css` and mapped in `uno.config.ts`). Test both modes.

## Architecture

Two coexisting layers, both sitting on top of the FormKit engine:

1. **Legacy builder state** (`src/utils/default-form-elements.ts`): module-level `ref`s `formSchema` + `selectedIndex`, mutated via `useFormField()` (`src/composables/form-fields.ts`), sanitized by `createFormattedSchema()` (`src/utils/format-schema.ts`). Drives the drag-and-drop builder UI.
2. **DSL + plugin renderer engine** (newer): `src/types/dsl.ts` defines `FormDefinition`/`FormNode`; `node.kind` is the core layering marker — `formkit` | `cmp` | `el`. `src/engine/RendererEngine.ts` is a generic plugin-based engine that dispatches on `node.form` (`"field" | "container" | "static"`) and throws `MissingRendererError` if no renderer is registered. `src/plugins/FormKitPlugin.ts` maps DSL nodes → FormKit schema (`$formkit`/`$cmp`/`$el`). `src/containers/registry.ts` manages container definitions (list/card/input-group/tabs).

Rendering is always FormKit: `FormSchemaRenderer.vue` (public API) renders the produced schema with `<FormKit>` + `<FormKitSchema>`, using the custom config in `src/formkit.config.ts` (registers all `Naive*` inputs via `createInput`) and the theme in `src/formkit.theme.ts` (`rootClasses`).

Public API is `src/index.ts` only — everything else is internal. Note `RendererEngine.renderForm()` returns an object `{ id, name, layout, labelWidth, nodes }`, not a bare array.

## Gotchas

- The library is built once (`vite build`) and `external`s the peerDependencies `vue`/`naive-ui`/`@vueuse/core` for both ES and UMD (vite.config.ts). Never import externalized deps as internal modules. `index.d.ts` is bundled by `rollupTypes` via `tsconfig.build.json` (rootDir `src`, declarationDir `dist` — do not set `outDir` there or the rollup silently emits an empty declaration).
- `tsconfig.app.json` enables `noUncheckedIndexedAccess` (index access yields `T | undefined`). `@typescript-eslint/no-explicit-any` is disabled (eslint.config.ts:26).
- `dist/` is gitignored; never commit build output.
- Dev entry is `playground/src/`.
- Commit messages follow conventional commits, mixing English and Chinese (see `git log`).
