// ═══ 表达式内置函数（运行时扩展） ══════════════════════════════════════════════
// 扩展 src/dsl/expr-builtins.ts 的内置函数集，供 runtime 使用。
// 注册新函数时同步更新 src/dsl/expr-builtins.ts 以保持 AST 求值一致。

export { builtins, getBuiltin, isBuiltin } from '../dsl/expr-builtins'
export type { BuiltinFn } from '../dsl/expr-builtins'
