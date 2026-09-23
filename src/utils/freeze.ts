// ═══ 开发态深度冻结 ══════════════════════════════════════════════════════════
// 增量转换/增量提交依赖"未变对象引用不变"，任何原地改写都会污染缓存或历史快照。
// 生产构建对性能敏感、且冻结带来的收益（提前暴露原地改写）只在开发调试时有意义，
// 这里仅在 DEV 下递归冻结，生产构建里整个函数退化为恒等函数（Vite 静态替换
// import.meta.env.DEV 为 false 后，这段代码连同调用处一起被摇掉）。
//
// 结构共享优化：命中"已冻结对象"直接返回，不再往下递归——不可变数据下，
// 未变的子树在上一次提交时已经冻结过，每次提交实际新增的对象只有变更路径
// 那一小段，摊到每次编辑的冻结开销是 O(变更量) 而非 O(全树)。

export function freezeDeepDev<T>(value: T): T {
  if (!import.meta.env.DEV) return value
  return freezeRecursive(value)
}

function freezeRecursive<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const key of Object.getOwnPropertyNames(value)) {
    freezeRecursive((value as Record<string, unknown>)[key])
  }
  return value
}
