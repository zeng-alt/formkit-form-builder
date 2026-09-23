export function pluralize(count: number, noun: string, suffix = 's') {
  return count === 1 ? noun : noun + suffix
}

// 注：DSL 的 FieldNode.validation 一直是结构化的 ValidationRule[]（从未是 pipe
// 字符串），这里按数组长度计数即可——之前误判成字符串再 split('|') 的写法对真实
// 的 DSL 节点恒返回 0，是与本次 validation 数组语法改造无关的既有 bug，顺带修复。
export function validationCount(field: any) {
  const raw = field?.props?.validation ?? field?.validation
  return Array.isArray(raw) ? raw.length : 0
}
