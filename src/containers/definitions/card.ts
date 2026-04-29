import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ContainerDefinition, SchemaNode } from '../types'
import CardContainer from '@/components/ui/containers/card/CardContainer.vue'
import CardContainerPreview from '@/components/ui/containers/card/CardContainerPreview.vue'

function isCardContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'card' || node.$formkit === 'card'
}

function normalize(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'card'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.cardKey = typeof props.cardKey === 'string' && props.cardKey ? props.cardKey : (next.__key as string | undefined) ?? ''
  props.modelValue = next.children
  next.props = props
  return next
}

export const cardContainerDef: ContainerDefinition = {
  id: 'card',
  match: isCardContainer,
  canvas: { libraryKey: 'card', component: CardContainer as any },
  preview: { libraryKey: 'card', component: CardContainerPreview as any },
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
          $cmp: 'card',
          props: {
            ...(normalized as any).props,
            cardKey: ((normalized as any).props?.cardKey as string | undefined) ?? key ?? '',
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
