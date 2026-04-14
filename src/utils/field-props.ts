import {
  Calendar,
  CalendarClock,
  CircleDot,
  Clock,
  Hash,
  LetterText,
  Link2,
  List,
  Lock,
  Mail,
  Paperclip,
  Phone,
  SlidersHorizontal,
  SquareCheck,
  Type,
  Pipette,
  SendHorizonal,
  Group,
  ListTree,
} from 'lucide-vue-next'

export { defaultFormElements } from './default-form-elements'

export type { FormKitSchemaFormKit } from '@formkit/core'

export const fieldProps = [
  {
    name: 'text',
    tooltip: 'Allows user to enter text',
    icon: Type,
    category: 'fields',
  },
  {
    name: 'email',
    tooltip: 'Allows user to enter email',
    icon: Mail,
    category: 'fields',
  },
  {
    name: 'color',
    tooltip: 'Allows user to select color',
    icon: Pipette,
    category: 'fields',
  },
  {
    name: 'number',
    tooltip: 'Allows user to enter number',
    icon: Hash,
    category: 'fields',
  },
  {
    name: 'checkbox',
    tooltip: 'Allows user to select multiple options',
    icon: SquareCheck,
    category: 'fields',
  },
  {
    name: 'date',
    tooltip: 'Allows user to select date',
    icon: Calendar,
    category: 'fields',
  },
  {
    name: 'datetime-local',
    tooltip: 'Allows user to select date and time',
    icon: CalendarClock,
    category: 'fields',
  },
  {
    name: 'file',
    tooltip: 'Allows user to upload file',
    icon: Paperclip,
    category: 'fields',
  },
  {
    name: 'password',
    tooltip: 'Allows user to enter password',
    icon: Lock,
    category: 'fields',
  },
  {
    name: 'radio',
    tooltip: 'Allows user to select single option',
    icon: CircleDot,
    category: 'fields',
  },
  {
    name: 'range',
    tooltip: 'Allows user to select between a range of values',
    icon: SlidersHorizontal,
    category: 'fields',
  },
  {
    name: 'select',
    tooltip: 'Allows user to select from a list of options',
    icon: List,
    category: 'fields',
  },
  {
    name: 'tel',
    tooltip: 'Allows user to enter telephone number',
    icon: Phone,
    category: 'fields',
  },
  {
    name: 'textarea',
    tooltip: 'Allows user to enter multiple lines of text',
    icon: LetterText,
    category: 'fields',
  },
  {
    name: 'time',
    tooltip: 'Allows user to select time',
    icon: Clock,
    category: 'fields',
  },
  {
    name: 'url',
    tooltip: 'Allows user to enter url',
    icon: Link2,
    category: 'fields',
  },
  {
    name: 'submit',
    tooltip: 'Allows user to submit form',
    icon: SendHorizonal,
    category: 'static',
  },
  {
    name: 'group',
    tooltip: 'Allows user to group fields together',
    icon: Group,
    category: 'structure',
  },
  {
    name: 'list',
    tooltip: 'Allows user to group fields into an array',
    icon: ListTree,
    category: 'structure',
  },
]
