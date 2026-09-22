import { getContainerDefinition, normalizeContainerNode } from '@/elements/canvas'
import { schemaChildren, type SchemaNode } from './types'

export type ContainerKind =
  | 'list'
  | 'card'
  | 'inputGroup'
  | 'buttonGroup'
  | 'badge'
  | 'tabs'
  | 'steps'
  | 'group'
  | 'dataTable'

export function getContainerKind(node: unknown): ContainerKind | null {
  const def = getContainerDefinition(node)
  if (!def) return null
  return def.id as ContainerKind
}

export function getContainerKey(node: unknown): string | undefined {
  const n = node as SchemaNode | null | undefined
  if (!n || typeof n !== 'object') return undefined
  const raw = n.__key
  return typeof raw === 'string' && raw ? raw : undefined
}

export function getContainerChildren(node: unknown): SchemaNode[] {
  return schemaChildren(node as SchemaNode | null | undefined)
}

export function ensureContainerCmpNode(node: unknown): unknown {
  return normalizeContainerNode(node)
}
