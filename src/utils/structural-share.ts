// ═══ 结构共享：让「原地修改的响应式输入」既能被追踪、又不必整棵重渲染 ═══════════════
// 背景（规格 D）：FormRenderer 的 definition/schema 入参可能是外部包了 reactive() 的
// 对象，被原地修改（如 def.root.children[0].label = 'New'）。旧实现对这类输入调用
// toRaw() 后按节点身份缓存转换结果——toRaw 之后 computed 不会追踪到嵌套字段的变化，
// 原地修改因此不会触发重新渲染。
// 这里的思路：
//   1. snapshotDeep 通过响应式代理逐层读取，深拷贝成一份纯 JS 数据快照——读取过程本身
//      会建立 Vue 的依赖追踪，外部原地改一个嵌套字段就能让持有这份快照的 computed 失效。
//   2. shareStructure 把新快照与上一次的快照做深比较，没变的子树直接复用旧快照的对象
//      引用（哪怕这次是全新 snapshotDeep 出来的新对象）。这样"结构上没变"的部分在
//      snapshotDeep 之后仍然保持引用稳定，后续按节点身份缓存的转换（schema 投影器）
//      才能继续增量工作。
// 两者都只处理 JSON 可表示的数据（普通对象字面量 / 数组 / 原始值）；其它形状
//（函数、Date、正则、Map/Set、类实例……）一律按原样引用返回，不递归、不改动——
// DSL/schema 节点不会出现这些形状，遇到了也不应该被当成"可比较的数据"处理。

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** 深拷贝成纯对象/数组，通过传入值本身（可能是响应式代理）的属性读取来递归——
 *  不调用 toRaw，好让调用方（如 computed）追踪到每一层嵌套字段。 */
export function snapshotDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => snapshotDeep(item)) as unknown as T
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    // Object.keys 在响应式代理上同样会建立依赖（ownKeys 追踪新增/删除的 key）
    for (const key of Object.keys(value)) {
      result[key] = snapshotDeep((value as Record<string, unknown>)[key])
    }
    return result as T
  }
  // 原始值：原样返回。非普通对象（函数、Date、正则、类实例等）：不是 JSON 可表示的
  // 数据，按原样引用返回，不递归也不拷贝。
  return value
}

/** 深比较 prev 与 next，相等的子树返回 prev 的引用，不等的地方新建容器并递归共享
 *  子项；整棵完全相等时直接返回 prev 本身。也叫 replaceEqualDeep。 */
export function shareStructure<T>(prev: T, next: T): T {
  if (Object.is(prev, next)) return next

  if (Array.isArray(next)) {
    if (!Array.isArray(prev)) return next
    let changed = prev.length !== next.length
    const merged = next.map((item, i) => {
      const prevItem = i < prev.length ? prev[i] : undefined
      const shared = shareStructure(prevItem, item)
      if (!Object.is(shared, prevItem)) changed = true
      return shared
    })
    return (changed ? merged : prev) as unknown as T
  }

  if (isPlainObject(next)) {
    if (!isPlainObject(prev)) return next
    const nextKeys = Object.keys(next)
    let changed = Object.keys(prev).length !== nextKeys.length
    const merged: Record<string, unknown> = {}
    for (const key of nextKeys) {
      const prevValue = prev[key]
      const shared = shareStructure(prevValue, next[key])
      merged[key] = shared
      if (!Object.is(shared, prevValue)) changed = true
    }
    return (changed ? merged : prev) as unknown as T
  }

  // 原始值 / 非普通对象：已经在最上面判过引用相等，这里必然是"不同"，直接用新值
  return next
}
