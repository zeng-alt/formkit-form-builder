import type { FormDefinition } from '@/types/dsl'
import { DSL_VERSION } from '@/types/dsl'
import { generateKey } from '@/utils/dnd/schema'
import { DEFAULT_FORM_SETTINGS } from '@/utils/form-layout'
import { makeField, submitButton } from './helpers'
import type { FormTemplateMeta } from './types'

function build(t: (key: string) => string): FormDefinition {
  const rating = makeField('naiveRate', {
    name: 'rating',
    label: t('templates.satisfactionSurvey.fieldRating'),
  })
  const recommend = makeField('radio', {
    name: 'recommend',
    label: t('templates.satisfactionSurvey.fieldRecommend'),
    options: [
      { label: t('templates.satisfactionSurvey.recommendYes'), value: 'yes' },
      { label: t('templates.satisfactionSurvey.recommendNo'), value: 'no' },
    ],
  })
  const suggestion = makeField('textarea', {
    name: 'suggestion',
    label: t('templates.satisfactionSurvey.fieldSuggestion'),
    props: { placeholder: t('templates.satisfactionSurvey.fieldSuggestionPlaceholder') },
  })

  return {
    version: DSL_VERSION,
    id: generateKey(),
    name: t('templates.satisfactionSurvey.name'),
    root: {
      id: generateKey(),
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [rating, recommend, suggestion, submitButton(t)],
    },
    settings: { ...DEFAULT_FORM_SETTINGS },
  }
}

export const satisfactionSurveyTemplate: FormTemplateMeta = {
  id: 'satisfactionSurvey',
  icon: 'i-lucide-star',
  nameKey: 'templates.satisfactionSurvey.name',
  descriptionKey: 'templates.satisfactionSurvey.description',
  fieldCount: 3,
  fieldTypes: ['naiveRate', 'radio', 'textarea'],
  build,
}
