import { schemaChildren, type SchemaNode } from './types'

// Schema 树通用工具：查找 / 路径定位 / 增删改。
// 路径中的 -1 表示“进入 children 数组”，normalizePath 会将其过滤。

type NodePath = number[]

type FoundNode = {
  node: SchemaNode
  path: NodePath
  /** 节点所在顶层数组的下标 */
  rootIndex: number
}

function normalizePath(path: NodePath): NodePath {
  return path.filter((p) => p !== -1)
}

// 按 __key 深度优先查找节点
export function findNodeByKey(
  schema: SchemaNode[],
  key: string,
  path: NodePath = [],
  rootIndex = -1,
): FoundNode | null {
  for (let i = 0; i < schema.length; i++) {
    const node = schema[i]
    if (!node || typeof node !== 'object') continue
    const nextPath = [...path, i]
    const nextRootIndex = rootIndex >= 0 ? rootIndex : i
    if (node.__key === key) return { node, path: nextPath, rootIndex: nextRootIndex }
    const found = findNodeByKey(schemaChildren(node), key, [...nextPath, -1], nextRootIndex)
    if (found) return found
  }
  return null
}

// 原地替换路径上的节点（返回新数组，不改动原 schema）
export function updateAtPath(
  schema: SchemaNode[],
  path: NodePath,
  nextNode: SchemaNode,
): SchemaNode[] {
  const p = normalizePath(path)
  if (p.length === 0) return schema
  const nextSchema = [...schema]
  const idx0 = p[0]!
  if (p.length === 1) {
    nextSchema[idx0] = nextNode
    return nextSchema
  }
  const parent: SchemaNode = { ...nextSchema[idx0]! }
  let cursor: SchemaNode = parent
  for (let i = 1; i < p.length - 1; i++) {
    const idx = p[i]!
    const arr = schemaChildren(cursor)
    const child: SchemaNode = { ...arr[idx]! }
    arr[idx] = child
    cursor.children = arr
    cursor = child
  }
  const lastIdx = p[p.length - 1]!
  const lastArr = schemaChildren(cursor)
  lastArr[lastIdx] = nextNode
  cursor.children = lastArr
  nextSchema[idx0] = parent
  return nextSchema
}
