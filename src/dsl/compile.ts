// ═══ DSL → FormKit 表达式字符串编译 ════════════════════════════════════════════

import type { Expr, EventBinding, ValidationRule } from '../types/dsl'
import { exprHelperCall } from './expr-schema-helpers'
import { eventsToBind } from './events'

/**
 * 编译表达式 AST 为 JS 表达式字符串。字段引用编译为 `$name`：FormKit v2 schema 表达式
 * 把 `$name` 解析到 FormKitSchema 的 data 上（表单数据），`if` 与计算值都用它。
 *
 * 内置函数一律编译为 `$fkb_<fn>(args...)` 形式的 helper 调用（compile() 原生支持
 * `$token(args)` 调用语法），helper 实现由 expr-schema-helpers.ts 委托给 eval()——
 * 这样 if 条件与 evalExpr 共用同一份求值逻辑，不再需要为每个函数单独翻译一套
 * JS 算子并人工核对语义是否等价（那正是过去半数内置函数被 FormKit 算错的原因，
 * 详见 expr-schema-helpers.ts 顶部说明）。未注册的未知函数同样按 helper 调用形式
 * 输出：运行时因 helper 不存在会得到 undefined（FormKit 打一条 console.warn），
 * 比输出一个 FormKit 语法都解析不了的裸调用字符串更可控。
 */
export function exprToJs(expr: Expr): string {
  switch (expr.type) {
    case 'literal':
      return expr.value === undefined ? 'undefined' : JSON.stringify(expr.value)
    case 'field':
      return `$${expr.name}`
    case 'call': {
      if (expr.fn === '__raw__') {
        // raw 字符串不经语义校验，原样透传，由编写者自负正确性
        const raw = expr.args[0]
        if (raw && raw.type === 'literal' && typeof raw.value === 'string') return raw.value
      }
      const argJs = expr.args.map((a) => exprToJs(a))
      return exprHelperCall(expr.fn, argJs)
    }
  }
}

// ─── 校验 ──────────────────────────────────────────────────────────────────────

function resolveModifiers(m: ValidationRule | undefined): string {
  if (!m) return ''
  let prefix = ''
  if (m.debounce) prefix += `(${m.debounce})`
  if (m.empty) prefix += '+'
  if (m.force) prefix += '*'
  if (m.optional) prefix += '?'
  return prefix
}

/** FormKit v2 的 validation 数组语法：[规则名（含修饰符前缀）, ...参数]，参数原样
 *  透传给规则函数（见 @formkit/validation 的 parseRules：数组输入直接 clone 后逐条
 *  取 args.shift() 当规则名，其余就是参数），不再需要把参数拼成逗号/竖线分隔的字符串——
 *  规则参数本身含逗号或竖线（如 matches 的正则 `/^a,b$/`）也不会破坏整条校验的解析。 */
type ValidationEntry = [string, ...unknown[]]

interface ResolvedValidation {
  validation: ValidationEntry[]
  'validation-messages'?: Record<string, string>
}

// validation-messages 以规则名为 key 索引提示文案，这是 FormKit 消息系统的固有形态
// （见 @formkit/vue 的 validation 消息渲染，按 rule.name 取消息），不是这里引入的限制：
// 同一规则在一个字段上出现两次（如两条 matches 各自配置了 message），后写入的会覆盖
// 先写入的，两条规则也只会显示同一条提示文案。
export function resolveValidation(rules: ValidationRule[] | undefined): ResolvedValidation {
  const validation: ValidationEntry[] = (rules ?? []).map((v) => {
    const prefix = resolveModifiers(v)
    return [`${prefix}${v.rule}`, ...(v.args ?? [])]
  })

  const messages =
    rules
      ?.filter((v) => v.message)
      .reduce<Record<string, string>>((acc, v) => {
        acc[v.rule] = v.message!
        return acc
      }, {}) ?? {}

  return {
    // 无规则也输出空数组 []（而非省略 key）：FormKit useInput 的 prop watcher
    // （packages/vue/src/composables/useInput.ts）只在 props[prop] !== undefined 时才把
    // 值同步到 node.props，[] 同样满足这个条件（不同于 undefined），能触发同步、清掉画布
    // 上残留的旧校验；@formkit/validation 的 parseRules 对 [] 直接 reduce 出零条规则，
    // 行为与原先的空字符串完全一致（已读两个包的源码逐行核实，非猜测）。
    validation,
    ...(Object.keys(messages).length ? { 'validation-messages': messages } : {}),
  }
}

// ─── 事件 ──────────────────────────────────────────────────────────────────────
// events 唯一真源 → schema 侧统一收敛为 __bind: { onClick: handler }（见 dsl/events.ts）；
// 不再产出 onClick: "($event) => {...}" 字符串——那条路没有运行时消费者，会被 FormKit
// 当表达式解析后静默失败。运行时（use-schema-attrs / use-bind-events）读的正是这里的 __bind。

export function resolveEvents(events: EventBinding[] | undefined): Record<string, unknown> {
  const bind = eventsToBind(events)
  return bind ? { __bind: bind } : {}
}
