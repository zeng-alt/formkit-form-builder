// ═══ 表达式内置函数注册表 ══════════════════════════════════════════════════════
// 前后端共用的函数名清单：Java 侧实现同名函数即可对齐。
// 每个函数只提供一份实现：eval —— 对已求值的参数做运行时求值（无 new Function，安全）。
// schema 的 if 可见性条件不再单独翻译一套"语义等价"的 JS 算子（那正是过去半数
// 内置函数被 FormKit 算错的根源，见 expr-schema-helpers.ts 顶部说明），而是编译成
// 对这里同一份 eval 的 helper 调用，所以不需要 toJs 字段。

import { formatIsoDate, getExprTimeZone } from './expr-env'

interface BuiltinFn {
  name: string
  /** 参数数量范围 [min, max]，max 为 Infinity 表示可变 */
  arity: [number, number]
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
    eval: (args) => args.every(truthy),
  },
  or: {
    name: 'or',
    arity: [1, Infinity],
    returns: 'boolean',
    eval: (args) => args.some(truthy),
  },
  not: {
    name: 'not',
    arity: [1, 1],
    returns: 'boolean',
    eval: ([a]) => !truthy(a),
  },
  // schema 的 if 条件与这里的 eval 共用同一份实现（见 expr-schema-helpers.ts）：
  // exprToJs 把 eq/neq 编译成 helper 调用，运行时直接跑下面这份 equal()，
  // 因此 eq('10', 10) 在 evalExpr 与 visibleIf 两条路径上的结果始终一致，
  // 不存在"翻译成 JS 算子后语义跑偏"的问题。
  eq: {
    name: 'eq',
    arity: [2, 2],
    returns: 'boolean',
    eval: ([a, b]) => equal(a, b),
  },
  neq: {
    name: 'neq',
    arity: [2, 2],
    returns: 'boolean',
    eval: ([a, b]) => !equal(a, b),
  },
  gt: {
    name: 'gt',
    arity: [2, 2],
    returns: 'boolean',
    eval: cmp((a, b) => a > b),
  },
  gte: {
    name: 'gte',
    arity: [2, 2],
    returns: 'boolean',
    eval: cmp((a, b) => a >= b),
  },
  lt: {
    name: 'lt',
    arity: [2, 2],
    returns: 'boolean',
    eval: cmp((a, b) => a < b),
  },
  lte: {
    name: 'lte',
    arity: [2, 2],
    returns: 'boolean',
    eval: cmp((a, b) => a <= b),
  },
  contains: {
    name: 'contains',
    arity: [2, 2],
    returns: 'boolean',
    eval: ([a, b]) => String(a ?? '').includes(String(b ?? '')),
  },
  notContains: {
    name: 'notContains',
    arity: [2, 2],
    returns: 'boolean',
    eval: ([a, b]) => !String(a ?? '').includes(String(b ?? '')),
  },
  empty: {
    name: 'empty',
    arity: [1, 1],
    returns: 'boolean',
    eval: ([a]) => a === null || a === undefined || a === '',
  },
  notEmpty: {
    name: 'notEmpty',
    arity: [1, 1],
    returns: 'boolean',
    eval: ([a]) => a !== null && a !== undefined && a !== '',
  },
  add: {
    name: 'add',
    arity: [2, 2],
    returns: 'any',
    eval: ([a, b]) =>
      typeof a === 'string' || typeof b === 'string'
        ? String(a ?? '') + String(b ?? '')
        : toNum(a) + toNum(b),
  },
  sub: {
    name: 'sub',
    arity: [2, 2],
    returns: 'number',
    eval: numBinary((a, b) => a - b),
  },
  mul: {
    name: 'mul',
    arity: [2, 2],
    returns: 'number',
    eval: numBinary((a, b) => a * b),
  },
  div: {
    name: 'div',
    arity: [2, 2],
    returns: 'number',
    eval: numBinary((a, b) => a / b),
  },
  mod: {
    name: 'mod',
    arity: [2, 2],
    returns: 'number',
    eval: numBinary((a, b) => a % b),
  },
  concat: {
    name: 'concat',
    arity: [1, Infinity],
    returns: 'string',
    eval: (args) => args.map((a) => String(a ?? '')).join(''),
  },
  lower: {
    name: 'lower',
    arity: [1, 1],
    returns: 'string',
    eval: ([a]) => String(a ?? '').toLowerCase(),
  },
  upper: {
    name: 'upper',
    arity: [1, 1],
    returns: 'string',
    eval: ([a]) => String(a ?? '').toUpperCase(),
  },
  trim: {
    name: 'trim',
    arity: [1, 1],
    returns: 'string',
    eval: ([a]) => String(a ?? '').trim(),
  },
  length: {
    name: 'length',
    arity: [1, 1],
    returns: 'number',
    eval: ([a]) => String(a ?? '').length,
  },
  coalesce: {
    name: 'coalesce',
    arity: [2, 2],
    returns: 'any',
    eval: ([a, b]) => (a === null || a === undefined ? b : a),
  },
  // 兜底：原样透传的原始字符串（保证 schema → DSL 无损）。exprToJs 对 __raw__ 特殊
  // 处理、不走 helper 调用，这里的 eval 只服务 evalExpr 路径。
  __raw__: {
    name: '__raw__',
    arity: [1, 1],
    returns: 'any',
    eval: ([a]) => a,
  },
  // 三元条件：if(test, consequent, alternate)
  if: {
    name: 'if',
    arity: [3, 3],
    returns: 'any',
    eval: ([a, b, c]) => (truthy(a) ? b : c),
  },
  // 求和：可变参数
  sum: {
    name: 'sum',
    arity: [1, Infinity],
    returns: 'number',
    eval: (args) => args.reduce<number>((acc, v) => acc + toNum(v), 0),
  },
  // today() → ISO 日期字符串（yyyy-MM-dd），时区按当前设置的语言（见 expr-env）解析，
  // 而非固定 UTC——否则中国用户晚上 8 点后（UTC 已跨天）会取到昨天的日期。
  // 改走 helper 调用后不再需要在编译期把时区字面量烘进生成的 JS：每次渲染时都会
  // 实时读取 getExprTimeZone() 当前值，语言切换后 if 条件里的 today() 无需重新
  // 编译 schema 就能生效，比原来"编译时快照时区"的行为更符合直觉。
  today: {
    name: 'today',
    arity: [0, 0],
    returns: 'string',
    eval: () => formatIsoDate(new Date(), getExprTimeZone()),
  },
  // uuid() → 伪 UUID v4
  uuid: {
    name: 'uuid',
    arity: [0, 0],
    returns: 'string',
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
