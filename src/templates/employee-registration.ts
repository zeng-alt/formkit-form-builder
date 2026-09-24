import type { FormDefinition } from '@/types/dsl'
import { DSL_VERSION } from '@/types/dsl'
import { generateKey } from '@/utils/dnd/schema'
import { DEFAULT_FORM_SETTINGS } from '@/utils/form-layout'
import { makeContainer, makeField, submitButton } from './helpers'
import type { FormTemplateMeta } from './types'

function build(t: (key: string) => string): FormDefinition {
  const name = makeField('text', {
    name: 'name',
    label: t('templates.employeeRegistration.fieldName'),
  })
  const gender = makeField('select', {
    name: 'gender',
    label: t('templates.employeeRegistration.fieldGender'),
    options: [
      { label: t('templates.employeeRegistration.genderMale'), value: 'male' },
      { label: t('templates.employeeRegistration.genderFemale'), value: 'female' },
    ],
  })
  const birthDate = makeField('date', {
    name: 'birthDate',
    label: t('templates.employeeRegistration.fieldBirthDate'),
  })
  const basicInfoCard = makeContainer(
    'card',
    { label: t('templates.employeeRegistration.groupBasicInfo') },
    [name, gender, birthDate],
  )

  const department = makeField('select', {
    name: 'department',
    label: t('templates.employeeRegistration.fieldDepartment'),
    options: [
      { label: t('templates.employeeRegistration.departmentTech'), value: 'tech' },
      { label: t('templates.employeeRegistration.departmentMarketing'), value: 'marketing' },
      { label: t('templates.employeeRegistration.departmentHr'), value: 'hr' },
      { label: t('templates.employeeRegistration.departmentFinance'), value: 'finance' },
    ],
  })
  const hireDate = makeField('date', {
    name: 'hireDate',
    label: t('templates.employeeRegistration.fieldHireDate'),
  })
  const position = makeField('text', {
    name: 'position',
    label: t('templates.employeeRegistration.fieldPosition'),
  })
  const workInfoCard = makeContainer(
    'card',
    { label: t('templates.employeeRegistration.groupWorkInfo') },
    [department, hireDate, position],
  )

  return {
    version: DSL_VERSION,
    id: generateKey(),
    name: t('templates.employeeRegistration.name'),
    root: {
      id: generateKey(),
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [basicInfoCard, workInfoCard, submitButton(t)],
    },
    settings: { ...DEFAULT_FORM_SETTINGS },
  }
}

export const employeeRegistrationTemplate: FormTemplateMeta = {
  id: 'employeeRegistration',
  icon: 'i-lucide-id-card',
  nameKey: 'templates.employeeRegistration.name',
  descriptionKey: 'templates.employeeRegistration.description',
  fieldCount: 6,
  fieldTypes: ['card', 'date', 'select'],
  build,
}
