// ═══ 表达式 AST → 可读源码 ═════════════════════════════════════════════════════
// 给右侧面板显示用：把条件渲染（visibleIf）等存成 AST 的表达式还原成用户写的形式，
// 如 `$field_1 == "123"`、`$age >= 18 && !empty($name)`。exprToJs（compile.ts）产出的是给
// FormKit 运行时用的 `$fkb_eq(...)` helper 调用，不适合给人看。
// 输出必须能被 parseExprString 原样解析回同一棵 AST（见 expr-source.test.ts 的往返测试）。

import type { Expr } from '../types/dsl'

// 二元运算符与优先级（数值越大绑定越紧），与 parseExprString 的分层一致：
// 条件 ?: (1) < || (2) < && (3) < == != (4) < > >= < <= (5) < + - (6) < * / % (7) < 一元 (8) < 原子 (9)
const BINARY: Record<string, { op: string; prec: number }> = {
  or: { op: '||', prec: 2 },
  and: { op: '&&', prec: 3 },
  eq: { op: '==', prec: 4 },
  neq: { op: '!=', prec: 4 },
  gt: { op: '>', prec: 5 },
  gte: { op: '>=', prec: 5 },
  lt: { op: '<', prec: 5 },
  lte: { op: '<=', prec: 5 },
  add: { op: '+', prec: 6 },
  sub: { op: '-', prec: 6 },
  mul: { op: '*', prec: 7 },
  div: { op: '/', prec: 7 },
  mod: { op: '%', prec: 7 },
}

const PREC_CONDITIONAL = 1
const PREC_UNARY = 8
const PREC_ATOM = 9

const isZeroLiteral = (e: Expr | undefined) => e?.type === 'literal' && e.value === 0

function print(expr: Expr): { text: string; prec: number } {
  switch (expr.type) {
    case 'literal':
      return {
        text: expr.value === undefined ? 'null' : JSON.stringify(expr.value),
        prec: PREC_ATOM,
      }
    case 'field':
      return { text: `$${expr.name}`, prec: PREC_ATOM }
    case 'call': {
      const { fn, args } = expr
      if (fn === '__raw__') {
        // 解析失败时保留的原始字符串：原样显示，让用户看到并修改自己写的内容
        const raw = args[0]
        const text = raw?.type === 'literal' ? String(raw.value ?? '') : ''
        return { text, prec: PREC_CONDITIONAL - 1 }
      }
      const bin = BINARY[fn]
      if (bin && args.length === 2) {
        // 一元负号在 AST 里是 sub(0, x)，还原成 -x（解析回去仍是 sub(0, x)）
        if (fn === 'sub' && isZeroLiteral(args[0])) {
          return { text: `-${wrap(args[1]!, PREC_UNARY)}`, prec: PREC_UNARY }
        }
        // 左结合：左侧同级不加括号，右侧同级必须加括号（a - (b - c) 不能写成 a - b - c）
        const left = wrap(args[0]!, bin.prec)
        const right = wrap(args[1]!, bin.prec + 1)
        return { text: `${left} ${bin.op} ${right}`, prec: bin.prec }
      }
      if (fn === 'not' && args.length === 1) {
        return { text: `!${wrap(args[0]!, PREC_UNARY)}`, prec: PREC_UNARY }
      }
      if (fn === 'if' && args.length === 3) {
        // 解析器的真 / 假分支按 || 层解析，嵌套条件表达式需要括号
        const [test, yes, no] = args as [Expr, Expr, Expr]
        return {
          text: `${wrap(test, 2)} ? ${wrap(yes, 2)} : ${wrap(no, 2)}`,
          prec: PREC_CONDITIONAL,
        }
      }
      // 其余内置函数按普通函数调用显示：contains($a, "x")、empty($b)、today()
      return { text: `${fn}(${args.map((a) => print(a).text).join(', ')})`, prec: PREC_ATOM }
    }
  }
}

function wrap(expr: Expr, minPrec: number): string {
  const { text, prec } = print(expr)
  return prec >= minPrec ? text : `(${text})`
}

/** 表达式 AST → 可读源码（与 parseExprString 互逆） */
export function exprToSource(expr: Expr): string {
  return print(expr).text
}

/** parseExprString 解析失败时会返回 __raw__ 兜底节点：用来在面板上提示「无法解析」 */
export function isUnparsedExpr(expr: Expr): boolean {
  return expr.type === 'call' && expr.fn === '__raw__'
}
