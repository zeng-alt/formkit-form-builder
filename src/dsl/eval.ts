// ═══ 表达式 AST 解释器 ═════════════════════════════════════════════════════════
// 替代旧的 new Function 求值：对可移植表达式 AST 做安全解释执行。

import type { Expr } from '../types/dsl'
import { getBuiltin } from './expr-builtins'

export type EvalResult =
  | { ok: true; value: unknown; deps: string[] }
  | { ok: false; error: string; deps: string[] }

export function evalExpr(expr: Expr, data: Record<string, unknown>): EvalResult {
  const deps = new Set<string>()

  const evalNode = (node: Expr): { ok: true; value: unknown } | { ok: false; error: string } => {
    switch (node.type) {
      case 'literal':
        return { ok: true, value: node.value }
      case 'field': {
        deps.add(node.name)
        return { ok: true, value: data[node.name] }
      }
      case 'call': {
        const builtin = getBuiltin(node.fn)
        if (!builtin) return { ok: false, error: `未知函数: ${node.fn}` }
        const args: unknown[] = []
        for (const arg of node.args) {
          const r = evalNode(arg)
          if (!r.ok) return r
          args.push(r.value)
        }
        let value: unknown
        try {
          value = builtin.eval(args)
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : '表达式求值失败' }
        }
        return { ok: true, value }
      }
    }
  }

  const result = evalNode(expr)
  return result.ok
    ? { ok: true, value: result.value, deps: Array.from(deps) }
    : { ok: false, error: result.error, deps: Array.from(deps) }
}
