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
      family: options.family ?? 'naive',
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
    naiveButton: createInput(CustomButton, { family: 'naive', props: ['buttonProps', 'buttonText'] }),
    submit: createInput(CustomButton, { family: 'naive', props: ['buttonProps', 'buttonText'] }),
    text: createNaiveInput('NaiveTextInput', NaiveTextInput),
    email: createNaiveInput('NaiveTextInput', NaiveTextInput),
    password: createNaiveInput('NaiveTextInput', NaiveTextInput),
    tel: createNaiveInput('NaiveTextInput', NaiveTextInput),
    url: createNaiveInput('NaiveTextInput', NaiveTextInput),
    textarea: createNaiveInput('NaiveTextarea', NaiveTextarea),
    number: createNaiveInput('NaiveNumberInput', NaiveNumberInput),
    select: createNaiveInput('NaiveSelect', NaiveSelect),
    checkbox: createNaiveInput('NaiveCheckboxGroup', NaiveCheckboxGroup),
    radio: createNaiveInput('NaiveRadioGroup', NaiveRadioGroup),
    range: createNaiveInput('NaiveSlider', NaiveSlider),
    date: createNaiveInput('NaiveDatePicker', NaiveDatePicker),
    'datetime-local': createNaiveInput('NaiveDatePicker', NaiveDatePicker),
    'date-time': createNaiveInput('NaiveDatePicker', NaiveDatePicker),
    time: createNaiveInput('NaiveTimePicker', NaiveTimePicker),
    file: createNaiveInput('NaiveUpload', NaiveUpload),
    color: createNaiveInput('NaiveColorPicker', NaiveColorPicker),
    naiveAvatar: createNaiveInput('NaiveAvatar', NaiveAvatar),
    naiveCascader: createNaiveInput('NaiveCascader', NaiveCascader),
    naiveCheckbox: createNaiveInput('NaiveCheckbox', NaiveCheckbox),
    naiveMention: createNaiveInput('NaiveMention', NaiveMention),
    naiveRate: createNaiveInput('NaiveRate', NaiveRate),
    naiveSwitch: createNaiveInput('NaiveSwitch', NaiveSwitch),
    naiveTreeSelect: createNaiveInput('NaiveTreeSelect', NaiveTreeSelect),
    naiveText: createNaiveInput('NaiveTypographyText', NaiveTypographyText),
    naiveP: createNaiveInput('NaiveTypographyP', NaiveTypographyP),
    naiveA: createNaiveInput('NaiveTypographyA', NaiveTypographyA),
    naiveBlockquote: createNaiveInput('NaiveTypographyBlockquote', NaiveTypographyBlockquote),
    naiveHr: createNaiveInput('NaiveTypographyHr', NaiveTypographyHr),
    naiveH1: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH2: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH3: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH4: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH5: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH6: createNaiveInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveUl: createNaiveInput('NaiveTypographyUl', NaiveTypographyUl),
    naiveOl: createNaiveInput('NaiveTypographyOl', NaiveTypographyOl),
    naiveLi: createNaiveInput('NaiveTypographyLi', NaiveTypographyLi),
    naiveDivider: createNaiveInput('NaiveDivider', NaiveDivider),
  },
})
