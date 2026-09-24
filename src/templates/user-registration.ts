import type { FormDefinition } from '@/types/dsl'
import { DSL_VERSION } from '@/types/dsl'
import { generateKey } from '@/utils/dnd/schema'
import { DEFAULT_FORM_SETTINGS } from '@/utils/form-layout'
import { makeField, submitButton } from './helpers'
import type { FormTemplateMeta } from './types'

function build(t: (key: string) => string): FormDefinition {
  const username = makeField('text', {
    name: 'username',
    label: t('templates.userRegistration.fieldUsername'),
    props: { placeholder: t('templates.userRegistration.fieldUsernamePlaceholder') },
  })
  const password = makeField('password', {
    name: 'password',
    label: t('templates.userRegistration.fieldPassword'),
    props: { placeholder: t('templates.userRegistration.fieldPasswordPlaceholder') },
  })
  const email = makeField('email', {
    name: 'email',
    label: t('templates.userRegistration.fieldEmail'),
    props: { placeholder: t('templates.userRegistration.fieldEmailPlaceholder') },
  })
  const agreement = makeField('checkbox', {
    name: 'agreement',
    label: t('templates.userRegistration.fieldAgreement'),
    options: [{ label: t('templates.userRegistration.fieldAgreementOption'), value: 'agreed' }],
  })

  return {
    version: DSL_VERSION,
    id: generateKey(),
    name: t('templates.userRegistration.name'),
    root: {
      id: generateKey(),
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [username, password, email, agreement, submitButton(t)],
    },
    settings: { ...DEFAULT_FORM_SETTINGS },
  }
}

export const userRegistrationTemplate: FormTemplateMeta = {
  id: 'userRegistration',
  icon: 'i-lucide-user-plus',
  nameKey: 'templates.userRegistration.name',
  descriptionKey: 'templates.userRegistration.description',
  fieldCount: 4,
  fieldTypes: ['text', 'password', 'email', 'checkbox'],
  build,
}
