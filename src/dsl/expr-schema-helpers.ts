// ═══ schema 表达式 helper：让 if 条件与 evalExpr 共用同一份内置函数实现 ══════════
// FormKit v2 schema 的 `if` 字符串不是用 eval/new Function 跑的，而是交给
// @formkit/core 自带的 compile()——一个手写的迷你表达式解析器，operatorRegistry
// 只有 && || === !== == != >= <= > < + - * / %，没有三元 ?:、没有 ??、没有一元 !、
// 没有 typeof、没有正则字面量。旧版 exprToJs 曾把每个内置函数手工翻译成"语义等价"
// 的 JS 算子组合（not → !、if → 三元、contains → String().includes()、
// coalesce → ??），但这套翻译从未验证过能否在这个迷你解析器里正确跑通——
// 三元和 ?? 它压根不支持，会静默返回 undefined；一元 ! 会被它当成语法错误之外的
// 东西处理，实测直接把结果反转成相反的布尔值；contains 返回的是字符串而不是
// 布尔值。这些偏差只有真的把生成的字符串喂给 compile() 跑一遍才能发现，逐个
// 人工比对"这个算子语义是否碰巧等价"本身就是不可靠的做法。
//
// 现在的策略：exprToJs 把所有内置函数一律编译成 `$fkb_<fn>(arg1, arg2, ...)`
// 形式的函数调用——compile() 原生支持 `$token(args)` 语法，token 通过
// FormKitSchema 的 data 解析。EXPR_SCHEMA_HELPERS 就是这份 data：每个 helper
// 直接委托同名内置函数的 eval()，因此 if 条件与 evalExpr（表达式计算字段 /
// 设计器实时预览）永远走同一份求值逻辑——两者是否一致由"共用同一个函数"保证，
// 不再需要人工核对两套独立实现的语义是否等价。

import { builtins } from './expr-builtins'

/**
 * schema 表达式里 helper 函数的 token 前缀。这是保留字：字段名不能以此开头，
 * 否则会被 FormKitSchema data 里同名的 helper 覆盖，导致 if 条件静默失效
 * （见 NameInput 里对字段名的第四条校验规则）。
 */
export const EXPR_HELPER_PREFIX = 'fkb_'

/** 生成 helper 调用的 JS 字符串：exprToJs 编译 `call` 节点时使用 */
export function exprHelperCall(fn: string, argJs: string[]): string {
  return `$${EXPR_HELPER_PREFIX}${fn}(${argJs.join(', ')})`
}

/**
 * 注入给 FormKitSchema data 的 helper 实现：键为 `fkb_<fn>`，值直接委托
 * builtins[fn].eval。由 builtins 表遍历生成，不逐个手写列出——以后新增内置
 * 函数会自动带上对应 helper，不会出现"加了函数却忘记接线"的遗漏。
 * __raw__ 不生成 helper：它在 exprToJs 里原样透传字符串，从不经过函数调用形式，
 * 生成对应 helper 只会制造一个永远用不到的入口，故显式跳过。
 */
export const EXPR_SCHEMA_HELPERS: Record<string, (...args: unknown[]) => unknown> =
  Object.fromEntries(
    Object.entries(builtins)
      .filter(([name]) => name !== '__raw__')
      .map(([name, fn]) => [`${EXPR_HELPER_PREFIX}${name}`, (...args: unknown[]) => fn.eval(args)]),
  )
