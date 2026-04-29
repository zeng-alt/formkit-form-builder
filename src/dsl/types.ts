export type DslOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin'

export type DslExpr = { $expr: string }

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
  email?: boolean
  number?: boolean
  url?: boolean
  alphanumeric?: boolean
  contains_alphanumeric?: boolean
  contains_numeric?: boolean

  min?: number
  max?: number
  between?: { min: number; max: number }

  length?: { min?: number; max?: number }

  matches?: string
  pattern?: string

  message?: string
  messages?: Partial<Record<string, string>>
}

export type DslLayout = {
  span?: number
  labelWidth?: number
  labelAlign?: 'left' | 'right'
  display?: 'horizontal' | 'vertical'
}

export type DslNode = {
  id: string
  kind?: 'formkit' | 'el' | 'cmp'
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
