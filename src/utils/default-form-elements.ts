import type { FormKitSchemaFormKit } from '@formkit/core'
import { ref } from 'vue'

export const DEFAULT_DATE_VALUE_FORMAT = 'yyyy-MM-dd'
export const DEFAULT_TIME_VALUE_FORMAT = 'HH:mm:ss'
export const DEFAULT_DATE_TIME_VALUE_FORMAT = 'yyyy-MM-dd HH:mm:ss'

export const formSchema = ref<FormKitSchemaFormKit[]>([
  {
    $formkit: 'submit',
    outerClass: 'col-span-12 pt-2',
    type: 'submit',
    name: 'submit_button',
    label: 'Submit',
  },
])
export const selectedIndex = ref(0)
export const selectedKey = ref<string | null>(null)

export type FormLabelPosition = 'top' | 'left'

export const formMeta = ref<{
  name: string
  labelPosition: FormLabelPosition
  labelWidth: number
}>({
  name: 'form',
  labelPosition: 'top',
  labelWidth: 80,
})

export const selectedTarget = ref<'field' | 'form'>('form')

type DefaultElementDef = Omit<
  FormKitSchemaFormKit,
  'name' | 'label' | 'placeholder' | 'help' | 'description'
> & {
  nameKey: string
  labelKey?: string
  placeholderKey?: string
  helpKey?: string
  descriptionKey: string
}

const defs: DefaultElementDef[] = [
  {
    $formkit: 'text',
    nameKey: 'elements.text.name',
    labelKey: 'elements.text.label',
    outerClass: 'col-span-12',
    id: 'text_field',
    props: { size: 'medium', disabled: false, clearable: true },
    placeholderKey: 'elements.text.placeholder',
    helpKey: 'elements.common.help',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.text.description',
  },
  {
    $formkit: 'textarea',
    nameKey: 'elements.textarea.name',
    labelKey: 'elements.textarea.label',
    id: 'textarea_field',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true },
    placeholderKey: 'elements.textarea.placeholder',
    helpKey: 'elements.common.help',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.textarea.description',
  },
  {
    $formkit: 'email',
    nameKey: 'elements.email.name',
    labelKey: 'elements.email.label',
    outerClass: 'col-span-12',
    id: 'email_field',
    props: { size: 'medium', disabled: false, clearable: true },
    placeholderKey: 'elements.email.placeholder',
    helpKey: 'elements.common.help',
    validation: 'email',
    validationVisibility: 'live',
    descriptionKey: 'elements.email.description',
  },
  {
    $formkit: 'number',
    nameKey: 'elements.number.name',
    labelKey: 'elements.number.label',
    outerClass: 'col-span-12',
    id: 'number_field',
    props: { size: 'medium', disabled: false, clearable: true },
    placeholderKey: 'elements.number.placeholder',
    number: 'integer',
    helpKey: 'elements.common.help',
    validation: 'number',
    validationVisibility: 'live',
    descriptionKey: 'elements.number.description',
  },
  {
    $formkit: 'url',
    nameKey: 'elements.url.name',
    labelKey: 'elements.url.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true },
    placeholderKey: 'elements.url.placeholder',
    id: 'url_field',
    validation: 'url',
    validationVisibility: 'live',
    descriptionKey: 'elements.url.description',
  },
  {
    $formkit: 'checkbox',
    nameKey: 'elements.checkbox.name',
    labelKey: 'elements.checkbox.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true },
    options: ['One'],
    id: 'checkbox_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.checkbox.description',
  },
  {
    $formkit: 'color',
    nameKey: 'elements.color.name',
    labelKey: 'elements.color.label',
    value: '#00ff00',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true },
    id: 'color_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.color.description',
  },
  {
    $formkit: 'date',
    nameKey: 'elements.date.name',
    labelKey: 'elements.date.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true, valueFormat: DEFAULT_DATE_VALUE_FORMAT, type: 'date' },
    id: 'date_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.date.description',
  },
  {
    $formkit: 'time',
    nameKey: 'elements.time.name',
    labelKey: 'elements.time.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true, valueFormat: DEFAULT_TIME_VALUE_FORMAT },
    id: 'time_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.time.description',
  },
  {
    $formkit: 'naiveDateTime',
    nameKey: 'elements.dateTime.name',
    labelKey: 'elements.dateTime.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: {
      size: 'medium',
      disabled: false,
      clearable: true,
      valueFormat: DEFAULT_DATE_TIME_VALUE_FORMAT,
      type: 'datetime',
    },
    id: 'date_time_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.dateTime.description',
  },
  {
    $formkit: 'file',
    nameKey: 'elements.file.name',
    labelKey: 'elements.file.label',
    helpKey: 'elements.file.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true },
    id: 'file_field',
    validation: '',
    accept: '.pdf,.doc,.docx,.xml,.md,.csv,.jpg,.png,.webp',
    validationVisibility: 'live',
    descriptionKey: 'elements.file.description',
  },
  {
    $formkit: 'password',
    nameKey: 'elements.password.name',
    labelKey: 'elements.password.label',
    placeholderKey: 'elements.password.placeholder',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true },
    id: 'password_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.password.description',
  },
  {
    $formkit: 'radio',
    options: ['one'],
    nameKey: 'elements.radio.name',
    labelKey: 'elements.radio.label',
    outerClass: 'col-span-12',
    helpKey: 'elements.common.help',
    props: { size: 'medium', disabled: false, clearable: true },
    id: 'radio_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.radio.description',
  },
  {
    $formkit: 'range',
    nameKey: 'elements.range.name',
    labelKey: 'elements.range.label',
    children: '$slots.default',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false, clearable: true },
    value: 0,
    __raw__sectionsSchema: {
      prefix: {
        $el: 'div',
        attrs: {
          class: ' py-1 px-2 mr-1 text-sm flex items-center bg-muted mr-2 rounded-md',
        },
        children: '$value',
      },
    },
    id: 'range_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.range.description',
  },
  {
    $formkit: 'select',
    nameKey: 'elements.select.name',
    labelKey: 'elements.select.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: {
      size: 'medium',
      disabled: false,
      clearable: true,
      filterable: false,
      multiple: false,
    },
    id: 'select_field',
    validation: '',
    validationVisibility: 'live',
    options: ['one'],
    descriptionKey: 'elements.select.description',
  },
  {
    $formkit: 'naiveCascader',
    nameKey: 'elements.naiveCascader.name',
    labelKey: 'elements.naiveCascader.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: {
      size: 'medium',
      disabled: false,
      clearable: true,
      filterable: false,
      multiple: false,
    },
    placeholderKey: 'elements.common.selectPlaceholder',
    id: 'naive_cascader_field',
    validation: '',
    validationVisibility: 'live',
    options: [
      {
        label: 'Option 1',
        value: '1',
        children: [
          { label: 'Option 1-1', value: '1-1' },
          { label: 'Option 1-2', value: '1-2' },
        ],
      },
      {
        label: 'Option 2',
        value: '2',
      },
    ],
    descriptionKey: 'elements.naiveCascader.description',
  },
  {
    $formkit: 'naiveTreeSelect',
    nameKey: 'elements.naiveTreeSelect.name',
    labelKey: 'elements.naiveTreeSelect.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: {
      size: 'medium',
      disabled: false,
      clearable: true,
      filterable: false,
      multiple: false,
    },
    placeholderKey: 'elements.common.selectPlaceholder',
    id: 'naive_tree_select_field',
    validation: '',
    validationVisibility: 'live',
    options: [
      {
        label: 'Node 1',
        key: '1',
        children: [
          { label: 'Node 1-1', key: '1-1' },
          { label: 'Node 1-2', key: '1-2' },
        ],
      },
      { label: 'Node 2', key: '2' },
    ],
    descriptionKey: 'elements.naiveTreeSelect.description',
  },
  {
    $formkit: 'naiveMention',
    nameKey: 'elements.naiveMention.name',
    labelKey: 'elements.naiveMention.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false },
    placeholderKey: 'elements.naiveMention.placeholder',
    id: 'naive_mention_field',
    validation: '',
    validationVisibility: 'live',
    options: ['alice', 'bob'],
    descriptionKey: 'elements.naiveMention.description',
  },
  {
    $formkit: 'naiveRate',
    nameKey: 'elements.naiveRate.name',
    labelKey: 'elements.naiveRate.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { disabled: false, clearable: true, allowHalf: false, count: 5 },
    value: 0,
    id: 'naive_rate_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.naiveRate.description',
  },
  {
    $formkit: 'naiveSwitch',
    nameKey: 'elements.naiveSwitch.name',
    labelKey: 'elements.naiveSwitch.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { size: 'medium', disabled: false },
    value: false,
    id: 'naive_switch_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.naiveSwitch.description',
  },
  {
    $formkit: 'naiveAvatar',
    nameKey: 'elements.naiveAvatar.name',
    labelKey: 'elements.naiveAvatar.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: { src: '', avatarSize: 48, round: true, bordered: false, fallbackText: 'A' },
    id: 'naive_avatar_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.naiveAvatar.description',
  },
  {
    $formkit: 'naiveImage',
    nameKey: 'elements.naiveImage.name',
    labelKey: 'elements.naiveImage.label',
    helpKey: 'elements.common.help',
    outerClass: 'col-span-12',
    props: {
      src: '',
      alt: '',
      width: 240,
      height: 160,
      objectFit: 'cover',
      previewDisabled: false,
      lazy: false,
    },
    id: 'naive_image_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.naiveImage.description',
  },
  {
    $formkit: 'naiveText',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
      type: 'default',
      depth: 1,
      strong: false,
      italic: false,
      underline: false,
      delete: false,
      code: false,
    },
    nameKey: 'elements.naiveText.name',
    descriptionKey: 'elements.naiveText.description',
    id: 'naive_text_static',
  },
  {
    $formkit: 'naiveP',
    outerClass: 'col-span-12',
    props: {
      type: 'default',
      depth: 1,
      align: 'start',
      text: 'text',
    },
    nameKey: 'elements.naiveP.name',
    descriptionKey: 'elements.naiveP.description',
    id: 'naive_p_static',
  },
  {
    $formkit: 'naiveA',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
      href: 'https://www.example.com',
      target: '_blank',
    },
    nameKey: 'elements.naiveA.name',
    descriptionKey: 'elements.naiveA.description',
    id: 'naive_a_static',
  },
  {
    $formkit: 'naiveBlockquote',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
    },
    nameKey: 'elements.naiveBlockquote.name',
    descriptionKey: 'elements.naiveBlockquote.description',
    id: 'naive_blockquote_static',
  },
  {
    $formkit: 'naiveH1',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
    },
    nameKey: 'elements.naiveH1.name',
    descriptionKey: 'elements.naiveH1.description',
    id: 'naive_h1_static',
  },
  {
    $formkit: 'naiveH2',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
    },
    nameKey: 'elements.naiveH2.name',
    descriptionKey: 'elements.naiveH2.description',
    id: 'naive_h2_static',
  },
  {
    $formkit: 'naiveH3',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
    },
    nameKey: 'elements.naiveH3.name',
    descriptionKey: 'elements.naiveH3.description',
    id: 'naive_h3_static',
  },
  {
    $formkit: 'naiveH4',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
    },
    nameKey: 'elements.naiveH4.name',
    descriptionKey: 'elements.naiveH4.description',
    id: 'naive_h4_static',
  },
  {
    $formkit: 'naiveH5',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
    },
    nameKey: 'elements.naiveH5.name',
    descriptionKey: 'elements.naiveH5.description',
    id: 'naive_h5_static',
  },
  {
    $formkit: 'naiveH6',
    outerClass: 'col-span-12',
    props: {
      text: 'text',
    },
    nameKey: 'elements.naiveH6.name',
    descriptionKey: 'elements.naiveH6.description',
    id: 'naive_h6_static',
  },
  {
    $formkit: 'naiveUl',
    outerClass: 'col-span-12',
    options: ['Item 1', 'Item 2', 'Item 3'],
    nameKey: 'elements.naiveUl.name',
    descriptionKey: 'elements.naiveUl.description',
    id: 'naive_ul_static',
  },
  {
    $formkit: 'naiveOl',
    outerClass: 'col-span-12',
    options: ['Item 1', 'Item 2', 'Item 3'],
    nameKey: 'elements.naiveOl.name',
    descriptionKey: 'elements.naiveOl.description',
    id: 'naive_ol_static',
  },
  {
    $formkit: 'naiveLi',
    outerClass: 'col-span-12',
    value: 'List Item',
    nameKey: 'elements.naiveLi.name',
    descriptionKey: 'elements.naiveLi.description',
    id: 'naive_li_static',
  },
  {
    $formkit: 'naiveDivider',
    outerClass: 'col-span-12',
    props: {
      title: 'Divider',
      titlePlacement: 'center',
      dashed: false,
      vertical: false,
    },
    nameKey: 'elements.naiveDivider.name',
    descriptionKey: 'elements.naiveDivider.description',
    id: 'naive_divider_static',
  },
  {
    $formkit: 'naiveAlert',
    outerClass: 'col-span-12',
    props: {
      title: 'Title',
      content: 'Alert',
      type: 'default',
      closable: false,
      bordered: false,
      showIcon: true,
    },
    nameKey: 'elements.naiveAlert.name',
    labelKey: 'elements.naiveAlert.label',
    descriptionKey: 'elements.naiveAlert.description',
    id: 'naive_alert_static',
  },
  {
    $formkit: 'naiveBackTop',
    outerClass: 'col-span-12',
    props: {
      show: true,
      right: 40,
      bottom: 40,
      visibilityHeight: 0,
    },
    nameKey: 'elements.naiveBackTop.name',
    descriptionKey: 'elements.naiveBackTop.description',
    id: 'naive_back_top_static',
  },
  {
    $formkit: 'tel',
    nameKey: 'elements.tel.name',
    labelKey: 'elements.tel.label',
    placeholderKey: 'elements.tel.placeholder',
    outerClass: 'col-span-12',
    helpKey: 'elements.common.help',
    props: { size: 'medium', disabled: false, clearable: true },
    id: 'tel_field',
    validation: '',
    validationVisibility: 'live',
    descriptionKey: 'elements.tel.description',
  },
  {
    $formkit: 'naiveButton',
    outerClass: 'col-span-12 pt-2',
    buttonProps: {
      block: false,
      bordered: true,
      circle: false,
      dashed: false,
      disabled: false,
      focusable: true,
      fullWidth: false,
      align: 'left',
      ghost: false,
      round: false,
      secondary: false,
      size: 'medium',
      type: 'default',
    },
    nameKey: 'elements.naiveButton.name',
    descriptionKey: 'elements.naiveButton.description',
    labelKey: 'elements.naiveButton.label',
  },
  {
    $formkit: 'submit',
    outerClass: 'col-span-12 pt-2',
    type: 'submit',
    nameKey: 'elements.submit.name',
    descriptionKey: 'elements.submit.description',
    labelKey: 'elements.submit.label',
  },
  {
    $formkit: 'reset',
    outerClass: 'col-span-12 pt-2',
    type: 'reset',
    nameKey: 'elements.reset.name',
    descriptionKey: 'elements.reset.description',
    labelKey: 'elements.reset.label',
  },
  {
    $formkit: 'group',
    wrapper: 'list',
    nameKey: 'elements.list.name',
    labelKey: 'elements.list.label',
    id: 'list_field',
    outerClass: 'col-span-12',
    descriptionKey: 'elements.list.description',
    children: [],
    props: { showActions: false },
  },
  {
    $formkit: 'group',
    wrapper: 'card',
    nameKey: 'elements.card.name',
    labelKey: 'elements.card.label',
    id: 'card_container',
    outerClass: 'col-span-12',
    props: { size: 'medium', bordered: true, embedded: false, hoverable: false },
    descriptionKey: 'elements.card.description',
    children: [],
  },
  {
    $formkit: 'group',
    wrapper: 'inputGroup',
    nameKey: 'elements.inputGroup.name',
    labelKey: 'elements.inputGroup.label',
    id: 'input_group_container',
    outerClass: 'col-span-12',
    props: {},
    descriptionKey: 'elements.inputGroup.description',
    children: [],
  },
  {
    $formkit: 'group',
    wrapper: 'tabs',
    nameKey: 'elements.tabs.name',
    labelKey: 'elements.tabs.label',
    id: 'tabs_container',
    outerClass: 'col-span-12',
    props: {},
    descriptionKey: 'elements.tabs.description',
    children: [],
  },
]

export function createDefaultFormElements(t: (key: string) => string): FormKitSchemaFormKit[] {
  return defs.map(({ nameKey, labelKey, placeholderKey, helpKey, descriptionKey, ...rest }) => {
    const next: any = {
      ...(rest as FormKitSchemaFormKit),
      name: t(nameKey),
      description: t(descriptionKey),
    }
    const isCmp = typeof next.$cmp === 'string' && next.$cmp
    const isWrapperContainer = next.$formkit === 'group' && typeof next.wrapper === 'string' && next.wrapper.trim()
    if (labelKey) {
      if (isCmp || isWrapperContainer) {
        next.props = { ...next.props, label: t(labelKey) }
      } else {
        next.label = t(labelKey)
      }
    }
    if (placeholderKey) {
      if (isCmp || isWrapperContainer) {
        next.props = { ...next.props, placeholder: t(placeholderKey) }
      } else {
        next.placeholder = t(placeholderKey)
      }
    }
    if (helpKey) {
      if (isCmp || isWrapperContainer) {
        next.props = { ...next.props, help: t(helpKey) }
      } else {
        next.help = t(helpKey)
      }
    }
    return next
  })
}

export const defaultFormElements: FormKitSchemaFormKit[] = createDefaultFormElements((v) => v)
