import type { FormKitSchemaFormKit } from '@formkit/core'

type LegacyContainerKind = 'list' | 'card' | 'tabs' | 'inputGroup'

const LEGACY_KINDS = new Set<LegacyContainerKind>(['list', 'card', 'tabs', 'inputGroup'])

export function migrateContainerNodes(schema: FormKitSchemaFormKit[]) {
  const visit = (nodes: any[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue

      const kind = (() => {
        const cmp = node.$cmp
        if (typeof cmp === 'string' && LEGACY_KINDS.has(cmp as any)) return cmp as LegacyContainerKind
        const fk = node.$formkit
        if (typeof fk === 'string' && LEGACY_KINDS.has(fk as any)) return fk as LegacyContainerKind
        return null
      })()

      if (kind) {
        node.$formkit = 'group'
        node.wrapper = node.wrapper ?? kind
        if ('$cmp' in node) delete node.$cmp

        const props = node.props && typeof node.props === 'object' ? { ...node.props } : {}
        const fromModel = Array.isArray((props as any).modelValue) ? (props as any).modelValue : null
        delete (props as any).modelValue
        delete (props as any).listKey
        delete (props as any).cardKey
        delete (props as any).inputGroupKey
        delete (props as any).tabsKey
        node.props = props

        if (!Array.isArray(node.children)) {
          node.children = Array.isArray(fromModel) ? fromModel : []
        }
      } else if (node.$formkit === 'group' && typeof node.wrapper === 'string' && node.wrapper) {
        if (!Array.isArray(node.children)) node.children = []
        if (node.props && typeof node.props === 'object') {
          const props = { ...node.props }
          delete (props as any).modelValue
          delete (props as any).listKey
          delete (props as any).cardKey
          delete (props as any).inputGroupKey
          delete (props as any).tabsKey
          node.props = props
        }
      }

      if (Array.isArray(node.children)) visit(node.children)
    }
  }

  if (Array.isArray(schema)) visit(schema as any[])
}

