// ═══ 表达式 AST：解析 / 编译 / 求值 / today() 时区 ═════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  parseExprString,
  exprToJs,
  evalExpr,
  getBuiltin,
  setExprLocale,
  getExprLocale,
  resolveTimeZoneForLocale,
  formatIsoDate,
} from '@/dsl'

describe('parseExprString / exprToJs / evalExpr', () => {
  it("$a > 1 && $b == 'x'", () => {
    const ast = parseExprString(`$a > 1 && $b == 'x'`)
    expect(ast).toEqual({
      type: 'call',
      fn: 'and',
      args: [
        {
          type: 'call',
          fn: 'gt',
          args: [
            { type: 'field', name: 'a' },
            { type: 'literal', value: 1 },
          ],
        },
        {
          type: 'call',
          fn: 'eq',
          args: [
            { type: 'field', name: 'b' },
            { type: 'literal', value: 'x' },
          ],
        },
      ],
    })
    expect(exprToJs(ast)).toBe('(($a > 1) && ($b === "x"))')
    const result = evalExpr(ast, { a: 2, b: 'x' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(true)
    expect(result.deps.sort()).toEqual(['a', 'b'])
  })

  it('$a ? 1 : 2', () => {
    const ast = parseExprString('$a ? 1 : 2')
    expect(ast).toEqual({
      type: 'call',
      fn: 'if',
      args: [
        { type: 'field', name: 'a' },
        { type: 'literal', value: 1 },
        { type: 'literal', value: 2 },
      ],
    })
    expect(exprToJs(ast)).toBe('($a ? 1 : 2)')
    expect(evalExpr(ast, { a: true })).toMatchObject({ ok: true, value: 1 })
    expect(evalExpr(ast, { a: false })).toMatchObject({ ok: true, value: 2 })
  })

  it('!$a', () => {
    const ast = parseExprString('!$a')
    expect(ast).toEqual({
      type: 'call',
      fn: 'not',
      args: [{ type: 'field', name: 'a' }],
    })
    expect(exprToJs(ast)).toBe('!($a)')
    expect(evalExpr(ast, { a: true })).toMatchObject({ ok: true, value: false })
  })

  it('$price * $count + 1', () => {
    const ast = parseExprString('$price * $count + 1')
    expect(ast).toEqual({
      type: 'call',
      fn: 'add',
      args: [
        {
          type: 'call',
          fn: 'mul',
          args: [
            { type: 'field', name: 'price' },
            { type: 'field', name: 'count' },
          ],
        },
        { type: 'literal', value: 1 },
      ],
    })
    expect(exprToJs(ast)).toBe('(($price * $count) + 1)')
    const result = evalExpr(ast, { price: 3, count: 4 })
    expect(result).toMatchObject({ ok: true, value: 13 })
  })

  it('($a || $b) && !$c', () => {
    const ast = parseExprString('($a || $b) && !$c')
    expect(ast).toEqual({
      type: 'call',
      fn: 'and',
      args: [
        {
          type: 'call',
          fn: 'or',
          args: [
            { type: 'field', name: 'a' },
            { type: 'field', name: 'b' },
          ],
        },
        {
          type: 'call',
          fn: 'not',
          args: [{ type: 'field', name: 'c' }],
        },
      ],
    })
    expect(exprToJs(ast)).toBe('(($a || $b) && !($c))')
    expect(evalExpr(ast, { a: false, b: true, c: false })).toMatchObject({ ok: true, value: true })
  })

  it('不可解析输入（语法错误）落到 __raw__，exprToJs 原样返回字符串', () => {
    const input = '$a +* 1'
    const ast = parseExprString(input)
    expect(ast).toEqual({
      type: 'call',
      fn: '__raw__',
      args: [{ type: 'literal', value: input }],
    })
    expect(exprToJs(ast)).toBe(input)
  })

  it('不可解析输入（未知函数调用语法）落到 __raw__，exprToJs 原样返回字符串', () => {
    const input = 'someUnknownFn($a)'
    const ast = parseExprString(input)
    expect(ast).toEqual({
      type: 'call',
      fn: '__raw__',
      args: [{ type: 'literal', value: input }],
    })
    expect(exprToJs(ast)).toBe(input)
  })
})

describe('today() 时区解析（expr-env）', () => {
  const originalLocale = getExprLocale()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T20:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    setExprLocale(originalLocale)
  })

  // 注：parseExprString 的手写文法只支持 "$xxx()" 空参占位与 String(...) 包装，
  // 不支持通用 "fnName(...)" 调用语法（如 'today()' 会落到 __raw__ 原样透传），
  // 因此直接经 getBuiltin('today') 求值，与 evalExpr 对 call 节点的求值路径等价。
  it('zh-CN：UTC 20:00 已跨入上海时区次日', () => {
    setExprLocale('zh-CN')
    const ast = { type: 'call', fn: 'today', args: [] } as const
    const result = evalExpr(ast, {})
    expect(result).toMatchObject({ ok: true, value: '2026-01-02' })
    expect(getBuiltin('today')!.eval([])).toBe('2026-01-02')
  })

  it('en：无映射，回落浏览器本地时区（不硬编码，CI 时区未知）', () => {
    setExprLocale('en')
    const expected = formatIsoDate(new Date(), undefined)
    const ast = { type: 'call', fn: 'today', args: [] } as const
    const result = evalExpr(ast, {})
    expect(result).toMatchObject({ ok: true, value: expected })
  })

  it('resolveTimeZoneForLocale：精确匹配 / 前缀匹配 / 无映射', () => {
    expect(resolveTimeZoneForLocale('zh-CN')).toBe('Asia/Shanghai')
    expect(resolveTimeZoneForLocale('zh')).toBe('Asia/Shanghai')
    expect(resolveTimeZoneForLocale('zh-SG')).toBe('Asia/Shanghai')
    expect(resolveTimeZoneForLocale('en')).toBeUndefined()
    expect(resolveTimeZoneForLocale(undefined)).toBeUndefined()
  })

  it('formatIsoDate：非法时区不抛错，回退本地时区', () => {
    expect(() => formatIsoDate(new Date('2026-01-01T20:00:00Z'), 'Not/AZone')).not.toThrow()
    const value = formatIsoDate(new Date('2026-01-01T20:00:00Z'), 'Not/AZone')
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('today() 的 toJs：zh-CN 时烘入 timeZone 字面量，en 时不含 timeZone', () => {
    setExprLocale('zh-CN')
    const zhJs = getBuiltin('today')!.toJs([])
    expect(zhJs).toContain(`timeZone: "Asia/Shanghai"`)

    setExprLocale('en')
    const enJs = getBuiltin('today')!.toJs([])
    expect(enJs).not.toContain('timeZone')
  })
})
