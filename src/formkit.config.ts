// formkit.config.ts
import { rootClasses } from './formkit.theme.ts'
import { defaultConfig, createInput } from '@formkit/vue'
import CustomButton from './components/ui/button/CustomButton.vue'
import NaiveTextInput from './components/ui/formkit/NaiveTextInput.vue'
import NaiveTextarea from './components/ui/formkit/NaiveTextarea.vue'
import NaiveNumberInput from './components/ui/formkit/NaiveNumberInput.vue'
import NaiveSelect from './components/ui/formkit/NaiveSelect.vue'
import NaiveDatePicker from './components/ui/formkit/NaiveDatePicker.vue'
import NaiveTimePicker from './components/ui/formkit/NaiveTimePicker.vue'
import NaiveUpload from './components/ui/formkit/NaiveUpload.vue'
import NaiveCheckboxGroup from './components/ui/formkit/NaiveCheckboxGroup.vue'
import NaiveRadioGroup from './components/ui/formkit/NaiveRadioGroup.vue'
import NaiveSlider from './components/ui/formkit/NaiveSlider.vue'
import NaiveColorPicker from './components/ui/formkit/NaiveColorPicker.vue'
import NaiveAvatar from './components/ui/formkit/NaiveAvatar.vue'
import NaiveCascader from './components/ui/formkit/NaiveCascader.vue'
import NaiveCheckbox from './components/ui/formkit/NaiveCheckbox.vue'
import NaiveMention from './components/ui/formkit/NaiveMention.vue'
import NaiveRate from './components/ui/formkit/NaiveRate.vue'
import NaiveSwitch from './components/ui/formkit/NaiveSwitch.vue'
import NaiveTreeSelect from './components/ui/formkit/NaiveTreeSelect.vue'
import NaiveTypographyText from './components/ui/formkit/NaiveTypographyText.vue'
import NaiveTypographyP from './components/ui/formkit/NaiveTypographyP.vue'
import NaiveTypographyA from './components/ui/formkit/NaiveTypographyA.vue'
import NaiveTypographyBlockquote from './components/ui/formkit/NaiveTypographyBlockquote.vue'
import NaiveTypographyHr from './components/ui/formkit/NaiveTypographyHr.vue'
import NaiveTypographyHeader from './components/ui/formkit/NaiveTypographyHeader.vue'
import NaiveTypographyUl from './components/ui/formkit/NaiveTypographyUl.vue'
import NaiveTypographyOl from './components/ui/formkit/NaiveTypographyOl.vue'
import NaiveTypographyLi from './components/ui/formkit/NaiveTypographyLi.vue'
import NaiveDivider from './components/ui/formkit/NaiveDivider.vue'

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
