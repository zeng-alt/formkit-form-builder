// ═══ 表达式 AST → 可读源码（面板显示用），与 parseExprString 互逆 ═══════════════════
import { describe, expect, it } from 'vitest'
import { evalExpr, exprToJs, exprToSource, parseExprString } from '@/dsl'

const roundTrip = (src: string) => exprToSource(parseExprString(src))

describe('exprToSource', () => {
  it('条件渲染显示成用户写的形式，而不是 $fkb_ helper 调用', () => {
    const ast = parseExprString('$field_1 == "123"')
    expect(exprToJs(ast)).toContain('$fkb_eq')
    expect(exprToSource(ast)).toBe('$field_1 == "123"')
  })

  it.each([
    '$a == "123"',
    '$age >= 18 && $vip != true',
    '!$agree || $a < 3',
    '$a + "-" + $b',
    '($a + $b) * 2',
    '$a - ($b - $c)',
    '$a % 2 == 0',
    '-$a + 1',
    '$a > 1 ? "大" : "小"',
    'contains($name, "张")',
    'empty($b) && notEmpty($c)',
    'concat($a, "-", $b)',
    'today()',
    '!($a && $b)',
  ])('往返：%s', (src) => {
    const once = roundTrip(src)
    // 输出能被解析回同一棵 AST
    expect(parseExprString(once)).toEqual(parseExprString(src))
    // 输出本身是稳定的（再往返一次不变）
    expect(roundTrip(once)).toBe(once)
  })

  it('优先级：只在需要时加括号', () => {
    expect(roundTrip('$a + $b * 2')).toBe('$a + $b * 2')
    expect(roundTrip('($a + $b) * 2')).toBe('($a + $b) * 2')
    expect(roundTrip('$a - ($b - $c)')).toBe('$a - ($b - $c)')
    expect(roundTrip('$a - $b - $c')).toBe('$a - $b - $c')
  })

  it('解析失败的原始字符串原样显示', () => {
    expect(roundTrip('$a +')).toBe('$a +')
  })
})

describe('parseExprString 扩展', () => {
  it('中文引号“”‘’当作字符串，+ 拼接正常', () => {
    const r = evalExpr(parseExprString('$name + “先生”'), { name: '张' })
    expect(r.ok && r.value).toBe('张先生')
    const r2 = evalExpr(parseExprString('‘编号-’ + $id'), { id: 7 })
    expect(r2.ok && r2.value).toBe('编号-7')
  })

  it('% 取余', () => {
    const r = evalExpr(parseExprString('$n % 3'), { n: 10 })
    expect(r.ok && r.value).toBe(1)
  })

  it('内置函数的普通调用写法', () => {
    const r = evalExpr(parseExprString('contains($name, "张")'), { name: '张三' })
    expect(r.ok && r.value).toBe(true)
    // 不认识的函数名仍然按解析失败处理（原样保留）
    expect(parseExprString('foo($a)')).toMatchObject({ fn: '__raw__' })
  })
})
