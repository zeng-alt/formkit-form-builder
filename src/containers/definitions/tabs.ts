import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ContainerDefinition, SchemaNode } from '../types'
import TabsContainer from '@/components/ui/containers/tabs/TabsContainer.vue'
import TabsContainerPreview from '@/components/ui/containers/tabs/TabsContainerPreview.vue'

function isTabsContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'tabs' || node.$formkit === 'tabs'
}

function normalize(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'tabs'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.tabsKey = typeof props.tabsKey === 'string' && props.tabsKey ? props.tabsKey : (next.__key as string | undefined) ?? ''
  props.modelValue = next.children
  next.props = props
  return next
}

export const tabsContainerDef: ContainerDefinition = {
  id: 'tabs',
  match: isTabsContainer,
  canvas: { libraryKey: 'tabs', component: TabsContainer as any },
  preview: { libraryKey: 'tabs', component: TabsContainerPreview as any },
  normalize,
  formatPreview: (node, ctx) => {
    const key = (node as any)?.__key as string | undefined
    const normalized = normalize(node)
    const children = Array.isArray(normalized.children)
      ? (normalized.children as FormKitSchemaFormKit[]).map((pane: any, idx) => {
          const paneChildren = Array.isArray(pane?.children)
            ? (pane.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
            : []
          return { ...pane, children: paneChildren, __key: pane?.__key ?? `${idx}` } as any
        })
      : []
    const schemaIf = (normalized as any).if
    const nextNode: any = {
      $el: 'div',
      attrs: { class: (normalized as any).outerClass || 'col-span-12' },
      children: [
        {
          $cmp: 'tabs',
          props: {
            ...(normalized as any).props,
            tabsKey: ((normalized as any).props?.tabsKey as string | undefined) ?? key ?? '',
            modelValue: children,
          },
        },
      ],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as FormKitSchemaFormKit
  },
}
