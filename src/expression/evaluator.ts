// ═══ 表达式编译 + 求值 ═════════════════════════════════════════════════════════
// 编译缓存：parseExprString 一次 → AST；evalExpr 每次用最新 data 求值。

import { parseExprString, evalExpr } from '../dsl'
import type { Expr } from '../types/dsl'

export interface CompiledExpr {
  /** 编译后的 AST */
  ast: Expr
  /** 依赖字段名（去重） */
  deps: string[]
  /** 直接用 data 求值 */
  evaluate: (data: Record<string, unknown>) => unknown
}

/**
 * 编译表达式字符串为可复用的 CompiledExpr。
 * parseExprString 失败时抛出异常，调用方应捕获。
 */
export function compileExpr(expr: string): CompiledExpr {
  const ast = parseExprString(expr)
  const { deps } = evalExpr(ast, {})
  return {
    ast,
    deps,
    evaluate: (data: Record<string, unknown>) => {
      const result = evalExpr(ast, data)
      if (!result.ok) throw new Error(result.error)
      return result.value
    },
  }
}
