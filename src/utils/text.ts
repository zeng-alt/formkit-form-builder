export function pluralize(count: number, noun: string, suffix = 's') {
  return count === 1 ? noun : noun + suffix
}

// 注：DSL 的 FieldNode.validation 一直是结构化的 ValidationRule[]（从未是 pipe
// 字符串），这里按数组长度计数即可——之前误判成字符串再 split('|') 的写法对真实
// 的 DSL 节点恒返回 0，是与本次 validation 数组语法改造无关的既有 bug，顺带修复。
// 条件必填（requiredIf）的字段在 schema 里是 FormKit 条件属性 { if, then, else }：
// then 是条件成立时的规则（静态规则 + required），按它计数
export function validationCount(field: any) {
  const raw = field?.props?.validation ?? field?.validation
  if (Array.isArray(raw)) return raw.length
  if (raw && typeof raw === 'object' && Array.isArray(raw.then)) return raw.then.length
  return 0
}
