import type { FormDefinition } from '@/types/dsl'
import { DSL_VERSION } from '@/types/dsl'
import { generateKey } from '@/utils/dnd/schema'
import { DEFAULT_FORM_SETTINGS } from '@/utils/form-layout'
import { makeField, submitButton } from './helpers'
import type { FormTemplateMeta } from './types'

function build(t: (key: string) => string): FormDefinition {
  const name = makeField('text', {
    name: 'name',
    label: t('templates.leaveApplication.fieldName'),
  })
  const leaveType = makeField('select', {
    name: 'leaveType',
    label: t('templates.leaveApplication.fieldLeaveType'),
    options: [
      { label: t('templates.leaveApplication.leaveTypeCasual'), value: 'casual' },
      { label: t('templates.leaveApplication.leaveTypeSick'), value: 'sick' },
      { label: t('templates.leaveApplication.leaveTypeAnnual'), value: 'annual' },
      { label: t('templates.leaveApplication.leaveTypeMarriage'), value: 'marriage' },
    ],
  })
  const startDate = makeField('date', {
    name: 'startDate',
    label: t('templates.leaveApplication.fieldStartDate'),
  })
  const endDate = makeField('date', {
    name: 'endDate',
    label: t('templates.leaveApplication.fieldEndDate'),
  })
  const reason = makeField('textarea', {
    name: 'reason',
    label: t('templates.leaveApplication.fieldReason'),
    props: { placeholder: t('templates.leaveApplication.fieldReasonPlaceholder') },
  })

  return {
    version: DSL_VERSION,
    id: generateKey(),
    name: t('templates.leaveApplication.name'),
    root: {
      id: generateKey(),
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [name, leaveType, startDate, endDate, reason, submitButton(t)],
    },
    settings: { ...DEFAULT_FORM_SETTINGS },
  }
}

export const leaveApplicationTemplate: FormTemplateMeta = {
  id: 'leaveApplication',
  icon: 'i-lucide-calendar-off',
  nameKey: 'templates.leaveApplication.name',
  descriptionKey: 'templates.leaveApplication.description',
  fieldCount: 5,
  fieldTypes: ['select', 'date', 'textarea'],
  build,
}
