// ═══ 表达式内置函数注册表 ══════════════════════════════════════════════════════
// 前后端共用的函数名清单：Java 侧实现同名函数即可对齐。
// 每个函数同时提供：
//   - toJs: 编译参数 JS 字符串 → 最终 JS 表达式（用于 FormKit schema 的 if）
//   - eval: 对已求值的参数做运行时求值（无 new Function，安全）

import { formatIsoDate, getExprTimeZone } from './expr-env'

export interface BuiltinFn {
  name: string
  /** 参数数量范围 [min, max]，max 为 Infinity 表示可变 */
  arity: [number, number]
  toJs: (args: string[]) => string
  eval: (args: unknown[]) => unknown
  /** 返回类型提示（供编辑器 / Java 侧生成） */
  returns?: 'boolean' | 'number' | 'string' | 'any'
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return v.trim() ? Number(v) : 0
  if (v === null || v === undefined) return 0
  if (typeof v === 'boolean') return v ? 1 : 0
  return Number(v)
}

const truthy = (v: unknown) => Boolean(v)

// ─── eq / ne 语义表（Java 侧对齐契约）───────────────────────────────────────────
// DSL 的卖点是前后端共用同一份函数清单，Java 侧实现同名函数即可对齐——这套语义
// 必须能在两种语言里各自独立实现出一致的结果，因此不能用 JS 的 == 强制转换
// （会把 '' / null / true 等各种东西按数值悄悄拉到一起比较，Java 侧几乎没法照抄）。
// eq(a, b) 按下列 6 条规则依次判定（第一条命中的规则即为最终结果）：
//   1. 两边都是 null/undefined → true；只有一边是 → false
//   2. 两边都是 boolean → 严格相等
//   3. 两边都是 number → 严格相等（NaN 与任何值都不等，包括 NaN 自身）
//   4. 一边 number、另一边是纯数字字符串（正则 /^-?\d+(\.\d+)?$/，不接受十六进制 /
//      科学计数法 / 前后空白）→ 按数值比较
//   5. 两边都是 string → 严格相等
//   6. 其余组合（含 boolean 对 number、数组 / 对象）→ false
// ne 是 eq 取反，不单独定义。
const NUMERIC_STRING = /^-?\d+(\.\d+)?$/

const equal = (a: unknown, b: unknown): boolean => {
  const aNil = a === null || a === undefined
  const bNil = b === null || b === undefined
  if (aNil || bNil) return aNil && bNil
  const aIsBool = typeof a === 'boolean'
  const bIsBool = typeof b === 'boolean'
  if (aIsBool || bIsBool) return aIsBool && bIsBool && a === b
  const aIsNum = typeof a === 'number'
  const bIsNum = typeof b === 'number'
  if (aIsNum && bIsNum) return a === b
  const aIsStr = typeof a === 'string'
  const bIsStr = typeof b === 'string'
  if (aIsNum && bIsStr) return NUMERIC_STRING.test(b) && a === Number(b)
  if (bIsNum && aIsStr) return NUMERIC_STRING.test(a) && Number(a) === b
  if (aIsStr && bIsStr) return a === b
  return false
}

const numBinary =
  (op: (a: number, b: number) => number): BuiltinFn['eval'] =>
  ([a, b]) => {
    const na = toNum(a)
    const nb = toNum(b)
    return op(na, nb)
  }

const cmp =
  (cmpFn: (a: number | string, b: number | string) => boolean): BuiltinFn['eval'] =>
  ([a, b]) => {
    const na = toNum(a)
    const nb = toNum(b)
    const useNumber = Number.isFinite(na) && Number.isFinite(nb)
    const left: number | string = useNumber ? na : String(a ?? '')
    const right: number | string = useNumber ? nb : String(b ?? '')
    return cmpFn(left, right)
  }

export const builtins: Record<string, BuiltinFn> = {
  and: {
    name: 'and',
    arity: [1, Infinity],
    returns: 'boolean',
    toJs: (args) => `(${args.join(' && ')})`,
    eval: (args) => args.every(truthy),
  },
  or: {
    name: 'or',
    arity: [1, Infinity],
    returns: 'boolean',
    toJs: (args) => `(${args.join(' || ')})`,
    eval: (args) => args.some(truthy),
  },
  not: {
    name: 'not',
    arity: [1, 1],
    returns: 'boolean',
    toJs: ([a]) => `!(${a})`,
    eval: ([a]) => !truthy(a),
  },
  // toJs 只用于 schema 的 if 可见性条件字符串，由 FormKit 内置的表达式编译器
  // （@formkit/core 的 compile()：一个只认识 && || === !== == != >= <= > < + - * / %
  // 和 $token / $fn(args) 调用的手写迷你解析器）在浏览器端解释执行，不是 new
  // Function/eval——没有函数作用域，不支持 typeof / 正则字面量 / 箭头函数 /
  // 立即执行函数，所以没法把上面 equal() 的第 4 条规则（数字 ↔ 纯数字字符串）
  // 内联进生成的 JS，只能退回 JS 原生 ===/!==（该解析器原生支持的操作符）。
  // 这意味着 if 表达式在这一条规则上与 eval()（供 expr 计算字段 / 后端对齐使用）
  // 不一致：eq('10', 10) 在 evalExpr 路径为 true，但用在 visibleIf 条件里
  // （在浏览器里按 === 解释）为 false。这个差异已按任务要求提出，等待决策。
  eq: {
    name: 'eq',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `(${a} === ${b})`,
    eval: ([a, b]) => equal(a, b),
  },
  neq: {
    name: 'neq',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `(${a} !== ${b})`,
    eval: ([a, b]) => !equal(a, b),
  },
  gt: {
    name: 'gt',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `(${a} > ${b})`,
    eval: cmp((a, b) => a > b),
  },
  gte: {
    name: 'gte',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `(${a} >= ${b})`,
    eval: cmp((a, b) => a >= b),
  },
  lt: {
    name: 'lt',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `(${a} < ${b})`,
    eval: cmp((a, b) => a < b),
  },
  lte: {
    name: 'lte',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `(${a} <= ${b})`,
    eval: cmp((a, b) => a <= b),
  },
  contains: {
    name: 'contains',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `String(${a}).includes(${b})`,
    eval: ([a, b]) => String(a ?? '').includes(String(b ?? '')),
  },
  notContains: {
    name: 'notContains',
    arity: [2, 2],
    returns: 'boolean',
    toJs: ([a, b]) => `!String(${a}).includes(${b})`,
    eval: ([a, b]) => !String(a ?? '').includes(String(b ?? '')),
  },
  empty: {
    name: 'empty',
    arity: [1, 1],
    returns: 'boolean',
    toJs: ([a]) => `(${a} == null || ${a} === '')`,
    eval: ([a]) => a === null || a === undefined || a === '',
  },
  notEmpty: {
    name: 'notEmpty',
    arity: [1, 1],
    returns: 'boolean',
    toJs: ([a]) => `(${a} != null && ${a} !== '')`,
    eval: ([a]) => a !== null && a !== undefined && a !== '',
  },
  add: {
    name: 'add',
    arity: [2, 2],
    returns: 'any',
    toJs: ([a, b]) => `(${a} + ${b})`,
    eval: ([a, b]) =>
      typeof a === 'string' || typeof b === 'string'
        ? String(a ?? '') + String(b ?? '')
        : toNum(a) + toNum(b),
  },
  sub: {
    name: 'sub',
    arity: [2, 2],
    returns: 'number',
    toJs: ([a, b]) => `(${a} - ${b})`,
    eval: numBinary((a, b) => a - b),
  },
  mul: {
    name: 'mul',
    arity: [2, 2],
    returns: 'number',
    toJs: ([a, b]) => `(${a} * ${b})`,
    eval: numBinary((a, b) => a * b),
  },
  div: {
    name: 'div',
    arity: [2, 2],
    returns: 'number',
    toJs: ([a, b]) => `(${a} / ${b})`,
    eval: numBinary((a, b) => a / b),
  },
  mod: {
    name: 'mod',
    arity: [2, 2],
    returns: 'number',
    toJs: ([a, b]) => `(${a} % ${b})`,
    eval: numBinary((a, b) => a % b),
  },
  concat: {
    name: 'concat',
    arity: [1, Infinity],
    returns: 'string',
    toJs: (args) => `(${args.join(' + ')})`,
    eval: (args) => args.map((a) => String(a ?? '')).join(''),
  },
  lower: {
    name: 'lower',
    arity: [1, 1],
    returns: 'string',
    toJs: ([a]) => `String(${a}).toLowerCase()`,
    eval: ([a]) => String(a ?? '').toLowerCase(),
  },
  upper: {
    name: 'upper',
    arity: [1, 1],
    returns: 'string',
    toJs: ([a]) => `String(${a}).toUpperCase()`,
    eval: ([a]) => String(a ?? '').toUpperCase(),
  },
  trim: {
    name: 'trim',
    arity: [1, 1],
    returns: 'string',
    toJs: ([a]) => `String(${a}).trim()`,
    eval: ([a]) => String(a ?? '').trim(),
  },
  length: {
    name: 'length',
    arity: [1, 1],
    returns: 'number',
    toJs: ([a]) => `String(${a}).length`,
    eval: ([a]) => String(a ?? '').length,
  },
  coalesce: {
    name: 'coalesce',
    arity: [2, 2],
    returns: 'any',
    toJs: ([a, b]) => `(${a} ?? ${b})`,
    eval: ([a, b]) => (a === null || a === undefined ? b : a),
  },
  // 兜底：原样透传的原始字符串（保证 schema → DSL 无损）
  __raw__: {
    name: '__raw__',
    arity: [1, 1],
    returns: 'any',
    toJs: ([a]) => {
      const str = String(a ?? '')
      return str.replace(/\$get\(\$(\w+)\)/g, "$get('$1')")
    },
    eval: ([a]) => a,
  },
  // 三元条件：if(test, consequent, alternate)
  if: {
    name: 'if',
    arity: [3, 3],
    returns: 'any',
    toJs: ([a, b, c]) => `(${a} ? ${b} : ${c})`,
    eval: ([a, b, c]) => (truthy(a) ? b : c),
  },
  // 求和：可变参数
  sum: {
    name: 'sum',
    arity: [1, Infinity],
    returns: 'number',
    toJs: (args) => `(${args.join(' + ')})`,
    eval: (args) => args.reduce<number>((acc, v) => acc + toNum(v), 0),
  },
  // today() → ISO 日期字符串（yyyy-MM-dd），时区按当前设置的语言（见 expr-env）解析，
  // 而非固定 UTC——否则中国用户晚上 8 点后（UTC 已跨天）会取到昨天的日期。
  today: {
    name: 'today',
    arity: [0, 0],
    returns: 'string',
    // 编译期把当前时区字面量烘进生成的 JS：schema 渲染时不再依赖运行时环境状态，
    // 与 exprToJs 的"一次编译多处执行"语义一致；en-CA 的 format 输出即 yyyy-MM-dd。
    toJs: () => {
      const tz = getExprTimeZone()
      const opts = `{ year: 'numeric', month: '2-digit', day: '2-digit'${tz ? `, timeZone: ${JSON.stringify(tz)}` : ''} }`
      return `new Intl.DateTimeFormat('en-CA', ${opts}).format(new Date())`
    },
    eval: () => formatIsoDate(new Date(), getExprTimeZone()),
  },
  // uuid() → 伪 UUID v4
  uuid: {
    name: 'uuid',
    arity: [0, 0],
    returns: 'string',
    toJs: () =>
      `'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })`,
    eval: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      }),
  },
}

export function getBuiltin(name: string): BuiltinFn | undefined {
  return builtins[name]
}

export function isBuiltin(name: string): boolean {
  return name in builtins
}
