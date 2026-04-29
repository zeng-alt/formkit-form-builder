import type { FormKitSchemaFormKit } from '@formkit/core'
import type { DslCondition, DslExpr, DslNode, DslOperator } from './types'
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

const unwrapExpr = (value: unknown) => {
  if (typeof value === 'string' && value.trim().startsWith('$')) return value.trim()
  if (value && typeof value === 'object' && '$expr' in (value as any)) {
    const expr = (value as DslExpr).$expr
    return typeof expr === 'string' ? expr.trim() : value
  }
  return value
}

const opToJs = (op: DslOperator) => {
  if (op === 'eq') return '==='
  if (op === 'neq') return '!=='
  if (op === 'gt') return '>'
  if (op === 'gte') return '>='
  if (op === 'lt') return '<'
  if (op === 'lte') return '<='
  return op
}

const literal = (v: unknown) => JSON.stringify(v)

const compileConditionExpr = (cond: DslCondition): string => {
  if ('and' in cond) return `(${cond.and.map(compileConditionExpr).join(' && ')})`
  if ('or' in cond) return `(${cond.or.map(compileConditionExpr).join(' || ')})`
  if ('not' in cond) return `(!${compileConditionExpr(cond.not)})`

  const left = `$get(${JSON.stringify(cond.field)}).value`

  if (cond.operator === 'in') {
    return `(Array.isArray(${literal(cond.value)}) ? ${literal(cond.value)}.includes(${left}) : false)`
  }
  if (cond.operator === 'nin') {
    return `(Array.isArray(${literal(cond.value)}) ? !${literal(cond.value)}.includes(${left}) : true)`
  }

  return `(${left} ${opToJs(cond.operator)} ${literal(cond.value)})`
}

export function dslToFormKitSchema(
  nodes: DslNode[],
  _data: Record<string, unknown>,
): FormKitSchemaFormKit[] {
  const walk = (n: DslNode): any => {
    const kind = n.kind ?? 'formkit'

    const visibleIf = n.logic?.visibleIf
    const ifExpr = visibleIf ? compileConditionExpr(visibleIf) : undefined

    const disabledIf = n.logic?.disabledIf
    const disabledExpr = disabledIf ? compileConditionExpr(disabledIf) : undefined

    const baseProps = n.props && typeof n.props === 'object' ? n.props : undefined
    const unwrappedProps =
      baseProps && typeof baseProps === 'object'
        ? Object.fromEntries(Object.entries(baseProps).map(([k, v]) => [k, unwrapExpr(v)]))
        : undefined

    const children = Array.isArray(n.children) && n.children.length ? n.children.map(walk) : undefined

    if (kind === 'el') {
      return {
        __key: n.id,
        $el: n.type,
        ...(unwrappedProps ? { attrs: unwrappedProps } : {}),
        ...(children ? { children } : {}),
      }
    }

    if (kind === 'cmp') {
      return {
        __key: n.id,
        $cmp: n.type,
        ...(unwrappedProps ? { props: unwrappedProps } : {}),
        ...(children ? { children } : {}),
      }
    }

    const formkitType = typeMap[n.type] ?? n.type
    const name = n.field || n.id

    const placeholder = unwrappedProps?.placeholder
    const help = unwrappedProps?.help
    const options = unwrappedProps?.options
    const value = unwrappedProps?.value
    const type = unwrappedProps?.type
    const { placeholder: _p, help: _h, options: _o, value: _v, type: _t, ...restProps } = unwrappedProps ?? {}

    const nodeProps =
      Object.keys(restProps).length || disabledExpr
        ? {
            ...restProps,
            ...(disabledExpr ? { disabled: disabledExpr } : {}),
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
      ...(ifExpr ? { if: ifExpr } : {}),
      ...(formkitType === 'submit' && typeof type === 'string' ? { type } : {}),
      ...(placeholder !== undefined ? { placeholder } : {}),
      ...(help !== undefined ? { help } : {}),
      ...(value !== undefined ? { value } : {}),
      ...(formkitType === 'select' && options !== undefined ? { options } : {}),
      ...(nodeProps ? { props: nodeProps } : {}),
      ...(children ? { children } : {}),
    }

    return node
  }

  return nodes.map(walk)
}
