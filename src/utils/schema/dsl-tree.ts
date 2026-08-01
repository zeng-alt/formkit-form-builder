import type { ContainerNode, FormNode, LayoutNode } from '@/types/dsl'

export interface DslPathNode {
  node: FormNode
  parent: FormNode | null
  /** 所在根级子树的根下标（画布选中回退用） */
  rootIndex: number
  index: number
}

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
      if (found) return { node: found.node, parent: node, rootIndex: i, index: found.index }
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
