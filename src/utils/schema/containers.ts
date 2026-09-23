import { getContainerDefinition } from '@/elements/canvas'

type ContainerKind =
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
