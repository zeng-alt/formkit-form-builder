import type { FormKitSchemaFormKit } from '@formkit/core'
import { getContainerDefinition, normalizeContainerNode } from '@/containers/registry'

export type ContainerKind = 'list' | 'card' | 'inputGroup'

export function getContainerKind(node: unknown): ContainerKind | null {
  const def = getContainerDefinition(node)
  if (!def) return null
  return def.id as ContainerKind
}

export function getContainerKey(node: unknown): string | undefined {
  const n: any = node as any
  if (!n || typeof n !== 'object') return undefined
  const raw = n.__key
  return typeof raw === 'string' && raw ? raw : undefined
}

export function getContainerChildren(node: unknown): FormKitSchemaFormKit[] {
  const n: any = node as any
  const children = n?.children
  return Array.isArray(children) ? (children as FormKitSchemaFormKit[]) : []
}

export function ensureContainerCmpNode(node: any): any {
  return normalizeContainerNode(node)
}
