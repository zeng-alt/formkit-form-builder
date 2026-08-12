import type { ContainerNode, FormNode, LayoutNode } from '@/types/dsl'

export interface DslPathNode {
  node: FormNode
  parent: FormNode | null
  /** 所在根级子树的根下标（画布选中回退用） */
  rootIndex: number
  index: number
}

export type DslDropPosition = 'before' | 'after' | 'inside'

export function dslChildrenOf(node: FormNode): FormNode[] {
  if (node.category === 'container' || node.category === 'layout') {
    return (node as ContainerNode | LayoutNode).children ?? []
  }
  return []
}

export function findDslNodeByKey(nodes: FormNode[], key: string): DslPathNode | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node) continue
    if (node.key === key || node.id === key) {
      return { node, parent: null, rootIndex: i, index: i }
    }
    const children = dslChildrenOf(node)
    if (children.length) {
      const found = findDslNodeByKey(children, key)
      // 保留内层递归返回的真正父节点；仅在直接子层命中时（parent 为 null）才用当前节点补位
      if (found) return { node: found.node, parent: found.parent ?? node, rootIndex: i, index: found.index }
    }
  }
  return null
}

// 以 key 定位并替换 DSL 树中的节点（返回新树，不改原树）
export function updateDslNodeAtKey(
  nodes: FormNode[],
  key: string,
  nextNode: FormNode,
): { nodes: FormNode[]; found: boolean } {
  let found = false
  const next = nodes.map((node) => {
    if (!node) return node
    if (node.key === key || node.id === key) {
      found = true
      return nextNode
    }
    const children = dslChildrenOf(node)
    if (children.length) {
      const result = updateDslNodeAtKey(children, key, nextNode)
      if (result.found) {
        found = true
        return { ...node, children: result.nodes } as FormNode
      }
    }
    return node
  })
  return { nodes: next, found }
}

// ─── 结构树拖拽：在 DSL 树内移动节点（纯函数，返回新树）─────────────────────────

/** 定位节点：返回节点 + 直接父级 children 数组 + 父容器 key（根级为 null）+ 下标 */
function locateNode(
  nodes: FormNode[],
  key: string,
): { node: FormNode; parent: FormNode[] | null; parentKey: string | null; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node) continue
    if (node.key === key || node.id === key) {
      return { node, parent: null, parentKey: null, index: i }
    }
    const children = dslChildrenOf(node)
    if (children.length) {
      const found = locateNode(children, key)
      if (found) {
        return {
          ...found,
          parent: found.parent ?? children,
          parentKey: found.parentKey ?? node.key ?? node.id,
        }
      }
    }
  }
  return null
}

/** key 对应节点是否位于 ancestor 子树内 */
function isInside(nodes: FormNode[], key: string): boolean {
  for (const node of nodes) {
    if (!node) continue
    if (node.key === key || node.id === key) return true
    const children = dslChildrenOf(node)
    if (children.length && isInside(children, key)) return true
  }
  return false
}

/** 移除指定 key 的节点（返回新树 + 被移除节点） */
function without(nodes: FormNode[], key: string): { nodes: FormNode[]; removed: FormNode | null } {
  let removed: FormNode | null = null
  const next = nodes.flatMap((node) => {
    if (!node) return [node]
    if (node.key === key || node.id === key) {
      removed = node
      return []
    }
    const children = dslChildrenOf(node)
    if (children.length) {
      const r = without(children, key)
      if (r.removed && !removed) removed = r.removed
      if (r.nodes !== children) return [{ ...node, children: r.nodes } as FormNode]
    }
    return [node]
  })
  return { nodes: next, removed }
}

/** 在 targetKey 节点上按位置插入 node（before/after/inside） */
function insertAround(
  nodes: FormNode[],
  targetKey: string,
  position: DslDropPosition,
  node: FormNode,
): FormNode[] {
  return nodes.flatMap((n) => {
    if (!n) return [n]
    if (n.key === targetKey || n.id === targetKey) {
      if (position === 'before') return [node, n]
      if (position === 'after') return [n, node]
      return [{ ...n, children: [...dslChildrenOf(n), node] } as FormNode]
    }
    const children = dslChildrenOf(n)
    if (children.length) {
      const next = insertAround(children, targetKey, position, node)
      if (next !== children) return [{ ...n, children: next } as FormNode]
    }
    return [n]
  })
}

/**
 * 在 DSL 树内移动节点（结构树拖拽）：dragKey 移动到 targetKey 的 before/after/inside。
 * 返回新 children 数组；不可移动（未找到 / 移动到自身或自身子树内）时返回 null。
 */
export function moveDslTo(
  nodes: FormNode[],
  dragKey: string,
  targetKey: string,
  position: DslDropPosition,
): FormNode[] | null {
  if (dragKey === targetKey) return null
  const dragInfo = locateNode(nodes, dragKey)
  if (!dragInfo) return null
  // 禁止移动到自身子树内（会形成环）
  const dragChildren = dslChildrenOf(dragInfo.node)
  if (dragChildren.length && isInside(dragChildren, targetKey)) return null
  const removed = without(nodes, dragKey)
  if (!removed.removed) return null
  return insertAround(removed.nodes, targetKey, position, removed.removed)
}

/** 从 DSL 树移除指定 key 的节点（返回新 children） */
export function removeDslNode(nodes: FormNode[], key: string): FormNode[] {
  return without(nodes, key).nodes
}
