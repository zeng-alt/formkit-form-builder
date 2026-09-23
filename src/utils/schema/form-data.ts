// ═══ 按字段名在表单数据里查找 ═══════════════════════════════════════════════════
// DSL 的字段引用（visibleIf / expr 的依赖）语义是"按字段名引用"，与该字段实际落在
// 表单数据的哪一层无关。dataStructure:'flat' 下所有字段名平铺在根层，直接命中；
// dataStructure:'nested' 下容器/布局节点被 dslToOutputSchema 包进同名 group（见
// dsl/schema-adapter.ts 的 wrapNodeWithGroup），容器内字段实际落在
// `{ 容器名: { 字段名: 值 } }` 这样的嵌套结构里（list 容器则是数组），必须做一次
// 按名字的树内查找才能取到——这正是本文件存在的原因。

const MAX_DEPTH = 10

type PathKey = string | number

/**
 * 是否是"数据容器"意义上的普通对象：只有字面量对象 `{}` 才继续往下递归找字段。
 * Date / Map / Set / File 等内置对象的原型不是 Object.prototype，不会被当成表单
 * 分组递归进去——递归进这些对象内部没有意义（它们不是 DSL 会产出的数据形态），
 * 还可能因为访问它们的内部字段而抛异常或产生误判。
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** 按缓存路径重新读取当前值：只缓存"去哪儿找"，不缓存值本身，取到的永远是当前值 */
function readAtPath(root: Record<string, unknown>, path: PathKey[]): { hit: boolean; value: unknown } {
  let cur: unknown = root
  for (const key of path) {
    if (Array.isArray(cur) && typeof key === 'number') {
      if (key < 0 || key >= cur.length) return { hit: false, value: undefined }
      cur = cur[key]
    } else if (isPlainObject(cur) && typeof key === 'string') {
      if (!Object.hasOwn(cur, key)) return { hit: false, value: undefined }
      cur = cur[key]
    } else {
      return { hit: false, value: undefined }
    }
  }
  return { hit: true, value: cur }
}

/** 深度优先搜索第一个命中的字段，返回其路径 + 值；数组按索引顺序、对象按 Object.keys 顺序遍历 */
function searchField(
  value: unknown,
  name: string,
  depth: number,
  maxDepth: number,
  pathAcc: PathKey[],
): { path: PathKey[]; value: unknown } | undefined {
  if (depth > maxDepth) return undefined

  if (Array.isArray(value)) {
    // list 容器的每条记录是数组元素，同样要进去找
    for (let i = 0; i < value.length; i++) {
      const found = searchField(value[i], name, depth + 1, maxDepth, [...pathAcc, i])
      if (found) return found
    }
    return undefined
  }

  if (!isPlainObject(value)) return undefined

  if (Object.hasOwn(value, name)) return { path: [...pathAcc, name], value: value[name] }
  for (const key of Object.keys(value)) {
    const found = searchField(value[key], name, depth + 1, maxDepth, [...pathAcc, key])
    if (found) return found
  }
  return undefined
}

// 按"根表单数据对象引用"分桶缓存已解析出的字段路径。只缓存命中的路径，不缓存值：
// 命中后仍用 readAtPath 现读并校验一次，路径失效（结构变了）就清掉重搜，所以永远
// 不会返回过期的值。
//
// 刻意不缓存"未命中"：未命中结果无法自我校验——若调用方原地修改了根对象、字段
// 之后才出现在某个嵌套层里，一条"不存在"的缓存会让它永远读成 undefined，而且不报错。
// FormRenderer 目前每次值变化都整体替换根对象，恰好不会触发这个问题，但那是一个
// 隐式不变量，不该让正确性依赖它。实测去掉负缓存后，一次挂载 + 切换条件只多出 3 次
// 小对象上的 DFS，收益可以忽略。
const pathCache = new WeakMap<object, Map<string, PathKey[]>>()

/**
 * 按字段名在表单数据里查找：先查根层，命中直接返回（flat 模式下正常字段都在
 * 根层，零额外开销，这是默认路径）；根层没有时，深度优先向下搜索嵌套的普通对象
 * 与数组，返回第一个命中字段的值。
 *
 * 只递归"数据容器"（普通对象、数组）；Date / Map / Set / File 等内置对象不进入
 * （见 isPlainObject）。深度上限默认为 10：防御异常深的嵌套结构与循环引用——
 * 正常的表单结构不会有循环引用，这里只是兜底，不是预期会触发的路径。
 *
 * 已知限制：字段名唯一性目前只在同层兄弟之间校验（见 NameInput.vue 的注释），
 * 跨容器 / 跨 group 同名是合法的 DSL，此时查找存在歧义——本函数按深度优先遍历
 * 顺序取第一个命中，不保证是"最符合直觉"的那个。跨容器引用字段时，建议让被
 * 引用的字段名保持全局唯一，避免依赖这里的排歧顺序。
 */
export function lookupFieldValue(
  data: Record<string, unknown>,
  name: string,
  maxDepth = MAX_DEPTH,
): unknown {
  if (Object.hasOwn(data, name)) return data[name]
  // __v_ 前缀是 Vue 保留的响应式内部标记（__v_isRef / __v_skip / __v_raw 等），
  // isRef() 之类的探测会直接读到这个 Proxy 上。它们永远不是表单字段，实测也是
  // 唯一会高频落进 DFS 分支的未命中键，直接短路，热路径与表单规模无关。
  if (name.startsWith('__v_')) return undefined

  let cache = pathCache.get(data)
  const cachedPath = cache?.get(name)
  if (cachedPath) {
    const { hit, value } = readAtPath(data, cachedPath)
    if (hit) return value
    // 缓存的路径失效了（正常情况下结构不会变，这里只是防御）：清掉重新搜索一次
    cache?.delete(name)
  }

  const found = searchField(data, name, 0, maxDepth, [])
  if (!found) return undefined
  if (!cache) {
    cache = new Map()
    pathCache.set(data, cache)
  }
  cache.set(name, found.path)
  return found.value
}
