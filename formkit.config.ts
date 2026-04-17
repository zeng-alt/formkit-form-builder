// formkit.config.ts
import { rootClasses } from './formkit.theme.ts'
import { defaultConfig, createInput } from '@formkit/vue'
import CustomButton from './src/components/ui/button/CustomButton.vue'
import NaiveTextInput from './src/components/ui/formkit/NaiveTextInput.vue'
import NaiveTextarea from './src/components/ui/formkit/NaiveTextarea.vue'
import NaiveNumberInput from './src/components/ui/formkit/NaiveNumberInput.vue'
import NaiveSelect from './src/components/ui/formkit/NaiveSelect.vue'
import NaiveDatePicker from './src/components/ui/formkit/NaiveDatePicker.vue'
import NaiveTimePicker from './src/components/ui/formkit/NaiveTimePicker.vue'
import NaiveUpload from './src/components/ui/formkit/NaiveUpload.vue'
import NaiveCheckboxGroup from './src/components/ui/formkit/NaiveCheckboxGroup.vue'
import NaiveRadioGroup from './src/components/ui/formkit/NaiveRadioGroup.vue'
import NaiveSlider from './src/components/ui/formkit/NaiveSlider.vue'
import NaiveColorPicker from './src/components/ui/formkit/NaiveColorPicker.vue'
import NaiveAvatar from './src/components/ui/formkit/NaiveAvatar.vue'
import NaiveCascader from './src/components/ui/formkit/NaiveCascader.vue'
import NaiveCheckbox from './src/components/ui/formkit/NaiveCheckbox.vue'
import NaiveMention from './src/components/ui/formkit/NaiveMention.vue'
import NaiveRate from './src/components/ui/formkit/NaiveRate.vue'
import NaiveSwitch from './src/components/ui/formkit/NaiveSwitch.vue'
import NaiveTreeSelect from './src/components/ui/formkit/NaiveTreeSelect.vue'
import NaiveTypographyText from './src/components/ui/formkit/NaiveTypographyText.vue'
import NaiveTypographyP from './src/components/ui/formkit/NaiveTypographyP.vue'
import NaiveTypographyA from './src/components/ui/formkit/NaiveTypographyA.vue'
import NaiveTypographyBlockquote from './src/components/ui/formkit/NaiveTypographyBlockquote.vue'
import NaiveTypographyHr from './src/components/ui/formkit/NaiveTypographyHr.vue'
import NaiveTypographyHeader from './src/components/ui/formkit/NaiveTypographyHeader.vue'
import NaiveTypographyUl from './src/components/ui/formkit/NaiveTypographyUl.vue'
import NaiveTypographyOl from './src/components/ui/formkit/NaiveTypographyOl.vue'
import NaiveTypographyLi from './src/components/ui/formkit/NaiveTypographyLi.vue'
import NaiveDivider from './src/components/ui/formkit/NaiveDivider.vue'

const sharedObservedProps = [
  'naiveProps',
  'placeholder',
  'options',
  'min',
  'max',
  'step',
  'multiple',
  'accept',
]

function createNaiveInput(
  cmpName: string,
  component: unknown,
  options: { family?: string } = {},
) {
  return createInput(
    {
      $el: 'div',
      attrs: { class: 'w-full' },
      children: [
        {
          $cmp: cmpName,
          props: { context: '$node.context' },
        },
      ],
    },
    {
      ...options,
      props: sharedObservedProps,
      library: { [cmpName]: component },
    },
  )
}

export default defaultConfig({
  config: {
    rootClasses,
  },
  inputs: {
    submit: createInput(CustomButton, { family: 'button', props: ['buttonProps'] }),
    naiveButton: createInput(CustomButton, { family: 'button', props: ['buttonProps'] }),
    text: createNaiveInput('NaiveTextInput', NaiveTextInput, { family: 'text' }),
    email: createNaiveInput('NaiveTextInput', NaiveTextInput, { family: 'text' }),
    password: createNaiveInput('NaiveTextInput', NaiveTextInput, { family: 'text' }),
    tel: createNaiveInput('NaiveTextInput', NaiveTextInput, { family: 'text' }),
    url: createNaiveInput('NaiveTextInput', NaiveTextInput, { family: 'text' }),
    textarea: createNaiveInput('NaiveTextarea', NaiveTextarea, { family: 'text' }),
    number: createNaiveInput('NaiveNumberInput', NaiveNumberInput, { family: 'text' }),
    select: createNaiveInput('NaiveSelect', NaiveSelect, { family: 'dropdown' }),
    checkbox: createNaiveInput('NaiveCheckboxGroup', NaiveCheckboxGroup, { family: 'box' }),
    radio: createNaiveInput('NaiveRadioGroup', NaiveRadioGroup, { family: 'box' }),
    range: createNaiveInput('NaiveSlider', NaiveSlider, { family: 'text' }),
    date: createNaiveInput('NaiveDatePicker', NaiveDatePicker, { family: 'text' }),
    'datetime-local': createNaiveInput('NaiveDatePicker', NaiveDatePicker, { family: 'text' }),
    'date-time': createNaiveInput('NaiveDatePicker', NaiveDatePicker, { family: 'text' }),
    time: createNaiveInput('NaiveTimePicker', NaiveTimePicker, { family: 'text' }),
    file: createNaiveInput('NaiveUpload', NaiveUpload, { family: 'text' }),
    color: createNaiveInput('NaiveColorPicker', NaiveColorPicker, { family: 'text' }),
    naiveAvatar: createNaiveInput('NaiveAvatar', NaiveAvatar, { family: 'text' }),
    naiveCascader: createNaiveInput('NaiveCascader', NaiveCascader, { family: 'dropdown' }),
    naiveCheckbox: createNaiveInput('NaiveCheckbox', NaiveCheckbox, { family: 'box' }),
    naiveMention: createNaiveInput('NaiveMention', NaiveMention, { family: 'text' }),
    naiveRate: createNaiveInput('NaiveRate', NaiveRate, { family: 'text' }),
    naiveSwitch: createNaiveInput('NaiveSwitch', NaiveSwitch, { family: 'text' }),
    naiveTreeSelect: createNaiveInput('NaiveTreeSelect', NaiveTreeSelect, { family: 'dropdown' }),
    naiveText: createNaiveInput('NaiveTypographyText', NaiveTypographyText, { family: 'text' }),
    naiveP: createNaiveInput('NaiveTypographyP', NaiveTypographyP, { family: 'text' }),
    naiveA: createNaiveInput('NaiveTypographyA', NaiveTypographyA, { family: 'text' }),
    naiveBlockquote: createNaiveInput('NaiveTypographyBlockquote', NaiveTypographyBlockquote, { family: 'text' }),
    naiveHr: createNaiveInput('NaiveTypographyHr', NaiveTypographyHr, { family: 'text' }),
    naiveH1: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader, { family: 'text' }),
    naiveH2: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader, { family: 'text' }),
    naiveH3: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader, { family: 'text' }),
    naiveH4: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader, { family: 'text' }),
    naiveH5: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader, { family: 'text' }),
    naiveH6: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader, { family: 'text' }),
    naiveUl: createNaiveInput('NaiveTypographyUl', NaiveTypographyUl, { family: 'text' }),
    naiveOl: createNaiveInput('NaiveTypographyOl', NaiveTypographyOl, { family: 'text' }),
    naiveLi: createNaiveInput('NaiveTypographyLi', NaiveTypographyLi, { family: 'text' }),
    naiveDivider: createNaiveInput('NaiveDivider', NaiveDivider, { family: 'text' }),
  },
})
