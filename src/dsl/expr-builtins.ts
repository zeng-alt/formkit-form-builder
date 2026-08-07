// ═══ 表达式内置函数注册表 ══════════════════════════════════════════════════════
// 前后端共用的函数名清单：Java 侧实现同名函数即可对齐。
// 每个函数同时提供：
//   - toJs: 编译参数 JS 字符串 → 最终 JS 表达式（用于 FormKit schema 的 if）
//   - eval: 对已求值的参数做运行时求值（无 new Function，安全）

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

// 与旧解释器对齐的相等语义：两者可数值化则按数值比较，否则字符串比较
const equal = (a: unknown, b: unknown): boolean => {
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true
  const na = toNum(a)
  const nb = toNum(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb
  return String(a ?? '') === String(b ?? '')
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
  // today() → ISO 日期字符串（yyyy-MM-dd）
  today: {
    name: 'today',
    arity: [0, 0],
    returns: 'string',
    toJs: () => `new Date().toISOString().slice(0, 10)`,
    eval: () => new Date().toISOString().slice(0, 10),
  },
  // uuid() → 伪 UUID v4
  uuid: {
    name: 'uuid',
    arity: [0, 0],
    returns: 'string',
    toJs: () => `'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })`,
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
