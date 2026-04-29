// formkit.config.ts
import { rootClasses } from './formkit.theme.ts'
import { defaultConfig, createInput } from '@formkit/vue'
import { createI18nPlugin, en, zh } from '@formkit/i18n'
import CustomButton from './components/ui/fields/CustomButton.vue'
import NaiveTextInput from './components/ui/fields/NaiveTextInput.vue'
import NaiveTextarea from './components/ui/fields/NaiveTextarea.vue'
import NaiveNumberInput from './components/ui/fields/NaiveNumberInput.vue'
import NaiveSelect from './components/ui/fields/NaiveSelect.vue'
import NaiveDatePicker from './components/ui/fields/NaiveDatePicker.vue'
import NaiveTimePicker from './components/ui/fields/NaiveTimePicker.vue'
import NaiveUpload from './components/ui/fields/NaiveUpload.vue'
import NaiveCheckboxGroup from './components/ui/fields/NaiveCheckboxGroup.vue'
import NaiveRadioGroup from './components/ui/fields/NaiveRadioGroup.vue'
import NaiveSlider from './components/ui/fields/NaiveSlider.vue'
import NaiveColorPicker from './components/ui/fields/NaiveColorPicker.vue'
import NaiveAvatar from './components/ui/fields/NaiveAvatar.vue'
import NaiveImage from './components/ui/fields/NaiveImage.vue'
import NaiveCascader from './components/ui/fields/NaiveCascader.vue'
import NaiveMention from './components/ui/fields/NaiveMention.vue'
import NaiveRate from './components/ui/fields/NaiveRate.vue'
import NaiveSwitch from './components/ui/fields/NaiveSwitch.vue'
import NaiveTreeSelect from './components/ui/fields/NaiveTreeSelect.vue'
import NaiveTypographyText from './components/ui/structure/NaiveTypographyText.vue'
import NaiveTypographyP from './components/ui/structure/NaiveTypographyP.vue'
import NaiveTypographyA from './components/ui/structure/NaiveTypographyA.vue'
import NaiveTypographyBlockquote from './components/ui/structure/NaiveTypographyBlockquote.vue'
import NaiveTypographyHeader from './components/ui/structure/NaiveTypographyHeader.vue'
import NaiveTypographyUl from './components/ui/structure/NaiveTypographyUl.vue'
import NaiveTypographyOl from './components/ui/structure/NaiveTypographyOl.vue'
import NaiveTypographyLi from './components/ui/structure/NaiveTypographyLi.vue'
import NaiveDivider from './components/ui/structure/NaiveDivider.vue'
import NaiveAlert from './components/ui/structure/NaiveAlert.vue'
import NaiveBackTop from './components/ui/structure/NaiveBackTop.vue'

const sharedObservedProps = [
  'props',
  'placeholder',
  'options',
  'min',
  'max',
  'step',
  'multiple',
  'accept',
]

function createUiInput(
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
  plugins: [createI18nPlugin({ en, zh })],
  locales: { en, zh },
  locale: 'zh',
  config: {
    rootClasses,
  },
  inputs: {
    naiveButton: createInput(CustomButton, { family: 'naive', props: ['buttonProps', 'buttonText', 'label', 'type'] }),
    submit: createInput(CustomButton, { family: 'naive', props: ['buttonProps', 'buttonText', 'label', 'type'] }),
    reset: createInput(CustomButton, { family: 'naive', props: ['buttonProps', 'buttonText', 'label', 'type'] }),
    text: createUiInput('NaiveTextInput', NaiveTextInput),
    email: createUiInput('NaiveTextInput', NaiveTextInput),
    password: createUiInput('NaiveTextInput', NaiveTextInput),
    tel: createUiInput('NaiveTextInput', NaiveTextInput),
    url: createUiInput('NaiveTextInput', NaiveTextInput),
    textarea: createUiInput('NaiveTextarea', NaiveTextarea),
    number: createUiInput('NaiveNumberInput', NaiveNumberInput),
    select: createUiInput('NaiveSelect', NaiveSelect),
    checkbox: createUiInput('NaiveCheckboxGroup', NaiveCheckboxGroup),
    radio: createUiInput('NaiveRadioGroup', NaiveRadioGroup),
    range: createUiInput('NaiveSlider', NaiveSlider),
    date: createUiInput('NaiveDatePicker', NaiveDatePicker),
    time: createUiInput('NaiveTimePicker', NaiveTimePicker),
    naiveDateTime: createUiInput('NaiveDatePicker', NaiveDatePicker),
    file: createUiInput('NaiveUpload', NaiveUpload),
    color: createUiInput('NaiveColorPicker', NaiveColorPicker),
    naiveAvatar: createUiInput('NaiveAvatar', NaiveAvatar),
    naiveImage: createUiInput('NaiveImage', NaiveImage),
    naiveCascader: createUiInput('NaiveCascader', NaiveCascader),
    naiveMention: createUiInput('NaiveMention', NaiveMention),
    naiveRate: createUiInput('NaiveRate', NaiveRate),
    naiveSwitch: createUiInput('NaiveSwitch', NaiveSwitch),
    naiveTreeSelect: createUiInput('NaiveTreeSelect', NaiveTreeSelect),
    naiveText: createUiInput('NaiveTypographyText', NaiveTypographyText),
    naiveP: createUiInput('NaiveTypographyP', NaiveTypographyP),
    naiveA: createUiInput('NaiveTypographyA', NaiveTypographyA),
    naiveBlockquote: createUiInput('NaiveTypographyBlockquote', NaiveTypographyBlockquote),
    naiveH1: createUiInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH2: createUiInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH3: createUiInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH4: createUiInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH5: createUiInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveH6: createUiInput('NaiveTypographyHeader', NaiveTypographyHeader),
    naiveUl: createUiInput('NaiveTypographyUl', NaiveTypographyUl),
    naiveOl: createUiInput('NaiveTypographyOl', NaiveTypographyOl),
    naiveLi: createUiInput('NaiveTypographyLi', NaiveTypographyLi),
    naiveDivider: createUiInput('NaiveDivider', NaiveDivider),
    naiveAlert: createUiInput('NaiveAlert', NaiveAlert),
    naiveBackTop: createUiInput('NaiveBackTop', NaiveBackTop),
  },
})
