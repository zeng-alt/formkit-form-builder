// ═══ 校验 ↔ schema（fromSchema 方向）═══════════════════════════════════════════
// resolveValidation（compile.ts，toSchema 方向）的逆操作：把 schema 的 validation
// 数组语法解析回 ValidationRule[]。叶子模块，不依赖 convert/ 下任何其他文件。

import type { ValidationRule } from '../../types/dsl'

/** validation 数组语法 → ValidationRule[]（resolveValidation 的逆操作）。数组形态下
 *  参数原样透传（不再需要 split(',') 反解析），只有规则名前缀里的修饰符
 *  （debounce/empty/force/optional）还是字符串前缀，仍需解析。无需兼容旧的
 *  pipe 字符串形态（"rule:arg1,arg2|rule2"）——本库没有历史数据负担。 */
export function parseValidation(
  validation: unknown,
  messages?: unknown,
): ValidationRule[] | undefined {
  if (!Array.isArray(validation) || !validation.length) return undefined
  const msgMap: Record<string, string> =
    messages && typeof messages === 'object' ? (messages as Record<string, string>) : {}
  return validation.map((entry) => {
    const [rawName, ...args] = Array.isArray(entry) ? entry : [entry]
    let rest = typeof rawName === 'string' ? rawName : ''
    const rule: ValidationRule = { rule: '' }
    const debounceMatch = rest.match(/^\((\d+)\)/)
    if (debounceMatch) {
      rule.debounce = Number(debounceMatch[1])
      rest = rest.slice(debounceMatch[0].length)
    }
    if (rest.startsWith('+')) {
      rule.empty = true
      rest = rest.slice(1)
    }
    if (rest.startsWith('*')) {
      rule.force = true
      rest = rest.slice(1)
    }
    if (rest.startsWith('?')) {
      rule.optional = true
      rest = rest.slice(1)
    }
    rule.rule = rest
    if (args.length) rule.args = args
    if (msgMap[rule.rule]) rule.message = msgMap[rule.rule]
    return rule
  })
}
