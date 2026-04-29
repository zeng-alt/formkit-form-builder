export type DslOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin'

export type DslCondition =
  | { field: string; operator: DslOperator; value: unknown }
  | { and: DslCondition[] }
  | { or: DslCondition[] }
  | { not: DslCondition }

export type DslLogic = {
  visibleIf?: DslCondition
  disabledIf?: DslCondition
}

export type DslRules = {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  message?: string
}

export type DslLayout = {
  span?: number
  labelWidth?: number
  labelAlign?: 'left' | 'right'
  display?: 'horizontal' | 'vertical'
}

export type DslNode = {
  id: string
  type: string
  field?: string
  label?: string
  props?: Record<string, unknown>
  rules?: DslRules
  layout?: DslLayout
  logic?: DslLogic
  children?: DslNode[]
}

export type FormDslDocument = {
  formId?: string
  formName: string
  meta: { labelPosition: 'top' | 'left'; labelWidth: number }
  nodes: DslNode[]
}
