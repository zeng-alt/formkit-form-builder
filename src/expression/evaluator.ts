// ═══ 表达式编译 + 求值 ═════════════════════════════════════════════════════════
// 编译缓存：parseExprString 一次 → AST；evalExpr 每次用最新 data 求值。

import { parseExprString, evalExpr } from '../dsl'
import type { Expr } from '../types/dsl'
import { lookupFieldValue } from '../utils/schema/form-data'

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
      // evalExpr（dsl/eval.ts）是纯函数，字段引用直接 `data[node.name]`——DSL 层
      // 按设计只认"字段名"，不关心它落在数据树的哪一层，也不应该关心（后端对齐
      // 的参照物，不为这里的渲染细节改签名）。dataStructure:'nested' 下容器子
      // 字段被 dslToOutputSchema 嵌套进同名 group（见 schema-adapter.ts 的
      // wrapNodeWithGroup），依赖字段未必落在 data 根层，所以在真正喂给 evalExpr
      // 之前，先按 deps（已知、有限的依赖集合）用 lookupFieldValue 逐个按名字在
      // 整棵表单数据里解析出来，拼成一个只含这些依赖的扁平对象——不需要给 evalExpr
      // 包一层按名查找的 Proxy（那样每次属性访问都要过一遍代理逻辑，deps 又是
      // 编译期已知的有限集合，预解析成扁平对象更直接、开销也更可控）。
      const resolved: Record<string, unknown> = {}
      for (const dep of deps) resolved[dep] = lookupFieldValue(data, dep)
      const result = evalExpr(ast, resolved)
      if (!result.ok) throw new Error(result.error)
      return result.value
    },
  }
}
