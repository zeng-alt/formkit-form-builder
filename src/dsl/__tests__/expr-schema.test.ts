// ═══ exprToJs 产出的字符串必须能被 FormKit 的 compile() 正确执行 ═══════════════════
// 这是本文件存在的唯一理由：expr.test.ts 只断言 exprToJs 产出的字符串"长什么样"，
// 从来没有验证过 FormKit 能不能正确执行它——这正是 not/if/coalesce/contains 四个
// 内置函数被静默算错、却一直没被测试发现的原因（旧版把它们分别翻译成 !()、三元、
// ??、String().includes()，FormKit 自带的迷你表达式解析器不支持三元和 ??、把一元 !
// 解释反了、include() 返回值又不是布尔）。
//
// 这里直接把 exprToJs(ast) 产出的字符串喂给 @formkit/core 的 compile()，和
// evalExpr(ast, data) 的结果做深比较：只要两边用同一份 data 却算出不同结果，
// 就说明 if 可见性条件在浏览器里的真实行为和设计器 / 后端预览的不一致，这正是
// 用户会实际遇到的 bug。

import { describe, it, expect } from 'vitest'
import { compile } from '@formkit/core'
import type { Expr } from '@/types/dsl'
import { exprToJs, evalExpr } from '@/dsl'
import { builtins } from '@/dsl/expr-builtins'
import { EXPR_SCHEMA_HELPERS } from '@/dsl/expr-schema-helpers'

// ─── AST 构造小工具 ────────────────────────────────────────────────────────────
const field = (name: string): Expr => ({ type: 'field', name })
const lit = (value: unknown): Expr => ({ type: 'literal', value })
const call = (fn: string, args: Expr[]): Expr => ({ type: 'call', fn, args })

// ─── 测试数据：字段 token → 值，与 evalExpr 的 data 参数是同一份 ─────────────────
const DATA: Record<string, unknown> = {
  a: 5,
  b: 'x',
  c: '',
  flag: true,
  nil: null,
}

// 按 FormKitSchema 实际的 data 组织方式：字段值 + EXPR_SCHEMA_HELPERS 合并
// （helper 在后，同 FormRenderer / ContainerChildrenGrid 里的合并顺序）。
function runInFormKit(js: string, fieldData: Record<string, unknown>): unknown {
  const scope: Record<string, unknown> = { ...fieldData, ...EXPR_SCHEMA_HELPERS }
  return compile(js).provide((tokens: string[]) =>
    tokens.reduce<Record<string, () => unknown>>((acc, t) => {
      acc[t] = () => scope[t]
      return acc
    }, {}),
  )()
}

// ─── 每个内置函数的参数 fixture ─────────────────────────────────────────────────
// 覆盖 DATA 里各种类型（number/string/boolean/null），没单独列出的函数落到
// DEFAULT_ARGS（2 个字段参数，适配 arity 落在 [1,2] 区间的函数）。today/uuid
// 无参数或返回不确定值，不在这里列出，单独处理（见下方专门的 describe）。
const FIXTURES: Partial<Record<string, Expr[]>> = {
  and: [field('flag'), lit(true)],
  or: [lit(false), field('flag')],
  not: [field('flag')],
  eq: [field('a'), lit(5)],
  neq: [field('a'), lit(6)],
  gt: [field('a'), lit(1)],
  gte: [field('a'), lit(5)],
  lt: [field('a'), lit(10)],
  lte: [field('a'), lit(5)],
  contains: [field('b'), lit('x')],
  notContains: [field('b'), lit('y')],
  empty: [field('c')],
  notEmpty: [field('b')],
  add: [field('a'), lit(1)],
  sub: [field('a'), lit(1)],
  mul: [field('a'), lit(2)],
  div: [field('a'), lit(2)],
  mod: [field('a'), lit(3)],
  concat: [field('b'), lit('!')],
  lower: [lit('ABC')],
  upper: [field('b')],
  trim: [lit('  x  ')],
  length: [field('b')],
  coalesce: [field('b'), lit('fallback')],
  if: [field('flag'), lit(1), lit(2)],
  sum: [field('a'), lit(1), lit(2)],
}

// 兜底参数：适配大多数二元/变长内置函数（arity 下限 ≤ 2）
const DEFAULT_ARGS: Expr[] = [field('a'), field('b')]

// __raw__ 不走 helper 调用形式（exprToJs 原样透传字符串），today/uuid 输出不确定，
// 三者都在通用循环之外单独处理。
const SPECIAL_CASED = new Set(['__raw__', 'today', 'uuid'])
const GENERIC_FN_NAMES = Object.keys(builtins).filter((name) => !SPECIAL_CASED.has(name))

describe('exprToJs 生成的 helper 调用在 FormKit compile() 里执行，结果与 evalExpr 一致', () => {
  // 遍历 builtins 而不是手写函数名清单：以后新增内置函数会自动被这个循环覆盖，
  // 漏掉 toJs/helper 接线会直接在这里挂掉，而不是像这次一样悄悄流入生产。
  it.each(GENERIC_FN_NAMES)('%s：helper 调用结果与 evalExpr 深相等', (fnName) => {
    const args = FIXTURES[fnName] ?? DEFAULT_ARGS
    const ast = call(fnName, args)

    const expected = evalExpr(ast, DATA)
    expect(expected.ok).toBe(true)

    const js = exprToJs(ast)
    const actual = runInFormKit(js, DATA)

    expect(actual).toEqual(expected.ok ? expected.value : undefined)
  })

  it('确实覆盖了 builtins 里除 __raw__/today/uuid 外的全部函数（防止 fixture 名单和 builtins 脱节）', () => {
    expect(GENERIC_FN_NAMES.sort()).toEqual(
      Object.keys(builtins)
        .filter((n) => !SPECIAL_CASED.has(n))
        .sort(),
    )
    expect(GENERIC_FN_NAMES.length).toBeGreaterThan(0)
  })
})

// ─── 回归用例：实测确认过被 FormKit 算错的 4 个函数 ─────────────────────────────
// 这四个是本次修复前用 compile(expr).provide(...) 实测过的真实 bug，单独写成可读的
// 断言，不依赖上面通用循环的深比较，方便一眼看出"应该是什么、以前实际是什么"。
describe('回归：之前被 FormKit 静默算错的 4 个内置函数', () => {
  it('not：逻辑不能反转（旧版 !($flag) 在 compile() 里被解释反了）', () => {
    const ast = call('not', [field('flag')])
    const js = exprToJs(ast)
    // DATA.flag = true，not(true) 必须是 false
    expect(runInFormKit(js, DATA)).toBe(false)
    expect(evalExpr(ast, DATA)).toMatchObject({ ok: true, value: false })
  })

  it('if：必须返回对应分支的值（旧版三元语法 compile() 不支持，返回 undefined）', () => {
    const ast = call('if', [field('flag'), lit('yes'), lit('no')])
    const js = exprToJs(ast)
    expect(runInFormKit(js, DATA)).toBe('yes')
    expect(evalExpr(ast, DATA)).toMatchObject({ ok: true, value: 'yes' })
  })

  it('coalesce：非空左值应直接取到左值（旧版 ?? 语法 compile() 不支持，返回 undefined）', () => {
    const ast = call('coalesce', [field('b'), lit('fallback')])
    const js = exprToJs(ast)
    // DATA.b = 'x'，非 null/undefined，应取左值而不是 fallback
    expect(runInFormKit(js, DATA)).toBe('x')
    expect(evalExpr(ast, DATA)).toMatchObject({ ok: true, value: 'x' })
  })

  it('contains：必须返回布尔值，不是命中的子串本身（旧版 String().includes() 在这个解析器里被当成返回值直接透出）', () => {
    const ast = call('contains', [field('b'), lit('x')])
    const js = exprToJs(ast)
    const result = runInFormKit(js, DATA)
    expect(result).toBe(true)
    expect(typeof result).toBe('boolean')
    expect(evalExpr(ast, DATA)).toMatchObject({ ok: true, value: true })
  })
})

// ─── 嵌套 / 混合内置函数调用 ─────────────────────────────────────────────────────
describe('嵌套调用：helper 调用可以互相嵌套，与 evalExpr 语义一致', () => {
  it('not(eq($a, 5))', () => {
    const ast = call('not', [call('eq', [field('a'), lit(5)])])
    const js = exprToJs(ast)
    const expected = evalExpr(ast, DATA)
    expect(expected).toMatchObject({ ok: true, value: false })
    expect(runInFormKit(js, DATA)).toBe(expected.ok ? expected.value : undefined)
  })

  it('and(eq($a,5), gt($b,1))', () => {
    const ast = call('and', [call('eq', [field('a'), lit(5)]), call('gt', [field('b'), lit(1)])])
    const js = exprToJs(ast)
    const expected = evalExpr(ast, DATA)
    expect(expected.ok).toBe(true)
    expect(runInFormKit(js, DATA)).toEqual(expected.ok ? expected.value : undefined)
  })

  it("if(empty($c), 'x', $b)（题面里的 isEmpty 即本库的 empty 内置函数）", () => {
    const ast = call('if', [call('empty', [field('c')]), lit('x'), field('b')])
    const js = exprToJs(ast)
    const expected = evalExpr(ast, DATA)
    // DATA.c = ''，empty($c) 为 true，应取 'x' 分支
    expect(expected).toMatchObject({ ok: true, value: 'x' })
    expect(runInFormKit(js, DATA)).toBe(expected.ok ? expected.value : undefined)
  })
})

// ─── today / uuid：输出不确定，只能断言"形态合法"而非精确相等 ───────────────────
// today() 依赖 Date.now()（虽然 evalExpr 和 runInFormKit 几乎同时调用，但理论上可能
// 跨越日期边界，用精确相等会有极小概率的 flake）；uuid() 每次调用都用 Math.random()
// 生成新值，两次调用永远不相等，因此都只校验返回值的格式合法，不比较具体值。
describe('today / uuid：格式断言（输出本身不确定，不能比较具体值）', () => {
  it('today()：evalExpr 与 FormKit 两边都应为合法的 yyyy-MM-dd', () => {
    const ast = call('today', [])
    const expected = evalExpr(ast, DATA)
    expect(expected.ok).toBe(true)
    expect(expected.ok && expected.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const actual = runInFormKit(exprToJs(ast), DATA)
    expect(actual).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uuid()：evalExpr 与 FormKit 两边都应为合法的 uuid v4 形态', () => {
    const ast = call('uuid', [])
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

    const expected = evalExpr(ast, DATA)
    expect(expected.ok).toBe(true)
    expect(expected.ok && expected.value).toMatch(uuidRe)

    const actual = runInFormKit(exprToJs(ast), DATA)
    expect(actual).toMatch(uuidRe)
  })
})
