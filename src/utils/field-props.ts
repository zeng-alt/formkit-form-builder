export type FieldCategory = 'fields' | 'structure' | 'static'

type FieldPropDef = {
  name: string
  tooltipKey: string
  icon: string
  category: FieldCategory
}

export type FieldProp = {
  name: string
  tooltip: string
  icon: string
  category: FieldCategory
}

const defs: FieldPropDef[] = [
  { name: 'text', tooltipKey: 'fieldProps.tooltip.text', icon: 'i-lucide-type', category: 'fields' },
  {
    name: 'textarea',
    tooltipKey: 'fieldProps.tooltip.textarea',
    icon: 'i-lucide-align-left',
    category: 'fields',
  },
  { name: 'select', tooltipKey: 'fieldProps.tooltip.select', icon: 'i-lucide-list', category: 'fields' },
  { name: 'date', tooltipKey: 'fieldProps.tooltip.date', icon: 'i-lucide-calendar', category: 'fields' },
  { name: 'submit', tooltipKey: 'fieldProps.tooltip.submit', icon: 'i-lucide-check-square', category: 'structure' },
]

export function createFieldProps(
  t: (key: string, params?: Record<string, string | number>) => string,
): FieldProp[] {
  return defs.map((def) => ({
    name: def.name,
    tooltip: t(def.tooltipKey),
    icon: def.icon,
    category: def.category,
  }))
}
