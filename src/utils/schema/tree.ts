import type { FormKitSchemaFormKit } from '@formkit/core'
import { schemaChildren, type SchemaNode } from './types'

// Schema 树通用工具：查找 / 路径定位 / 增删改。
// 路径中的 -1 表示“进入 children 数组”，normalizePath 会将其过滤。

export type NodePath = number[]

export type FoundNode = {
  node: SchemaNode
  path: NodePath
  /** 节点所在顶层数组的下标 */
  rootIndex: number
}

export function normalizePath(path: NodePath): NodePath {
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

// 按路径读取节点
export function getNodeAtPath(schema: SchemaNode[], path: NodePath): SchemaNode | undefined {
  let cur: SchemaNode[] | SchemaNode | undefined = schema
  for (const idx of normalizePath(path)) {
    cur = Array.isArray(cur) ? cur[idx] : schemaChildren(cur)[idx]
  }
  return cur as SchemaNode | undefined
}

// 定位路径所在父级数组
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
  const parentArr = cursor ? schemaChildren(cursor) : []
  return Array.isArray(cursor?.children) ? { parentArr, index: p[p.length - 1]!, parentNode: cursor ?? null } : null
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

// 删除路径上的节点
export function removeAtPath(schema: SchemaNode[], path: NodePath): SchemaNode[] {
  const info = getParentArrayAtPath(schema, path)
  if (!info) return schema
  const { parentArr, index, parentNode } = info
  const nextArr = parentArr.filter((_, i) => i !== index)
  if (!parentNode) return nextArr
  const nextParent: SchemaNode = { ...parentNode, children: nextArr }
  return updateAtPath(schema, path.slice(0, -1), nextParent)
}

// 在路径节点之后插入
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
  const nextParent: SchemaNode = { ...parentNode, children: nextArr }
  return updateAtPath(schema, path.slice(0, -1), nextParent)
}

// 深度遍历每个节点
export function eachNode(schema: FormKitSchemaFormKit[], fn: (node: SchemaNode) => void): void {
  for (const field of schema) {
    fn(field)
    eachNode(schemaChildren(field), fn)
  }
}
