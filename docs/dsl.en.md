# DSL Reference

A complete field reference for backend integration (e.g. a Java service that deserializes and
stores `FormDefinition`, or implements its own expression evaluator). Based on
`src/types/dsl.ts`; every statement here has been checked against the source — where behavior
differs, the source code is authoritative.

Chinese version: [dsl.md](./dsl.md). For how to use the library itself (installation, component
API) see [README.md](../README.md) / [README-zh.md](../README-zh.md) at the repository root.

## Table of Contents

- [Top level: FormDefinition](#top-level-formdefinition)
- [FormSettings](#formsettings)
- [Common node fields: BaseNode](#common-node-fields-basenode)
- [The four node kinds](#the-four-node-kinds)
- [Field-node-only fields](#field-node-only-fields)
- [Expression AST](#expression-ast)
- [Event bindings](#event-bindings)
- [Container data shapes](#container-data-shapes)
- [toPortableDefinition: stripping frontend-only fields](#toportabledefinition-stripping-frontend-only-fields)
- [Complete example](#complete-example)
- [Mapping to source files](#mapping-to-source-files)

## Top level: FormDefinition

```ts
interface FormDefinition {
  version: number
  id: string
  name: string
  description?: string
  root: ContainerNode // Form tree root: must be a container; fields only live inside a container/layout
  settings: FormSettings
  meta?: Record<string, unknown> // Arbitrary business metadata, passed through as-is
}
```

- `version`: DSL version number, from `DSL_VERSION` (currently `1`). The library has no
  cross-version migration logic yet — `schemaToDsl` tries to read back the original `version`
  when parsing a raw schema (falling back to the current `DSL_VERSION` if absent), but does not
  migrate field-level structure from older versions. If `DSL_VERSION` is bumped for an
  incompatible structural change, the backend needs its own compatibility handling for old data.
- `id` / `name` / `description`: form identity/name/description, plain data; the library does not
  enforce uniqueness.
- `root`: the root node is always a `type: 'group'` container (`category: 'container'`,
  `dataType: 'object'`). The root itself never produces a data key — `root.children` is where the
  actually-dropped-in elements live.
- `settings`: form-level settings, see below.
- `meta`: arbitrary JSON; the backend can store its own business fields here (e.g. an approval
  workflow config) — the library never reads it.

## FormSettings

```ts
interface FormSettings {
  labelAlign?: 'top' | 'left'
  labelWidth?: number
  submit?: string
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  readonly?: boolean
  successMessage?: string
  successRedirect?: string
  showReset?: boolean
  submitText?: string
  resetText?: string
}
```

| Field                      | Meaning                                                                                                                                                                                                                             | Default                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `labelAlign`               | Label position                                                                                                                                                                                                                      | Treated as `'top'` when unset (only an explicit `'left'` moves the label; `schemaToDsl` only recognizes `'top'`/`'left'`) |
| `labelWidth`               | Label width in px (used when `labelAlign: 'left'`)                                                                                                                                                                                  | `80` (`DEFAULT_LABEL_WIDTH`)                                                                                              |
| `submit`                   | Custom submit logic: a JS function-body string. When set, `FormRenderer` runs it on submit instead of emitting the `submit` event directly (see the execution environment in "Event bindings")                                      | unset                                                                                                                     |
| `size`                     | Whole-form control size; only applied to a field that hasn't explicitly set its own size (or is still at the baseline default `'medium'` baked in by the element catalog)                                                           | unset (each control falls back to its own default, usually `medium`)                                                      |
| `disabled`                 | Disable the whole form: ORed with the field's own `disabled` / a field's `disabledIf` (any true wins)                                                                                                                               | `false`                                                                                                                   |
| `readonly`                 | Whole-form readonly: only field types with native readonly semantics (`text`/`email`/`url`/`tel`/`password`/`textarea`/`number`) actually become readonly; other types have no readonly semantics and uniformly degrade to disabled | `false`                                                                                                                   |
| `successMessage`           | Toast text after a successful submit (naive-ui message); empty means no toast                                                                                                                                                       | unset                                                                                                                     |
| `successRedirect`          | URL to navigate to after a successful submit; only `http`/`https` absolute URLs or a site-relative path starting with `/` are allowed (anything else is treated as unsafe and skipped — this blocks `javascript:` and similar)      | unset                                                                                                                     |
| `showReset`                | Whether the default action bar shows a reset button (only hidden when the value is strictly `false`)                                                                                                                                | `true`                                                                                                                    |
| `submitText` / `resetText` | Default action bar's submit/reset button text; resolution order is `settings.submitText/resetText` > `FormRenderer`'s `submitLabel`/`resetLabel` prop > built-in i18n text (`提交`/`重置`, `Submit`/`Reset`)                        | unset                                                                                                                     |

## Common node fields: BaseNode

All four node kinds (`FieldNode` / `ContainerNode` / `LayoutNode` / `StaticNode`) extend these
common fields:

```ts
interface BaseNode {
  id: string
  key?: string
  name?: string
  label?: string
  type: string
  category: 'field' | 'container' | 'layout' | 'static'
  renderAs: 'formkit' | 'cmp' | 'el'
  target?: string
  props?: Record<string, unknown>
  visibleIf?: Expr
  outerClass?: string
  events?: EventBinding[]
  meta?: Record<string, unknown>
}
```

- `id`: stable, unique id, generated by the frontend, used for tree ops / selection / binding.
  The backend only needs to keep it as-is, no parsing required.
- `key`: canvas drag-and-drop identity (maps to the legacy schema's `__key`). This is a **frontend
  -only concept** — strip it with `toPortableDefinition()` before handing the definition to a
  backend (see below). It can be omitted in non-canvas scenarios (e.g. a backend hand-writing DSL).
- `name`: the field name, i.e. the data key submitted to the backend. Container / layout / static
  nodes usually don't need it (exceptions are containers with their own data shape — `group` /
  `list` / `tabs` / `steps` etc. — see "Container data shapes").
- `type`: the component type identifier, from the element catalog in
  `src/elements/definitions/*.ts` (e.g. `text`, `select`, `group`, `list`, `card`, `tabs`, ...), or
  `grid`/`row`/`column` from `LayoutType`.
- `category`: semantic classification, one of four; determines which extra fields the node has
  (only `field` has `value`/`validation`/etc).
- `renderAs`: the render primitive, deciding which kind of FormKit schema node this compiles into:
  - `'formkit'` → `$formkit: <type>` (a native FormKit input; currently only `group` uses this);
  - `'cmp'` → `$cmp: <target ?? type>` (the vast majority of elements, all fields and
    containers/layouts);
  - `'el'` → `$el: <target ?? type>` (a native HTML tag — e.g. the built-in `grid`/`row`/`column`
    layouts output `$el: 'div'`; the internal marker nodes for tabsPane/stepsPane also use
    `renderAs: 'el'`).
- `target`: the render target name, only needed when it differs from `type` (e.g. the `email`
  field has `type: 'email'` but its `$cmp` component name is `NaiveEmailInput`); for the
  `'formkit'` primitive it defaults to `type` itself.
- `props`: this type's own configuration (e.g. `text`'s `placeholder`, `select`'s `filterable`),
  passed through to the component's props (`renderAs:'cmp'`) or attrs (`renderAs:'el'`).
- `visibleIf`: the expression AST for conditional visibility, see "Expression AST"; `undefined`
  means always visible.
- `outerClass`: the **single source of truth for width**. The canvas is a 12-column grid
  (`grid-cols-12`); how many columns a node spans is driven by `col-span-N` inside this string
  (optionally combined with `row-span-N` and any other class names). Omitting it, or writing
  `'col-span-12'`, both mean "full row" (a round trip never serializes `'col-span-12'` back into
  `outerClass`, keeping the data clean).
- `events`: the array of event bindings, see "Event bindings".
- `meta`: arbitrary business metadata; the backend can pass it through as-is. The one exception is
  `meta.rawSchema` — the lossless fallback `schemaToDsl` stores for a type it doesn't recognize
  (the original raw schema node, kept only so the frontend doesn't crash on render). It's likewise
  frontend-only and should be stripped before handing the definition to a backend.

## The four node kinds

```ts
interface FieldNode extends BaseNode {
  category: 'field'
  value?: unknown
  expr?: string
  requiredIf?: Expr
  disabledIf?: Expr
  readonlyIf?: Expr
  validation?: ValidationRule[]
  options?: OptionItem[] | { dynamic: true; code: string; label?: string }
}

interface ContainerNode extends BaseNode {
  category: 'container'
  dataType?: 'object' | 'array'
  children: FormNode[]
}

type LayoutType = 'grid' | 'row' | 'column' | 'card' | 'tabs' | 'tabsPane' | 'steps' | 'stepsPane'
interface LayoutNode extends BaseNode {
  category: 'layout'
  type: LayoutType
  children: FormNode[]
}

interface StaticNode extends BaseNode {
  category: 'static'
  text?: string
  src?: string
}
```

- **FieldNode**: the only node kind that produces a form-data key (from `name`). Its own fields
  are covered in the next section.
- **ContainerNode**: containers with a real data shape (`group`/`list`/`inputGroup`/
  `buttonGroup`/`badge`/`dataTable`/`collapse`, and any custom container registered through
  extension). `dataType` is derived from the container spec: `'object'` (a single object, e.g.
  `group`) or `'array'` (e.g. `list`; note that `buttonGroup`/`badge`/`dataTable`, which don't
  really have a "multi-item array" semantic, still map to `'array'` — that's just a side effect of
  the spec mapping, not proof they actually emit array data — see "Container data shapes" below).
- **LayoutNode**: pure layout, never produces a data key itself. `grid`/`row`/`column` are plain
  `$el: div` layouts with no container spec (a CSS grid / flex-row / flex-col container,
  respectively); `card`/`tabs`/`steps` do have a container spec (`card` is a single object,
  `tabs`/`steps` are described below). `tabsPane`/`stepsPane` are the pane/step nodes inside
  `tabs`/`steps` — they have no render primitive of their own, only `__key`/`__paneType` markers
  and `children`.
- **StaticNode**: pure display nodes (text, headings, buttons, dividers, images, etc.), never
  produce form data; `text` is the copy/title content, `src` is an image URL, other display
  properties (color, size, ...) live in `props`.

## Field-node-only fields

- `value`: the initial value, any JSON value, written into the schema node's `value` by
  `dslToSchema`.
- `expr`: an expression string (e.g. `"$price * $count"`). At runtime the referenced fields are
  watched and the evaluated result is written into this field's FormKit node — used for
  "computed/total" style fields. Syntax is described under "Readable source syntax" below (it
  shares the same parser with `visibleIf` etc).
- `validation`: a structured array of validation rules, see "Validation rules" below.
- `options`: the option source, one of two shapes:
  - a static array `OptionItem[]`: `{ label, value, disabled?, children? }` (`children` is for
    multi-level cascader/tree-select options; any other extra key is kept as-is);
  - a dynamic dictionary `{ dynamic: true, code, label? }`: fetched at runtime via the host's
    `config.fetchDictionary(code)`, returning `[{ label, value }]`. Only select/radio/checkbox/
    cascader/tree-select fields support dynamic dictionaries — see
    `src/components/ui/fields/Naive{Select,CheckboxGroup,RadioGroup,Transfer}.vue`.
- `requiredIf` / `disabledIf` / `readonlyIf`: conditional required / disabled / readonly, all
  taking an "Expression AST" value, with the following semantics (checked line-by-line against
  `src/components/ui/formkit/use-schema-attrs.ts`):
  - **Conditional required `requiredIf`**: when true, equivalent to temporarily adding a
    `required` validation rule. **A static `required` rule on the field takes priority** — both
    branches (condition true/false) then include `required`, so conditional required makes no
    observable difference (the edit panel surfaces this as a hint).
  - **Conditional disabled `disabledIf`**: when true, disables the field. This ORs with
    "form-level `settings.disabled`" and "the field's own static `disabled`" — it is not an
    either/or choice, it's "any true wins".
  - **Conditional readonly `readonlyIf`**: when true, only field types with native readonly
    semantics (`text`/`email`/`url`/`tel`/`password`/`textarea`/`number`) actually render as
    truly readonly (value visible, not editable); other types have no readonly semantics and
    uniformly **degrade to disabled**, using the exact same type set as form-level
    `settings.readonly` (not a separate rule).
  - The final relationship between these three and form-level `disabled`/`readonly` plus the
    field's static `disabled` is a single OR:
    `disabled = field's own static disabled || form-level disabled ||
(form-level readonly AND type doesn't support readonly) || disabledIf is true ||
(readonlyIf is true AND type doesn't support readonly)`.

### Validation rules

```ts
interface ValidationRule {
  rule: string
  args?: unknown[]
  message?: string
  debounce?: number // debounce in ms, maps to FormKit's (200) prefix
  empty?: boolean // maps to the + prefix: also run this rule on an empty value
  force?: boolean // maps to the * prefix: force-run even if an earlier rule failed
  optional?: boolean // maps to the ? prefix: non-blocking, the form can still submit
}
```

`dslToSchema` compiles `ValidationRule[]` into FormKit's native validation array syntax
`[["<modifier-prefix><rule>", ...args], ...]` (modifiers are prepended in the order `(debounce)` →
`+` → `*` → `?`), and rules with a `message` are collected into
`validation-messages: { <rule>: <message> }`; `schemaToDsl` is the inverse. When `requiredIf` is
present, `validation` is compiled into FormKit's conditional-attribute form `{ if, then, else }`
(`if` is the expression compiled from `requiredIf`; the `then` branch has one extra `required`
compared to `else`), and `schemaToDsl` restores it back into `requiredIf` plus the static
`validation`.

Built-in rule names (from `src/components/sidebar-right/validations/ValidationSection.vue`, i.e.
the rules the edit panel actually offers — all are standard FormKit validation rule names, with
the same semantics as FormKit's own docs):

- No arguments: `accepted`, `required`, `email`, `number`, `lowercase`, `uppercase`, `url`,
  `alpha`, `alpha_spaces`, `alphanumeric`, `symbol`, `contains_alpha`, `contains_alphanumeric`,
  `contains_alpha_spaces`, `contains_symbol`, `contains_uppercase`, `contains_lowercase`,
  `contains_numeric`
- One argument: `confirm` (a field name to confirm against), `min`, `max`, `matches` (a regex),
  `starts_with`, `ends_with`, `date_after`, `date_before`, `date_format`, `is` (a list of allowed
  values), `not` (a list of excluded values), `require_one` (at least one of a named group of
  fields is required, args are the related field names)
- Two arguments: `date_between` (start/end date), `length` (min/max length), `between` (min/max
  value)

Whether a rule applies depends on the field's `type` (e.g. `accepted` is only for `checkbox`); the
full field-type ↔ rule mapping is `showForFieldType` in `ValidationSection.vue` and isn't
repeated here — for backend-side re-validation, just reuse the `rule`/`args` semantics the
frontend produced; there's no need to reproduce this UI-only visibility restriction.

## Expression AST

`Expr` is a portable (JSON-safe) expression syntax tree that a backend such as Java can parse or
generate directly:

```ts
type Expr =
  | { type: 'literal'; value: any }
  | { type: 'field'; name: string } // References a field name in the form data
  | { type: 'call'; fn: string; args: Expr[] } // A built-in function call
```

`visibleIf` / `requiredIf` / `disabledIf` / `readonlyIf` are all `Expr`; `expr` (the
computed-value field) is a **string** (see "Readable source syntax" below) — at runtime it's
parsed into the same AST and evaluated, so the two are fully equivalent in semantics.

### Built-in function list

From `src/dsl/expr-builtins.ts`, the single shared list of function names for frontend and
backend — a Java implementation only needs the same semantics, no need to read the JS source.

| Function                      | Arity | Args                        | Returns | Notes                                                                                                                                                                     |
| ----------------------------- | ----- | --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `and`                         | 1..∞  | any                         | boolean | True only if all args are truthy (JS truthiness)                                                                                                                          |
| `or`                          | 1..∞  | any                         | boolean | True if any arg is truthy                                                                                                                                                 |
| `not`                         | 1     | any                         | boolean | Logical negation                                                                                                                                                          |
| `eq`                          | 2     | a, b                        | boolean | See the "eq semantics" table below                                                                                                                                        |
| `neq`                         | 2     | a, b                        | boolean | Negation of `eq`                                                                                                                                                          |
| `gt` / `gte` / `lt` / `lte`   | 2     | a, b                        | boolean | Numeric comparison when both sides convert to finite numbers, otherwise string comparison (`String(a ?? '')` vs `String(b ?? '')`)                                        |
| `contains`                    | 2     | a, b                        | boolean | `String(a).includes(String(b))`                                                                                                                                           |
| `notContains`                 | 2     | a, b                        | boolean | Negation of `contains`                                                                                                                                                    |
| `empty`                       | 1     | a                           | boolean | `a === null \|\| a === undefined \|\| a === ''`                                                                                                                           |
| `notEmpty`                    | 1     | a                           | boolean | Negation of `empty`                                                                                                                                                       |
| `add`                         | 2     | a, b                        | any     | String concatenation if either side is a string, otherwise numeric addition (non-number/non-string values are coerced by the `toNum` rule; `null`/`undefined` count as 0) |
| `sub` / `mul` / `div` / `mod` | 2     | a, b                        | number  | Numeric arithmetic; args coerced by the `toNum` rule                                                                                                                      |
| `concat`                      | 1..∞  | any                         | string  | Stringify all args and concatenate                                                                                                                                        |
| `lower` / `upper` / `trim`    | 1     | a                           | string  | Lowercase / uppercase / trim leading & trailing whitespace                                                                                                                |
| `length`                      | 1     | a                           | number  | `String(a ?? '').length`                                                                                                                                                  |
| `coalesce`                    | 2     | a, b                        | any     | b if a is `null`/`undefined`, otherwise a                                                                                                                                 |
| `if`                          | 3     | test, consequent, alternate | any     | Ternary conditional                                                                                                                                                       |
| `sum`                         | 1..∞  | any                         | number  | Sum of all args after `toNum` coercion                                                                                                                                    |
| `today`                       | 0     | none                        | string  | Current date as `yyyy-MM-dd`, timezone resolved from the currently configured evaluation locale (see "i18n Overrides" / `setExprLocale`), not a fixed UTC offset          |
| `uuid`                        | 0     | none                        | string  | A pseudo UUID v4 (via `Math.random`, not cryptographically secure)                                                                                                        |
| `__raw__`                     | 1     | a raw string literal        | any     | Internal fallback: wraps the original string when `parseExprString` fails to parse it, to keep round-trips lossless; backends shouldn't generate this on purpose          |

`toNum` coercion rule: a number is returned as-is; a non-empty string is `Number(str)` (an empty
string counts as 0); `null`/`undefined` count as 0; a boolean is `true`→1, `false`→0; anything else
falls back to `Number(v)`.

**`eq(a, b)` semantics** (`neq` is its negation, defined separately from nothing; deliberately
designed to avoid JS's implicit `==` coercion, so a backend such as Java can implement an
independent, matching result):

1. Both `null`/`undefined` → `true`; only one is → `false`
2. Both booleans → strict equality
3. Both numbers → strict equality (`NaN` never equals anything, including itself)
4. One is a number and the other is a purely-numeric string (regex `^-?\d+(\.\d+)?$`, no hex /
   scientific notation / leading-trailing whitespace) → compared numerically
5. Both strings → strict equality
6. Any other combination (e.g. boolean vs number, arrays/objects involved) → `false`

### Readable source syntax

The panel shows/edits `visibleIf` and friends as human-readable source
(e.g. `$hasOtherIncome == true`) rather than the raw AST or the compiled helper-call form; the
`expr` field itself is also this kind of source string. Grammar (a hand-written recursive-descent
parser in `src/dsl/convert/expr-parse.ts`, with `src/dsl/expr-source.ts` as its inverse):

- **Field reference**: `$fieldName` (e.g. `$age`, `$user_name`).
- **String literal**: English quotes `"..."`/`'...'`, and the curly quotes commonly produced by
  Chinese IMEs, `“...”`/`‘...’` (opening/closing quotes must be paired); backslash escaping is
  supported.
- **Number / boolean / null literal**: `123`, `1.5`, `true`, `false`, `null`.
- **Operators** (lowest to highest precedence): ternary `test ? consequent : alternate` → `||` →
  `&&` → `==`/`!=` (`===`/`!==` are also accepted with the same meaning, both compile to
  `eq`/`neq`) → `> >= < <=` → `+ -` → `* / %` → unary `!` (logical not) and unary `-` (numeric
  negation, internally compiled to `sub(0, x)`) → parentheses `(...)`.
- **Function calls**: any built-in function from the list above can be used as a plain call, e.g.
  `contains($a, "x")`, `empty($b)`, `today()`, `if($a > 0, "pos", "neg")`.

A few examples (source → the AST they represent; all can be pasted directly into a
`visibleIf`/`requiredIf`/etc. edit box):

```text
$hasOtherIncome == true                     # eq(field(hasOtherIncome), true)
$age >= 18 && !empty($name)                 # and(gte(field(age), 18), not(empty(field(name))))
$status == "approved" || $status == "rejected"  # or(eq(field(status), "approved"), eq(field(status), "rejected"))
$score >= 60 ? "pass" : "fail"              # if(gte(field(score), 60), "pass", "fail")
$price * $count                              # mul(field(price), field(count)), typically used in a field's expr
```

### Compiling to FormKit schema: why helper calls

`dslToSchema` compiles `visibleIf` into the schema's `if` string (evaluated by FormKit at render
time), and compiles every built-in function uniformly into a `$fkb_<fn>(arg1, arg2, ...)`
helper-call form (prefix constant `EXPR_HELPER_PREFIX = 'fkb_'`) rather than translating it into
FormKit's own native operators. FormKit v2 schema's `if` is executed by a hand-written mini
expression parser bundled with `@formkit/core`, which only understands
`&& || === !== == != >= <= > < + - * / %` and `$token(args)` call syntax — no ternary `?:`, no
`??`, no unary `!`. Translating each built-in into a "seemingly equivalent" native operator used
to be a real source of bugs (`not` got its logic inverted, `if`/`coalesce` returned `undefined`,
`contains` returned the matched substring instead of a boolean). With helper calls, the schema's
`if` condition and `evalExpr` (used for the `expr` field and live designer preview) run the exact
same implementation in `src/dsl/expr-builtins.ts`, so all three places (canvas preview, FormKit
runtime rendering, and a backend independently evaluating the `Expr` AST) stay semantically
consistent by construction, with no need to manually cross-check each function.

**The backend only needs to care about the `Expr` AST itself** (`visibleIf`/`requiredIf`/
`disabledIf`/`readonlyIf` all store the AST, not the compiled `$fkb_xxx` string) — implement
same-named functions per the table above and it can evaluate independently, with no need to
understand the `$fkb_` compilation detail. **The one thing to watch for**: `fkb_` is this helper
layer's reserved token prefix — **field names must not start with `fkb_`**, or they'll be
shadowed by the same-named helper and silently break conditional logic.

## Event bindings

```ts
const FORM_EVENTS = ['click', 'change', 'input', 'focus', 'blur'] as const
interface EventBinding {
  event: (typeof FORM_EVENTS)[number]
  handler: string // an opaque function-body string
}
```

A node's `events: [{ event: "click", handler: "..." }]` is the single source of truth for event
bindings. `handler` is a **function-body string** (not a full function declaration), executed by
the frontend runtime via `new Function(...)` — a backend like Java only needs to store and pass it
through untouched, no parsing required. `dslToSchema` compiles `events` into the schema-side
unified `__bind: { onClick: handler, ... }` (top-level for `formkit` nodes, `props` for `cmp`
nodes, `attrs` for `el` nodes).

At runtime, executing `handler` injects the following named parameters, directly referenceable in
the code (see `src/utils/bind-runtime.ts`):

| Parameter    | Meaning                                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event`      | The raw event object that triggered the handler                                                                                                     |
| `form`       | The current form data (equivalent to `ctx.form` for click/input/etc field events; the about-to-be-submitted data when running as `settings.submit`) |
| `$form`      | Form definition metadata `{ id, version, name }`, from the DSL's top level, not a FormKit node property                                             |
| `$value`     | The current node's value                                                                                                                            |
| `$node`      | The current node's FormKit node instance                                                                                                            |
| `$name`      | The current node's field name (i.e. `$node.name`)                                                                                                   |
| `$get(name)` | Reads any field's current value by field name                                                                                                       |
| `$slots`     | The current node's slots                                                                                                                            |
| `attrs`      | The current node's full configuration                                                                                                               |
| `ctx`        | A merged object of all the above, for advanced use                                                                                                  |
| `axios`      | The HTTP client instance (`FormRenderer`'s `http` prop or `config.http`, defaulting to a built-in `axios`)                                          |

`settings.submit` (custom submit logic) reuses the same executor but has no real FormKit node
context: only `form` (the data about to be submitted), `$form` and `axios` are meaningful —
`$value`/`$node`/`$name`/`$get`/`$slots` are all `undefined`.

The `dataTable` container's `getData`/`createData`/`updateData`/`deleteData` remote-data hooks are
the same kind of opaque JS string (stored in the node's `props`, not part of the `EventBinding`
structure), also executed at runtime with access to the injected `axios` instance — the security
implications are the same as for event bindings, see the "Security" section of the README.

## Container data shapes

Container/layout node data shapes are driven by the spec table in
`src/elements/container-spec.ts`:

| type          | dataShape (spec)  | ContainerNode.dataType | Notes                                                                                                                                                                     |
| ------------- | ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group`       | `object`          | `object`               | Native FormKit `$formkit: 'group'` — in any mode, its children's data nests into a single object keyed by `name`                                                          |
| `list`        | `array`           | `array`                | Array container: scalar items (`["a","b"]`), a flat object array when the template is a single group child (`[{...}]`), or an array-of-arrays when nesting another `list` |
| `card`        | `object`          | `object`               | A purely visual container (a bordered/titled card), not a native group                                                                                                    |
| `inputGroup`  | `object`          | `object`               | A purely visual container (a compact horizontal input group), not a native group                                                                                          |
| `buttonGroup` | `none`            | `array`\*              | A pure display shell holding only buttons; has no data of its own                                                                                                         |
| `badge`       | `none`            | `array`\*              | A pure display shell (a badge); has no data of its own                                                                                                                    |
| `tabs`        | `objectOfObjects` | `array`\*              | Each tab pane's content is always pre-populated with one group child; panes are each an independent object                                                                |
| `steps`       | `objectOfObjects` | `array`\*              | Same as `tabs` — each step is always pre-populated with one group child                                                                                                   |
| `dataTable`   | `none`            | `array`\*              | No DnD children — columns/data are configured in `props` (see the component's own source); doesn't follow the flat/nested rule below                                      |
| `collapse`    | `object`          | `object`               | A collapsible panel, a purely visual container with the same data shape as `card`                                                                                         |

\* `dataType` is uniformly mapped by the spec table (`dataShape === 'object'` → `'object'`,
everything else (including `'none'`) → `'array'`). `'array'` doesn't mean these containers
actually emit array data — `buttonGroup`/`badge` have no data at all, and each `tabs`/`steps`
pane is really an independent object; this is just a side effect of the spec mapping, not a
direct reflection of the data shape.

### How `dataStructure: 'flat' | 'nested'` changes the submitted JSON

`FormRenderer`'s `dataStructure` prop (default `'flat'`) maps to two conversion functions,
`dslToSchema` (flat) and `dslToOutputSchema` (nested); the only difference is **whether a
non-group container/layout node gets wrapped in a `$formkit: group`**:

- **`flat` (default)**: purely visual containers — `card`/`inputGroup`/`buttonGroup`/`badge`/
  `tabs`/`steps`/`dataTable`/`collapse` — don't introduce any data nesting; the `name` of a field
  inside them is flattened straight onto the top level of the form data, fully decoupled from the
  container structure. **As a result, when a field is referenced across containers
  (`visibleIf`/`expr`/etc), keep field names globally unique** — a duplicate name resolves to
  whichever match is found first. `list` (an array container) and `group` (a native group) are
  unaffected — they naturally produce their own array/object data either way.
- **`nested`**: every data-producing container/layout node other than `group` (`card`/
  `inputGroup`/`buttonGroup`\*/`tabs`/`steps`/`dataTable`/`collapse`/etc) is wrapped as a whole
  into a `$formkit: 'group'` whose name is that container node's own `name`, so its child fields
  nest into an object keyed by that `name`. `tabs`/`steps` already always pre-populate a group
  internally (see the table above), so the nesting is the same in both flat and nested mode (just
  one extra outer group layer named after the tabs/steps node itself).

  \* `buttonGroup`/`badge` have no data-producing fields inside (only buttons), so wrapping them
  in a group or not has no effect on the submitted data.

Example: a `card` (`name: 'contact'`) containing one `text` field (`name: 'phone'`):

```jsonc
// flat (default): phone sits directly at the top level
{ "phone": "13800000000" }

// nested: phone nests inside the contact object
{ "contact": { "phone": "13800000000" } }
```

Field references (`visibleIf`/`expr`/etc) are looked up by name across the **entire form data
tree**, so they find the same-named field regardless of flat or nested mode — conditional logic
behaves consistently either way. `flat`/`nested` only changes the shape of the JSON handed to the
backend.

## `toPortableDefinition()`: stripping frontend-only fields

```ts
function toPortableDefinition(def: FormDefinition): FormDefinition
```

Deep-clones `def` and recursively strips two frontend-only fields from every node, leaving
everything else untouched:

- `BaseNode.key`: the canvas drag-and-drop identity.
- `meta.rawSchema`: the lossless fallback `schemaToDsl` stores for a type it doesn't recognize
  (the original raw schema node); after stripping, if `meta` becomes an empty object, the `meta`
  key itself is removed too.

Does not mutate the input (source in `src/dsl/portable.ts`). The backend should call this before
persisting and store the stripped result; the frontend keeps rendering from the original,
unstripped `FormDefinition` (`key` is needed for canvas drag-reorder/selection).

## Complete example

The example below covers: a field, a container (`card`), conditional required (`requiredIf`), a
computed value (`expr`), and validation rules (`validation`). It has been verified with a
scratchpad script calling this repo's `schemaToDsl(dslToSchema(definition))` and round-trips
losslessly (`requiredIf`/`expr`/`validation` are all restored correctly).

```json
{
  "version": 1,
  "id": "demo-form",
  "name": "demo",
  "description": "Example: leave request",
  "root": {
    "id": "root",
    "category": "container",
    "type": "group",
    "renderAs": "formkit",
    "dataType": "object",
    "children": [
      {
        "id": "f1",
        "key": "k1",
        "name": "hasOtherIncome",
        "label": "Has other income",
        "type": "naiveSwitch",
        "category": "field",
        "renderAs": "cmp",
        "target": "NaiveSwitch",
        "value": false,
        "outerClass": "col-span-6"
      },
      {
        "id": "f2",
        "key": "k2",
        "name": "incomeDesc",
        "label": "Income description",
        "type": "text",
        "category": "field",
        "renderAs": "cmp",
        "outerClass": "col-span-6",
        "requiredIf": {
          "type": "call",
          "fn": "eq",
          "args": [
            { "type": "field", "name": "hasOtherIncome" },
            { "type": "literal", "value": true }
          ]
        },
        "validation": [{ "rule": "length", "args": [0, 200] }]
      },
      {
        "id": "f3",
        "key": "k3",
        "name": "total",
        "label": "Total",
        "type": "number",
        "category": "field",
        "renderAs": "cmp",
        "outerClass": "col-span-6",
        "expr": "$price * $count"
      }
    ]
  },
  "settings": {
    "labelAlign": "top",
    "labelWidth": 100,
    "showReset": true
  }
}
```

As readable source: `incomeDesc`'s conditional required is `$hasOtherIncome == true`; `total`'s
computed value is `$price * $count`.

## Mapping to source files

| Documentation section                                                                                | Source file                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Top level / FormSettings / BaseNode / the four node kinds / `DSL_VERSION`                            | `src/types/dsl.ts`                                                                   |
| Element catalog (field / container / static, incl. each type's default props)                        | `src/elements/definitions/fields.ts`, `static.ts`, `containers.ts`                   |
| Container data-shape spec (dataShape / keyProp / primitive)                                          | `src/elements/container-spec.ts`                                                     |
| DSL ⇄ FormKit schema conversion (field/container/layout/static nodes)                                | `src/dsl/convert/field.ts`, `container.ts`, `layout.ts`, `static.ts`, `shared.ts`    |
| Top-level adapter (`dslToSchema` / `dslToOutputSchema` / `schemaToDsl` / flat-nested wrapping)       | `src/dsl/schema-adapter.ts`                                                          |
| Validation rule compilation/parsing (`ValidationRule[]` ⇄ FormKit array syntax)                      | `src/dsl/compile.ts` (`resolveValidation`), `src/dsl/convert/validation-parse.ts`    |
| Validation rule list (rules actually offered by the edit panel, and which field types they apply to) | `src/components/sidebar-right/validations/ValidationSection.vue`                     |
| Expression AST and built-in functions                                                                | `src/dsl/expr-builtins.ts`                                                           |
| Expression readable source ⇄ AST                                                                     | `src/dsl/expr-source.ts`, `src/dsl/convert/expr-parse.ts`                            |
| Compiling expressions into the schema's `if` / helper calls                                          | `src/dsl/compile.ts`, `src/dsl/expr-schema-helpers.ts`                               |
| Expression evaluation (the `expr` field's computed value / live designer preview)                    | `src/dsl/eval.ts`                                                                    |
| Compilation and stacking rules for conditional required/disabled/readonly                            | `src/dsl/convert/field.ts`, `src/components/ui/formkit/use-schema-attrs.ts`          |
| Event binding definition, compilation and execution                                                  | `src/types/dsl.ts` (`FORM_EVENTS`), `src/dsl/events.ts`, `src/utils/bind-runtime.ts` |
| Dynamic dictionaries (`options.dynamic`)                                                             | `src/types/env.ts`, `src/composables/use-dictionary.ts`                              |
| Stripping frontend-only fields                                                                       | `src/dsl/portable.ts`                                                                |
| Form health check (detecting things like a condition referencing a missing field)                    | `src/dsl/lint.ts`                                                                    |
| Rename-sync of references                                                                            | `src/dsl/refs.ts`                                                                    |
