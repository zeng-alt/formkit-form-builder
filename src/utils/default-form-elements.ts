import { ref } from 'vue'
import type { FormDslDocument } from '@/dsl/types'

export const DEFAULT_DATE_VALUE_FORMAT = 'yyyy-MM-dd'
export const DEFAULT_TIME_VALUE_FORMAT = 'HH:mm:ss'
export const DEFAULT_DATE_TIME_VALUE_FORMAT = 'yyyy-MM-dd HH:mm:ss'

export type FormLabelPosition = 'top' | 'left'

export const formDsl = ref<FormDslDocument>({
  formName: 'form',
  meta: { labelPosition: 'top', labelWidth: 80 },
  nodes: [
    {
      id: 'submit_1',
      type: 'submit',
      field: 'submit',
      label: 'Submit',
      layout: { span: 12 },
      props: { type: 'submit' },
    },
  ],
})

export const selectedId = ref<string | null>(null)
export const selectedTarget = ref<'node' | 'form'>('form')
