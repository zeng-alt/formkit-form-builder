import { computed, type Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { formatContainerPreviewNode, normalizeContainerNode } from '@/containers/registry'

export default function createFormattedSchema(fields: Ref<FormKitSchemaFormKit[]> | undefined) {
  return computed(() => {
    if (!fields) return []
    const formatOne = (field: FormKitSchemaFormKit, index: number): any => {
      const key = (field as any)?.__key as string | undefined
      const isPreviewPlaceholder = (field as any)?.__preview_placeholder === true
      const normalized = normalizeContainerNode(field as any) as any
      const formattedContainer = formatContainerPreviewNode(normalized, {
        key,
        isPlaceholder: isPreviewPlaceholder,
        format: formatOne,
      })
      if (formattedContainer) return formattedContainer

      // $cmp 节点：FormKitSchema 只转发 props，语义键已在 props 内；原样保留 $cmp / props / children
      if (typeof (field as any)?.$cmp === 'string') {
        const { bind, if: schemaIf, ...rest } = field as any
        const cleanCmp: any = {
          ...rest,
          name: field.name || (key ? `field_${key}` : `field_${index}`),
          id: field.id || (key ? `preview_field_${key}` : `preview_field_${index}`),
        }
        if (typeof bind === 'string' && bind.trim()) cleanCmp.bind = bind
        if (typeof schemaIf === 'string' && schemaIf.trim()) cleanCmp.if = schemaIf
        else if (typeof schemaIf === 'boolean') cleanCmp.if = schemaIf
        return cleanCmp
      }

      const {
        $formkit,
        label,
        validation,
        validationMessages,
        help,
        placeholder,
        value,
        options,
        number,
        outerClass,
        type,
        buttonProps,
        buttonText,
        props,
        __bind,
        bind,
        min,
        max,
        validationVisibility,
        __raw__sectionsSchema,
        step,
        multiple,
        accept,
        if: schemaIf,
      } = field

      const cleanField: any = {
        $formkit,
        name: field.name || (key ? `field_${key}` : `field_${index}`),
        id: field.id || (key ? `preview_field_${key}` : `preview_field_${index}`),
        label,
        validation,
        validationMessages,
        help,
        placeholder,
        value,
        options,
        outerClass,
        type,
        buttonProps,
        buttonText,
        props,
        __bind,
        number,
        min,
        max,
        validationVisibility,
        __raw__sectionsSchema,
        step,
        multiple,
        accept,
      }
      if (typeof bind === 'string' && bind.trim()) cleanField.bind = bind
      if (typeof schemaIf === 'string' && schemaIf.trim()) cleanField.if = schemaIf
      else if (typeof schemaIf === 'boolean') cleanField.if = schemaIf
      return cleanField
    }

    return fields.value.map((field, index) => formatOne(field, index))
  })
}
