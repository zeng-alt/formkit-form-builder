import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ContainerDefinition, SchemaNode } from '../types'
import InputGroupContainer from '@/components/ui/containers/input-group/InputGroupContainer.vue'
import InputGroupContainerPreview from '@/components/ui/containers/input-group/InputGroupContainerPreview.vue'

function isInputGroupContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'inputGroup' || node.$formkit === 'inputGroup'
}

function normalize(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'inputGroup'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.inputGroupKey =
    typeof props.inputGroupKey === 'string' && props.inputGroupKey ? props.inputGroupKey : (next.__key as string | undefined) ?? ''
  props.modelValue = next.children
  next.props = props
  return next
}

export const inputGroupContainerDef: ContainerDefinition = {
  id: 'inputGroup',
  match: isInputGroupContainer,
  canvas: { libraryKey: 'inputGroup', component: InputGroupContainer as any },
  preview: { libraryKey: 'inputGroup', component: InputGroupContainerPreview as any },
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
          $cmp: 'inputGroup',
          props: {
            ...(normalized as any).props,
            inputGroupKey: ((normalized as any).props?.inputGroupKey as string | undefined) ?? key ?? '',
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

