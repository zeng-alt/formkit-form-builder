import type { FormKitSchemaFormKit } from '@formkit/core'
import { evalDslCondition } from './condition'
import type { DslNode } from './types'
import { compileValidation, compileValidationMessages } from './validation'

const typeMap: Record<string, string> = {
  text: 'text',
  textarea: 'textarea',
  select: 'select',
  date: 'date',
  submit: 'submit',
  group: 'group',
}

const clampSpan = (v: unknown) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return 12
  return Math.max(1, Math.min(12, Math.round(n)))
}

const compileOuterClass = (span: number | undefined) => `col-span-${clampSpan(span)}`

export function dslToFormKitSchema(
  nodes: DslNode[],
  data: Record<string, unknown>,
): FormKitSchemaFormKit[] {
  const walk = (n: DslNode): any => {
    const visible = evalDslCondition(n.logic?.visibleIf, data)
    const disabled = n.logic?.disabledIf ? evalDslCondition(n.logic.disabledIf, data) : false

    const formkitType = typeMap[n.type] ?? n.type
    const name = n.field || n.id

    const baseProps = n.props && typeof n.props === 'object' ? n.props : undefined
    const placeholder = baseProps?.placeholder
    const help = baseProps?.help
    const options = baseProps?.options
    const value = baseProps?.value
    const type = baseProps?.type
    const { placeholder: _p, help: _h, options: _o, value: _v, type: _t, ...restProps } = baseProps ?? {}

    const props =
      Object.keys(restProps).length || disabled
        ? {
            ...restProps,
            ...(disabled ? { disabled: true } : {}),
          }
        : undefined

    const node: any = {
      __key: n.id,
      $formkit: formkitType,
      name,
      id: `field_${n.id}`,
      label: n.label,
      outerClass: compileOuterClass(n.layout?.span),
      validation: compileValidation(n.rules),
      validationMessages: compileValidationMessages(n.rules),
      if: visible,
      ...(formkitType === 'submit' && typeof type === 'string' ? { type } : {}),
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(help !== undefined ? { help } : {}),
      ...(value !== undefined ? { value } : {}),
      ...(formkitType === 'select' && options !== undefined ? { options } : {}),
      ...(props ? { props } : {}),
    }

    if (Array.isArray(n.children) && n.children.length) {
      node.children = n.children.map(walk)
    }

    return node
  }

  return nodes.map(walk)
}
