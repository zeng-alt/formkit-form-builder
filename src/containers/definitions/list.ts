import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ContainerDefinition, SchemaNode } from '../types'
import ListContainer from '@/components/ui/containers/list/ListContainer.vue'
import ListContainerPreview from '@/components/ui/containers/list/ListContainerPreview.vue'

function isListContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'list' || node.$formkit === 'list'
}

function normalize(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'list'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.listKey = typeof props.listKey === 'string' && props.listKey ? props.listKey : (next.__key as string | undefined) ?? ''
  props.modelValue = next.children
  if (props.showActions === undefined) props.showActions = false
  next.props = props
  return next
}

export const listContainerDef: ContainerDefinition = {
  id: 'list',
  match: isListContainer,
  canvas: { libraryKey: 'list', component: ListContainer as any },
  preview: { libraryKey: 'list', component: ListContainerPreview as any },
  normalize,
  formatPreview: (node, ctx) => {
    const key = (node as any)?.__key as string | undefined
    const normalized = normalize(node)
    const children = Array.isArray(normalized.children)
      ? (normalized.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
      : []
    const schemaIf = (normalized as any).if
    const nextNode: any = {
      $el: 'div',
      attrs: { class: (normalized as any).outerClass || 'col-span-12' },
      children: [
        {
          $cmp: 'list',
          props: {
            ...(normalized as any).props,
            listKey: ((normalized as any).props?.listKey as string | undefined) ?? key ?? '',
            modelValue: children,
            isPlaceholder: ctx.isPlaceholder,
          },
        },
      ],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as FormKitSchemaFormKit
  },
}
