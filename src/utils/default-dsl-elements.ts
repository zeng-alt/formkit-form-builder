import type { DslNode } from '@/dsl/types'
import { DEFAULT_DATE_VALUE_FORMAT } from './default-form-elements'

export const defaultDslElements: DslNode[] = [
  {
    id: 'tpl_text',
    type: 'text',
    field: 'text',
    label: 'Text',
    props: { placeholder: '' },
    layout: { span: 12 },
  },
  {
    id: 'tpl_textarea',
    type: 'textarea',
    field: 'textarea',
    label: 'Textarea',
    props: { placeholder: '' },
    layout: { span: 12 },
  },
  {
    id: 'tpl_select',
    type: 'select',
    field: 'select',
    label: 'Select',
    props: { options: ['one'] },
    layout: { span: 12 },
  },
  {
    id: 'tpl_date',
    type: 'date',
    field: 'date',
    label: 'Date',
    props: { valueFormat: DEFAULT_DATE_VALUE_FORMAT, type: 'date' },
    layout: { span: 12 },
  },
]
