import { computed, type Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { formatContainerPreviewNode, normalizeContainerNode } from '@/elements/canvas'

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

      // 递归格式化 children（容器/布局子节点），同时保留原始节点的完整结构
      const anyField: any = field as any
      const hasChildren = Array.isArray(anyField.children)

      // $cmp 节点：FormKitSchema 只转发 props，语义键已在 props 内；原样保留结构
      if (typeof anyField.$cmp === 'string') {
        const { bind, if: schemaIf, ...rest } = anyField
        const nextChildren = hasChildren
          ? anyField.children.map((c: any, i: number) => formatOne(c, i))
          : (Array.isArray(anyField.props?.modelValue)
              ? anyField.props.modelValue.map((c: any, i: number) => formatOne(c, i))
              : undefined)
        const cleanCmp: any = {
          ...rest,
          name: field.name || (key ? `field_${key}` : `field_${index}`),
          id: field.id || (key ? `preview_field_${key}` : `preview_field_${index}`),
        }
        if (nextChildren) cleanCmp.children = nextChildren
        if (typeof bind === 'string' && bind.trim()) cleanCmp.bind = bind
        if (typeof schemaIf === 'string' && schemaIf.trim()) cleanCmp.if = schemaIf
        else if (typeof schemaIf === 'boolean') cleanCmp.if = schemaIf
        return cleanCmp
      }

      // $el 节点（grid/row/column 等布局）：包裹在 group 中提供 JSON object 数据结构
      if (typeof anyField.$el === 'string' && hasChildren) {
        const { bind, if: schemaIf, outerClass, ...rest } = anyField
        const formattedChildren = anyField.children.map((c: any, i: number) => formatOne(c, i))
        const layoutName = anyField.name || anyField.props?.name
        const groupNode: any = {
          $formkit: 'group',
          children: [{ ...rest, children: formattedChildren }],
          outerClass: `${outerClass || 'col-span-12'} !border-0 !p-0 !m-0 ![&>.formkit-wrapper]:border-0 ![&>.formkit-wrapper]:p-0 ![&>.formkit-wrapper]:m-0 ![&>.formkit-wrapper>fieldset]:border-0 ![&>.formkit-wrapper>fieldset]:p-0 ![&>.formkit-wrapper>fieldset]:m-0`,
        }
        if (layoutName) groupNode.name = layoutName
        if (typeof bind === 'string' && bind.trim()) groupNode.bind = bind
        if (typeof schemaIf === 'string' && schemaIf.trim()) groupNode.if = schemaIf
        else if (typeof schemaIf === 'boolean') groupNode.if = schemaIf
        return groupNode
      }

      // $formkit: 'group' 或 $formkit: 'list' 等结构容器：递归格式化 children
      if ((typeof anyField.$formkit === 'string') && hasChildren) {
        const { bind, if: schemaIf, ...rest } = anyField
        const cleanNode: any = {
          ...rest,
          name: field.name || (key ? `field_${key}` : `field_${index}`),
          id: field.id || (key ? `preview_field_${key}` : `preview_field_${index}`),
          children: anyField.children.map((c: any, i: number) => formatOne(c, i)),
        }
        if (typeof bind === 'string' && bind.trim()) cleanNode.bind = bind
        if (typeof schemaIf === 'string' && schemaIf.trim()) cleanNode.if = schemaIf
        else if (typeof schemaIf === 'boolean') cleanNode.if = schemaIf
        return cleanNode
      }

      const {
        $formkit,
        label,
        validation,
        validationMessages,
        help,
        placeholder,
        value,
        expr,
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
        expr,
      }
      if (typeof bind === 'string' && bind.trim()) cleanField.bind = bind
      if (typeof schemaIf === 'string' && schemaIf.trim()) cleanField.if = schemaIf
      else if (typeof schemaIf === 'boolean') cleanField.if = schemaIf
      return cleanField
    }

    return fields.value.map((field, index) => formatOne(field, index))
  })
}
