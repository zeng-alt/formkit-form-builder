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

// 替换路径上的节点：返回新树，沿路径逐层浅拷贝，路径外的兄弟节点复用原引用，不改动输入
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
    // 必须拷贝：schemaChildren 返回的是 cursor.children 原数组本身，而 cursor 只是
    // 浅拷贝，直接写 arr[idx] 会改到输入 schema 的嵌套数组上
    const arr = [...schemaChildren(cursor)]
    const child: SchemaNode = { ...arr[idx]! }
    arr[idx] = child
    cursor.children = arr
    cursor = child
  }
  const lastIdx = p[p.length - 1]!
  const lastArr = [...schemaChildren(cursor)]
  lastArr[lastIdx] = nextNode
  cursor.children = lastArr
  nextSchema[idx0] = parent
  return nextSchema
}

// 定位路径所在的父数组：根层返回 parentNode 为 null；路径中间某层没有 children 时返回 null
export function getParentArrayAtPath(
  schema: SchemaNode[],
  path: NodePath,
): { parentArr: SchemaNode[]; index: number; parentNode: SchemaNode | null } | null {
  const p = normalizePath(path)
  if (p.length === 0) return null
  if (p.length === 1) return { parentArr: schema, index: p[0]!, parentNode: null }
  let cursor: SchemaNode | undefined = schema[p[0]!]
  for (let i = 1; i < p.length - 1; i++) {
    cursor = schemaChildren(cursor)[p[i]!]
  }
  if (!cursor || !Array.isArray(cursor.children)) return null
  return { parentArr: schemaChildren(cursor), index: p[p.length - 1]!, parentNode: cursor }
}

// 删除路径上的节点：返回新树，不改动输入
export function removeAtPath(schema: SchemaNode[], path: NodePath): SchemaNode[] {
  const info = getParentArrayAtPath(schema, path)
  if (!info) return schema
  const { parentArr, index, parentNode } = info
  const nextArr = parentArr.filter((_, i) => i !== index)
  if (!parentNode) return nextArr
  return updateAtPath(schema, path.slice(0, -1), { ...parentNode, children: nextArr })
}

// 在路径上的节点之后插入：返回新树，不改动输入
export function insertAfterAtPath(
  schema: SchemaNode[],
  path: NodePath,
  nextNode: SchemaNode,
): SchemaNode[] {
  const info = getParentArrayAtPath(schema, path)
  if (!info) return schema
  const { parentArr, index, parentNode } = info
  const nextArr = [...parentArr]
  nextArr.splice(index + 1, 0, nextNode)
  if (!parentNode) return nextArr
  return updateAtPath(schema, path.slice(0, -1), { ...parentNode, children: nextArr })
}
