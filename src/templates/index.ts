import { userRegistrationTemplate } from './user-registration'
import { leaveApplicationTemplate } from './leave-application'
import { satisfactionSurveyTemplate } from './satisfaction-survey'
import { contactUsTemplate } from './contact-us'
import { employeeRegistrationTemplate } from './employee-registration'
import type { FormTemplateMeta } from './types'

export type { FormTemplateMeta } from './types'

export const FORM_TEMPLATES: FormTemplateMeta[] = [
  userRegistrationTemplate,
  leaveApplicationTemplate,
  satisfactionSurveyTemplate,
  contactUsTemplate,
  employeeRegistrationTemplate,
]
