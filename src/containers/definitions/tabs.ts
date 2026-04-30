import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ContainerDefinition, SchemaNode } from '../types'
import TabsContainer from '@/components/ui/containers/tabs/TabsContainer.vue'
import TabsContainerPreview from '@/components/ui/containers/tabs/TabsContainerPreview.vue'

function isTabsContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'tabs' || node.$formkit === 'tabs' || (node.$formkit === 'group' && node.wrapper === 'tabs')
}

function normalize(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = 'tabs'
  next.children = Array.isArray(next.children) ? next.children : Array.isArray((next as any)?.props?.modelValue) ? (next as any).props.modelValue : []
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
    const firstPaneChildren = Array.isArray((children as any[])?.[0]?.children) ? ((children as any[])[0] as any).children : []
    const slotChild: any = {
      $el: 'div',
      attrs: { class: 'w-full grid grid-cols-12 gap-x-4 gap-y-2' },
      children: firstPaneChildren,
    }
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
            children,
          },
          children: [slotChild],
        },
      ],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as FormKitSchemaFormKit
  },
}
