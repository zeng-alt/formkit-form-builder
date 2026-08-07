// ═══ 表达式依赖提取 ═══════════════════════════════════════════════════════════
// 正则提取 expr 字符串中的 $name 变量引用，供 watch 绑定和 CodeMirror 补全/校验。

/** 从表达式字符串提取所有字段依赖名（去重） */
export function extractDeps(expr: string): string[] {
  if (typeof expr !== 'string' || !expr.trim()) return []
  const matches = expr.match(/\$[a-zA-Z_]\w*/g)
  if (!matches?.length) return []
  const seen = new Set<string>()
  const deps: string[] = []
  for (const m of matches) {
    const name = m.substring(1)
    if (!seen.has(name)) {
      seen.add(name)
      deps.push(name)
    }
  }
  return deps
}

/** 校验表达式中的字段是否都在已知字段名集合中；返回不存在的字段名列表 */
export function validateDeps(expr: string, knownNames: Set<string>): string[] {
  const deps = extractDeps(expr)
  return deps.filter((d) => !knownNames.has(d))
}
