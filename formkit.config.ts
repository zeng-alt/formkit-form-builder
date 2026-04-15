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
  },
})
