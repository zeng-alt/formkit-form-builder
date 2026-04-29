# DSL Node Kind + Rich Rules + FormKit Expressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development（推荐）或 executing-plans 逐任务执行。步骤使用 `- [ ]` 复选框语法追踪。

**Goal:** 扩展 DSL：1) `DslNode` 能区分并生成 `$formkit/$el/$cmp`；2) `DslRules` 补齐原先表单校验能力；3) DSL→FormKit Schema 支持动态表达式（让 FormKit 运行期求值，而非编译期求值）。

**Architecture:** DSL 侧新增 `kind` 字段标记节点种类，compiler 根据 kind 生成对应 schema 结构；`DslRules` 扩展为与原 i18n 中 validation 卡片一致的规则集合；`logic.visibleIf/disabledIf` 编译为 FormKit schema expression 字符串（如 `$get(role).value === "admin"`），由 FormKit 在运行期结合 data 求值。

**Tech Stack:** Vue 3 + TypeScript + @formkit/vue + naive-ui（保持现有依赖）。

---

## Current State
- `DslNode` 当前仅有 `type/field/props/...`，默认全部编译为 `$formkit`：[types.ts](file:///workspace/src/dsl/types.ts)
- `DslRules` 仅 `required/min/max/pattern/message`，且当前 `min/max` 被当成 length 区间编译：[validation.ts](file:///workspace/src/dsl/validation.ts)
- compiler 当前用 `evalDslCondition(cond, data)` 直接产出 boolean，导致 schema 无法表达动态表达式：[compiler.ts](file:///workspace/src/dsl/compiler.ts)
- i18n 中仍保留完整 validation 规则定义（required/email/number/url/length/between/min/max/matches 等）：[zh.ts](file:///workspace/src/i18n/zh.ts#L78-L140)，[en.ts](file:///workspace/src/i18n/en.ts#L78-L146)

---

## Proposed Changes

### 1) DslNode：新增 kind 字段支持 $formkit/$el/$cmp
**Files**
- Modify: `src/dsl/types.ts`
- Modify: `src/dsl/compiler.ts`

**Decision**
- `DslNode.kind?: 'formkit' | 'el' | 'cmp'`
- `kind` 缺省等价于 `'formkit'`
- `type` 在不同 kind 下含义：
  - formkit：DSL 抽象类型（沿用 typeMap 映射到 `$formkit`）
  - el：HTML tag（输出 `$el`）
  - cmp：组件名（输出 `$cmp`）

### 2) DslRules：对齐原规则集合并编译到 validation 字符串
**Files**
- Modify: `src/dsl/types.ts`
- Modify: `src/dsl/validation.ts`
- Modify: `src/components/sidebar-right/FormEditMain.vue`（增加对应 UI）

**Rules (aligned with i18n validation card)**
- required/email/number/url
- alphanumeric/contains_alphanumeric/contains_numeric
- min/max（数值）
- between（数值区间）
- length（长度区间）
- matches（正则）
- messages：允许按 ruleName 覆盖（或保留统一 message 兼容字段）

### 3) compiler：logic 编译为 FormKit expression（动态求值）
**Files**
- Modify: `src/dsl/compiler.ts`
- Modify: `src/dsl/types.ts`（引入 `DslExpr` wrapper）

**Decision**
- 新增 `DslExpr = { $expr: string }`，用于在 DSL 中安全承载表达式（不强制，但支持）。
- compiler：
  - `visibleIf` → `if: "<expr>"`
  - `disabledIf` → `props: { disabled: "<expr>" }`
  - 其他 props 值：若为 `{ $expr }` 则直接输出 `$expr` 字符串；若为以 `$` 开头的字符串也原样透传。

---

## Tasks

### Task 1: 扩展 DSL types（kind + rules + expr）
**Files**
- Modify: `src/dsl/types.ts`

- [ ] Step 1: 为 `DslNode` 增加 `kind`
- [ ] Step 2: 为 `DslRules` 增加更多规则字段
- [ ] Step 3: 新增 `DslExpr` 并在 `props`/rules 可用
- [ ] Step 4: `pnpm type-check`
- [ ] Step 5: Commit

### Task 2: 扩展 rules 编译（validation/messages）
**Files**
- Modify: `src/dsl/validation.ts`

- [ ] Step 1: 增加各 rule → FormKit validation 的映射
- [ ] Step 2: messages 支持（优先 messages[rule]，其次统一 message）
- [ ] Step 3: `pnpm type-check`
- [ ] Step 4: Commit

### Task 3: compiler 支持 kind + expression
**Files**
- Modify: `src/dsl/compiler.ts`
- Modify: `src/index.ts`（导出新增类型）

- [ ] Step 1: `DslCondition` → expression string（and/or/not、eq/neq/gt/gte/lt/lte/in/nin）
- [ ] Step 2: `kind=formkit|el|cmp` 分支输出 `$formkit/$el/$cmp`
- [ ] Step 3: 支持 `DslExpr` 解包
- [ ] Step 4: `pnpm build`
- [ ] Step 5: Commit

### Task 4: 更新右侧面板支持新增 rules 字段
**Files**
- Modify: `src/components/sidebar-right/FormEditMain.vue`
- Modify: `src/composables/form-fields.ts`（如需适配字段）

- [ ] Step 1: 增加 email/url/number 等开关与 min/max/length/between/matches 输入
- [ ] Step 2: `pnpm lint`
- [ ] Step 3: Commit

---

## Verification
- `pnpm type-check`
- `pnpm build`
- `pnpm lint`
- `pnpm dev` 手动：
  - 选择字段，设置 visibleIf/disabledIf 后，预览随 data 变化动态生效（由 FormKit 表达式求值）
  - rules 勾选/输入后，提交触发校验且能看到对应错误提示

