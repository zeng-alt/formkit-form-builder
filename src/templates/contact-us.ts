import type { FormDefinition } from '@/types/dsl'
import { DSL_VERSION } from '@/types/dsl'
import { generateKey } from '@/utils/dnd/schema'
import { DEFAULT_FORM_SETTINGS } from '@/utils/form-layout'
import { makeField, submitButton } from './helpers'
import type { FormTemplateMeta } from './types'

function build(t: (key: string) => string): FormDefinition {
  const name = makeField('text', {
    name: 'name',
    label: t('templates.contactUs.fieldName'),
  })
  const email = makeField('email', {
    name: 'email',
    label: t('templates.contactUs.fieldEmail'),
  })
  const subject = makeField('text', {
    name: 'subject',
    label: t('templates.contactUs.fieldSubject'),
  })
  const message = makeField('textarea', {
    name: 'message',
    label: t('templates.contactUs.fieldMessage'),
    props: { placeholder: t('templates.contactUs.fieldMessagePlaceholder') },
  })

  return {
    version: DSL_VERSION,
    id: generateKey(),
    name: t('templates.contactUs.name'),
    root: {
      id: generateKey(),
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [name, email, subject, message, submitButton(t)],
    },
    settings: { ...DEFAULT_FORM_SETTINGS },
  }
}

export const contactUsTemplate: FormTemplateMeta = {
  id: 'contactUs',
  icon: 'i-lucide-mail',
  nameKey: 'templates.contactUs.name',
  descriptionKey: 'templates.contactUs.description',
  fieldCount: 4,
  fieldTypes: ['text', 'email', 'textarea'],
  build,
}
