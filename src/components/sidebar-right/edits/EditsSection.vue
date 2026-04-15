<script setup lang="ts">
import { selectedIndex, formSchema } from '../../../utils/default-form-elements'
import { useFormField } from '../../../composables/form-fields'
import { computed, ref, watch } from 'vue'
import TextInput from './TextInput.vue'
import TagsInput from './TagsInput.vue'
import ToggleInput from './ToggleInput.vue'
import RangeInputs from './RangeInputs.vue'
import SwitchInput from './SwitchInput.vue'
import SelectInput from './SelectInput.vue'
import JsonTextarea from './JsonTextarea.vue'

const {
  min,
  max,
  modelValue,
  optionsRaw,
  fieldValue,
  label,
  placeholder,
  numOfFiles,
  whichNumber,
  help,
  createButtonProp,
  createNaiveProp,
} = useFormField()

const buttonBlock = createButtonProp<boolean>('block', false)
const buttonBordered = createButtonProp<boolean>('bordered', true)
const buttonCircle = createButtonProp<boolean>('circle', false)
const buttonDashed = createButtonProp<boolean>('dashed', false)
const buttonDisabled = createButtonProp<boolean>('disabled', false)
const buttonFocusable = createButtonProp<boolean>('focusable', true)
const buttonFullWidth = createButtonProp<boolean>('fullWidth', false)
const buttonAlign = createButtonProp<string>('align', 'left')
const buttonGhost = createButtonProp<boolean>('ghost', false)
const buttonRound = createButtonProp<boolean>('round', false)
const buttonSecondary = createButtonProp<boolean>('secondary', false)
const buttonSize = createButtonProp<string>('size', 'medium')
const buttonType = createButtonProp<string>('type', 'default')

const naiveSize = createNaiveProp<string>('size', 'medium')
const naiveDisabled = createNaiveProp<boolean>('disabled', false)
const naiveClearable = createNaiveProp<boolean>('clearable', true)
const naiveFilterable = createNaiveProp<boolean>('filterable', false)
const naiveMultiple = createNaiveProp<boolean>('multiple', false)
const naiveDateTimeValueFormat = createNaiveProp<string>('valueFormat', 'yyyy.MM.dd HH:mm:ss')
const naiveRateAllowHalf = createNaiveProp<boolean>('allowHalf', false)
const naiveRateCountRaw = createNaiveProp<unknown>('count', 5)
const naiveRateCount = computed({
  get: () => {
    const value = naiveRateCountRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '5'
  },
  set: (value: string) => {
    const parsed = Number(value)
    naiveRateCountRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
const avatarSrc = createNaiveProp<string>('src', '')
const avatarSizeRaw = createNaiveProp<unknown>('avatarSize', 48)
const avatarSize = computed({
  get: () => {
    const value = avatarSizeRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '48'
  },
  set: (value: string) => {
    const parsed = Number(value)
    avatarSizeRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
const avatarRound = createNaiveProp<boolean>('round', true)
const avatarBordered = createNaiveProp<boolean>('bordered', false)
const avatarFallbackText = createNaiveProp<string>('fallbackText', 'A')

const typoType = createNaiveProp<string>('type', 'default')
const typoDepthRaw = createNaiveProp<unknown>('depth', 1)
const typoDepth = computed({
  get: () => {
    const value = typoDepthRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '1'
  },
  set: (value: string) => {
    const parsed = Number(value)
    typoDepthRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
const typoStrong = createNaiveProp<boolean>('strong', false)
const typoItalic = createNaiveProp<boolean>('italic', false)
const typoUnderline = createNaiveProp<boolean>('underline', false)
const typoDelete = createNaiveProp<boolean>('delete', false)
const typoCode = createNaiveProp<boolean>('code', false)
const typoAlign = createNaiveProp<string>('align', 'start')

const linkHref = createNaiveProp<string>('href', 'https://www.example.com')
const linkTarget = createNaiveProp<string>('target', '_blank')

const hasField = computed(() => !!formSchema.value[selectedIndex.value])

const currentFieldType = computed(() =>
  hasField.value ? formSchema?.value[selectedIndex.value]?.$formkit || null : null,
)

const treeOptionsJsonDraft = ref('')
const treeOptionsJsonError = ref('')

const treeOptionsJsonModel = computed({
  get: () => treeOptionsJsonDraft.value,
  set: (value: string) => {
    treeOptionsJsonDraft.value = value
    if (!value.trim()) {
      optionsRaw.value = []
      treeOptionsJsonError.value = ''
      return
    }
    try {
      const parsed = JSON.parse(value) as unknown
      if (!Array.isArray(parsed)) {
        treeOptionsJsonError.value = 'Options 必须是数组 JSON'
        return
      }
      optionsRaw.value = parsed
      treeOptionsJsonError.value = ''
    } catch {
      treeOptionsJsonError.value = 'JSON 格式错误'
    }
  },
})

watch(
  () => [selectedIndex.value, currentFieldType.value],
  () => {
    if (currentFieldType.value === 'naiveCascader' || currentFieldType.value === 'naiveTreeSelect') {
      treeOptionsJsonDraft.value = JSON.stringify(optionsRaw.value ?? [], null, 2)
      treeOptionsJsonError.value = ''
    } else {
      treeOptionsJsonDraft.value = ''
      treeOptionsJsonError.value = ''
    }
  },
  { immediate: true },
)

const edits = {
  universalTextInputs: [
    {
      label: 'Label',
      placeholder: 'Enter label',
      model: label,
    },
    {
      label: 'Help Text',
      placeholder: 'Enter help text',
      model: help,
    },
  ],
  placeholderTextInputs: [
    {
      label: 'Placeholder',
      placeholder: 'Enter placeholder',
      model: placeholder,
    },
  ],
  listItemsTagsInputs: [
    {
      label: 'Add Items to List',
      placeholder: 'Add Items...',
      model: modelValue,
    },
  ],
  typographyContentTextInputs: [
    {
      label: 'Content',
      placeholder: 'Enter content',
      model: fieldValue,
    },
  ],
  typographyTypeSelectInputs: [
    {
      label: 'type',
      model: typoType,
      options: [
        { label: 'default', value: 'default' },
        { label: 'primary', value: 'primary' },
        { label: 'info', value: 'info' },
        { label: 'success', value: 'success' },
        { label: 'warning', value: 'warning' },
        { label: 'error', value: 'error' },
      ],
    },
  ],
  typographyDepthSelectInputs: [
    {
      label: 'depth',
      model: typoDepth,
      options: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
      ],
    },
  ],
  typographyTextStyleSwitchInputs: [
    { label: 'strong', model: typoStrong },
    { label: 'italic', model: typoItalic },
    { label: 'underline', model: typoUnderline },
    { label: 'delete', model: typoDelete },
    { label: 'code', model: typoCode },
  ],
  typographyAlignSelectInputs: [
    {
      label: 'align',
      model: typoAlign,
      options: [
        { label: 'start', value: 'start' },
        { label: 'center', value: 'center' },
        { label: 'end', value: 'end' },
        { label: 'justify', value: 'justify' },
      ],
    },
  ],
  linkTextInputs: [
    {
      label: 'href',
      placeholder: 'https://...',
      model: linkHref,
    },
  ],
  linkTargetSelectInputs: [
    {
      label: 'target',
      model: linkTarget,
      options: [
        { label: '_blank', value: '_blank' },
        { label: '_self', value: '_self' },
      ],
    },
  ],
  treeOptionsJsonInputs: [
    {
      label: 'Options (JSON)',
      placeholder:
        '[{"label":"Option 1","value":"1","children":[{"label":"Option 1-1","value":"1-1"}]}]',
      model: treeOptionsJsonModel,
      error: treeOptionsJsonError,
    },
  ],
  numberToggleInputs: [
    {
      label: '',
      itemLabelOne: 'Decimal',
      itemLabelTwo: 'Integer',
      valueOne: 'float',
      valueTwo: 'integer',
      type: 'single' as const,
      model: whichNumber,
    },
  ],
  fileToggleInputs: [
    {
      label: 'Number of files',
      itemLabelOne: 'Multiple',
      itemLabelTwo: 'Single',
      valueOne: 'true',
      valueTwo: 'false',
      type: 'single' as const,
      model: numOfFiles,
    },
  ],
  rangeInputs: [
    {
      labelOne: 'Min',
      labelTwo: 'Max',
      placeholderOne: '0',
      placeholderTwo: '10',
      modelOne: min,
      modelTwo: max,
    },
  ],
  naiveSizeSelectInputs: [
    {
      label: 'size',
      model: naiveSize,
      options: [
        { label: 'tiny', value: 'tiny' },
        { label: 'small', value: 'small' },
        { label: 'medium', value: 'medium' },
        { label: 'large', value: 'large' },
      ],
    },
  ],
  naiveDisabledSwitchInputs: [{ label: 'disabled', model: naiveDisabled }],
  naiveClearableSwitchInputs: [{ label: 'clearable', model: naiveClearable }],
  naiveDateTimeTextInputs: [
    {
      label: 'value-format',
      placeholder: 'yyyy.MM.dd HH:mm:ss',
      model: naiveDateTimeValueFormat,
    },
  ],
  selectSwitchInputs: [
    { label: 'filterable', model: naiveFilterable },
    { label: 'multiple', model: naiveMultiple },
  ],
  rateTextInputs: [
    {
      label: 'count',
      placeholder: '5',
      model: naiveRateCount,
    },
  ],
  rateSwitchInputs: [{ label: 'allow-half', model: naiveRateAllowHalf }],
  avatarTextInputs: [
    {
      label: 'src',
      placeholder: 'https://...',
      model: avatarSrc,
    },
    {
      label: 'size',
      placeholder: '48',
      model: avatarSize,
    },
    {
      label: 'fallback-text',
      placeholder: 'A',
      model: avatarFallbackText,
    },
  ],
  avatarSwitchInputs: [
    { label: 'round', model: avatarRound },
    { label: 'bordered', model: avatarBordered },
  ],
  buttonSwitchInputs: [
    { label: 'block', model: buttonBlock },
    { label: 'bordered', model: buttonBordered },
    { label: 'circle', model: buttonCircle },
    { label: 'dashed', model: buttonDashed },
    { label: 'disabled', model: buttonDisabled },
    { label: 'focusable', model: buttonFocusable },
    { label: 'full width', model: buttonFullWidth },
    { label: 'ghost', model: buttonGhost },
    { label: 'round', model: buttonRound },
    { label: 'secondary', model: buttonSecondary },
  ],
  buttonSelectInputs: [
    {
      label: 'align',
      model: buttonAlign,
      options: [
        { label: 'left', value: 'left' },
        { label: 'center', value: 'center' },
        { label: 'right', value: 'right' },
      ],
    },
    {
      label: 'size',
      model: buttonSize,
      options: [
        { label: 'tiny', value: 'tiny' },
        { label: 'small', value: 'small' },
        { label: 'medium', value: 'medium' },
        { label: 'large', value: 'large' },
      ],
    },
    {
      label: 'type',
      model: buttonType,
      options: [
        { label: 'default', value: 'default' },
        { label: 'tertiary', value: 'tertiary' },
        { label: 'primary', value: 'primary' },
        { label: 'success', value: 'success' },
        { label: 'info', value: 'info' },
        { label: 'warning', value: 'warning' },
        { label: 'error', value: 'error' },
      ],
    },
  ],
}

const showForFieldType = (editType: string, fieldType: string | null) => {
  const naiveSizeFields = [
    'text',
    'textarea',
    'email',
    'password',
    'url',
    'tel',
    'number',
    'date',
    'datetime-local',
    'date-time',
    'time',
    'color',
    'file',
    'range',
    'select',
    'radio',
    'checkbox',
    'naiveCascader',
    'naiveTreeSelect',
    'naiveMention',
    'naiveSwitch',
    'naiveCheckbox',
  ]
  const naiveDisabledFields = [
    ...naiveSizeFields,
    'naiveRate',
  ]
  const naiveClearableFields = [
    'text',
    'textarea',
    'email',
    'password',
    'url',
    'tel',
    'number',
    'date',
    'datetime-local',
    'date-time',
    'time',
    'color',
    'file',
    'select',
    'naiveCascader',
    'naiveTreeSelect',
    'naiveRate',
  ]
  const editMap: Record<string, string[]> = {
    universalTextInputs: [
      'text',
      'textarea',
      'email',
      'password',
      'url',
      'tel',
      'number',
      'date',
      'datetime-local',
      'date-time',
      'time',
      'color',
      'file',
      'range',
      'select',
      'radio',
      'checkbox',
      'naiveCascader',
      'naiveTreeSelect',
      'naiveMention',
      'naiveRate',
      'naiveSwitch',
      'naiveCheckbox',
      'naiveAvatar',
      'naiveButton',
      'submit',
    ],
    placeholderTextInputs: [
      'text',
      'textarea',
      'email',
      'password',
      'url',
      'tel',
      'number',
      'naiveCascader',
      'naiveTreeSelect',
      'naiveMention',
    ],
    listItemsTagsInputs: ['checkbox', 'radio', 'select', 'naiveMention', 'naiveUl', 'naiveOl'],
    typographyContentTextInputs: [
      'naiveText',
      'naiveP',
      'naiveA',
      'naiveBlockquote',
      'naiveH1',
      'naiveH2',
      'naiveH3',
      'naiveH4',
      'naiveH5',
      'naiveH6',
      'naiveLi',
    ],
    typographyTypeSelectInputs: [
      'naiveText',
      'naiveP',
      'naiveBlockquote',
      'naiveH1',
      'naiveH2',
      'naiveH3',
      'naiveH4',
      'naiveH5',
      'naiveH6',
    ],
    typographyDepthSelectInputs: ['naiveText', 'naiveP'],
    typographyTextStyleSwitchInputs: ['naiveText'],
    typographyAlignSelectInputs: ['naiveP'],
    linkTextInputs: ['naiveA'],
    linkTargetSelectInputs: ['naiveA'],
    treeOptionsJsonInputs: ['naiveCascader', 'naiveTreeSelect'],
    numberToggleInputs: ['number'],
    fileToggleInputs: ['file'],
    rangeInputs: ['range'],
    naiveDisabledSwitchInputs: naiveDisabledFields,
    naiveClearableSwitchInputs: naiveClearableFields,
    naiveSizeSelectInputs: naiveSizeFields,
    naiveDateTimeTextInputs: ['date-time'],
    selectSwitchInputs: ['select', 'naiveCascader', 'naiveTreeSelect'],
    rateTextInputs: ['naiveRate'],
    rateSwitchInputs: ['naiveRate'],
    avatarTextInputs: ['naiveAvatar'],
    avatarSwitchInputs: ['naiveAvatar'],
    buttonSwitchInputs: ['naiveButton'],
    buttonSelectInputs: ['naiveButton'],
  }

  return !fieldType || editMap[editType]?.includes(fieldType) || false
}

const visibleEdits = computed(() => {
  return {
    universalTextInputs: showForFieldType('universalTextInputs', currentFieldType.value)
      ? edits.universalTextInputs
      : [],
    placeholderTextInputs: showForFieldType('placeholderTextInputs', currentFieldType.value)
      ? edits.placeholderTextInputs
      : [],
    listItemsTagsInputs: showForFieldType('listItemsTagsInputs', currentFieldType.value)
      ? edits.listItemsTagsInputs
      : [],
    typographyContentTextInputs: showForFieldType('typographyContentTextInputs', currentFieldType.value)
      ? edits.typographyContentTextInputs
      : [],
    typographyTypeSelectInputs: showForFieldType('typographyTypeSelectInputs', currentFieldType.value)
      ? edits.typographyTypeSelectInputs
      : [],
    typographyDepthSelectInputs: showForFieldType('typographyDepthSelectInputs', currentFieldType.value)
      ? edits.typographyDepthSelectInputs
      : [],
    typographyTextStyleSwitchInputs: showForFieldType('typographyTextStyleSwitchInputs', currentFieldType.value)
      ? edits.typographyTextStyleSwitchInputs
      : [],
    typographyAlignSelectInputs: showForFieldType('typographyAlignSelectInputs', currentFieldType.value)
      ? edits.typographyAlignSelectInputs
      : [],
    linkTextInputs: showForFieldType('linkTextInputs', currentFieldType.value) ? edits.linkTextInputs : [],
    linkTargetSelectInputs: showForFieldType('linkTargetSelectInputs', currentFieldType.value)
      ? edits.linkTargetSelectInputs
      : [],
    treeOptionsJsonInputs: showForFieldType('treeOptionsJsonInputs', currentFieldType.value)
      ? edits.treeOptionsJsonInputs
      : [],
    numberToggleInputs: showForFieldType('numberToggleInputs', currentFieldType.value)
      ? edits.numberToggleInputs
      : [],
    fileToggleInputs: showForFieldType('fileToggleInputs', currentFieldType.value)
      ? edits.fileToggleInputs
      : [],
    rangeInputs: showForFieldType('rangeInputs', currentFieldType.value) ? edits.rangeInputs : [],
    naiveSizeSelectInputs: showForFieldType('naiveSizeSelectInputs', currentFieldType.value)
      ? edits.naiveSizeSelectInputs
      : [],
    naiveDisabledSwitchInputs: showForFieldType('naiveDisabledSwitchInputs', currentFieldType.value)
      ? edits.naiveDisabledSwitchInputs
      : [],
    naiveClearableSwitchInputs: showForFieldType('naiveClearableSwitchInputs', currentFieldType.value)
      ? edits.naiveClearableSwitchInputs
      : [],
    naiveDateTimeTextInputs: showForFieldType('naiveDateTimeTextInputs', currentFieldType.value)
      ? edits.naiveDateTimeTextInputs
      : [],
    selectSwitchInputs: showForFieldType('selectSwitchInputs', currentFieldType.value)
      ? edits.selectSwitchInputs
      : [],
    rateTextInputs: showForFieldType('rateTextInputs', currentFieldType.value) ? edits.rateTextInputs : [],
    rateSwitchInputs: showForFieldType('rateSwitchInputs', currentFieldType.value)
      ? edits.rateSwitchInputs
      : [],
    avatarTextInputs: showForFieldType('avatarTextInputs', currentFieldType.value) ? edits.avatarTextInputs : [],
    avatarSwitchInputs: showForFieldType('avatarSwitchInputs', currentFieldType.value)
      ? edits.avatarSwitchInputs
      : [],
    buttonSwitchInputs: showForFieldType('buttonSwitchInputs', currentFieldType.value)
      ? edits.buttonSwitchInputs
      : [],
    buttonSelectInputs: showForFieldType('buttonSelectInputs', currentFieldType.value)
      ? edits.buttonSelectInputs
      : [],
  }
})
</script>

<template>
  <div v-if="!hasField" class="flex p-2 h-full text-[11px] md:text-xs text-muted-foreground">
    Select a field to edit its properties
  </div>
  <template v-else>
    <div class="p-2">
      <div class="space-y-2 md:space-y-3">
        <!-- Universal Edits (Label & Help Text) -->
        <template
          v-for="(textInput, index) in visibleEdits.universalTextInputs"
          :key="`universal-${index}`"
        >
          <TextInput
            :label="textInput.label"
            :placeholder="textInput.placeholder"
            :value="textInput.model.value"
            @update:value="(v) => (textInput.model.value = v)"
          />
        </template>

        <!-- Placeholder Edit -->
        <template
          v-for="(textInput, index) in visibleEdits.placeholderTextInputs"
          :key="`placeholder-${index}`"
        >
          <TextInput
            :label="textInput.label"
            :placeholder="textInput.placeholder"
            :value="textInput.model.value"
            @update:value="(v) => (textInput.model.value = v)"
          />
        </template>

        <template
          v-for="(textInput, index) in visibleEdits.typographyContentTextInputs"
          :key="`typography-content-${index}`"
        >
          <TextInput
            :label="textInput.label"
            :placeholder="textInput.placeholder"
            :value="textInput.model.value"
            @update:value="(v) => (textInput.model.value = v)"
          />
        </template>

        <template
          v-for="(selectInput, index) in visibleEdits.typographyTypeSelectInputs"
          :key="`typography-type-${index}`"
        >
          <SelectInput
            :label="selectInput.label"
            :value="selectInput.model.value"
            :options="selectInput.options"
            @update:value="(v) => (selectInput.model.value = v)"
          />
        </template>

        <template
          v-for="(selectInput, index) in visibleEdits.typographyDepthSelectInputs"
          :key="`typography-depth-${index}`"
        >
          <SelectInput
            :label="selectInput.label"
            :value="selectInput.model.value"
            :options="selectInput.options"
            @update:value="(v) => (selectInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.typographyTextStyleSwitchInputs"
          :key="`typography-style-${index}`"
        >
          <SwitchInput
            :label="switchInput.label"
            :value="switchInput.model.value"
            @update:value="(v) => (switchInput.model.value = v)"
          />
        </template>

        <template
          v-for="(selectInput, index) in visibleEdits.typographyAlignSelectInputs"
          :key="`typography-align-${index}`"
        >
          <SelectInput
            :label="selectInput.label"
            :value="selectInput.model.value"
            :options="selectInput.options"
            @update:value="(v) => (selectInput.model.value = v)"
          />
        </template>

        <template v-for="(textInput, index) in visibleEdits.linkTextInputs" :key="`link-${index}`">
          <TextInput
            :label="textInput.label"
            :placeholder="textInput.placeholder"
            :value="textInput.model.value"
            @update:value="(v) => (textInput.model.value = v)"
          />
        </template>

        <template
          v-for="(selectInput, index) in visibleEdits.linkTargetSelectInputs"
          :key="`link-target-${index}`"
        >
          <SelectInput
            :label="selectInput.label"
            :value="selectInput.model.value"
            :options="selectInput.options"
            @update:value="(v) => (selectInput.model.value = v)"
          />
        </template>

        <!-- List Items Edit -->
        <template
          v-for="(tagsInput, index) in visibleEdits.listItemsTagsInputs"
          :key="`list-items-${index}`"
        >
          <TagsInput
            :label="tagsInput.label"
            :placeholder="tagsInput.placeholder"
            :value="tagsInput.model.value"
            @update:value="(v) => (tagsInput.model.value = v)"
          />
        </template>

        <template
          v-for="(jsonInput, index) in visibleEdits.treeOptionsJsonInputs"
          :key="`tree-options-json-${index}`"
        >
          <JsonTextarea
            :label="jsonInput.label"
            :placeholder="jsonInput.placeholder"
            :value="jsonInput.model.value"
            :error="jsonInput.error.value"
            @update:value="(v) => (jsonInput.model.value = v)"
          />
        </template>

        <!-- Number Type Edit -->
        <template
          v-for="(toggleInput, index) in visibleEdits.numberToggleInputs"
          :key="`number-toggle-${index}`"
        >
          <ToggleInput
            :label="toggleInput.label"
            :item-label-one="toggleInput.itemLabelOne"
            :item-label-two="toggleInput.itemLabelTwo"
            :value-one="toggleInput.valueOne"
            :value-two="toggleInput.valueTwo"
            :type="toggleInput.type"
            :value="toggleInput.model.value"
            @update:value="(v) => (toggleInput.model.value = v)"
          />
        </template>

        <!-- File Edit -->
        <template
          v-for="(toggleInput, index) in visibleEdits.fileToggleInputs"
          :key="`file-toggle-${index}`"
        >
          <ToggleInput
            :label="toggleInput.label"
            :item-label-one="toggleInput.itemLabelOne"
            :item-label-two="toggleInput.itemLabelTwo"
            :value-one="toggleInput.valueOne"
            :value-two="toggleInput.valueTwo"
            :type="toggleInput.type"
            :value="toggleInput.model.value"
            @update:value="(v) => (toggleInput.model.value = v)"
          />
        </template>

        <!-- Range Edit -->
        <template v-for="(rangeInput, index) in visibleEdits.rangeInputs" :key="`range-${index}`">
          <RangeInputs
            :label-one="rangeInput.labelOne"
            :label-two="rangeInput.labelTwo"
            :placeholder-one="rangeInput.placeholderOne"
            :placeholder-two="rangeInput.placeholderTwo"
            :value-one="rangeInput.modelOne.value ?? null"
            :value-two="rangeInput.modelTwo.value ?? null"
            @update:valueOne="(v) => {
              if (v !== null) rangeInput.modelOne.value = v
            }"
            @update:valueTwo="(v) => {
              if (v !== null) rangeInput.modelTwo.value = v
            }"
          />
        </template>

        <template
          v-for="(selectInput, index) in visibleEdits.naiveSizeSelectInputs"
          :key="`naive-size-select-${index}`"
        >
          <SelectInput
            :label="selectInput.label"
            :value="selectInput.model.value"
            :options="selectInput.options"
            @update:value="(v) => (selectInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.naiveDisabledSwitchInputs"
          :key="`naive-disabled-switch-${index}`"
        >
          <SwitchInput
            :label="switchInput.label"
            :value="switchInput.model.value"
            @update:value="(v) => (switchInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.naiveClearableSwitchInputs"
          :key="`naive-clearable-switch-${index}`"
        >
          <SwitchInput
            :label="switchInput.label"
            :value="switchInput.model.value"
            @update:value="(v) => (switchInput.model.value = v)"
          />
        </template>

        <template
          v-for="(textInput, index) in visibleEdits.naiveDateTimeTextInputs"
          :key="`naive-datetime-text-${index}`"
        >
          <TextInput
            :label="textInput.label"
            :placeholder="textInput.placeholder"
            :value="textInput.model.value"
            @update:value="(v) => (textInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.selectSwitchInputs"
          :key="`select-switch-${index}`"
        >
          <SwitchInput
            :label="switchInput.label"
            :value="switchInput.model.value"
            @update:value="(v) => (switchInput.model.value = v)"
          />
        </template>

        <template
          v-for="(textInput, index) in visibleEdits.rateTextInputs"
          :key="`rate-text-${index}`"
        >
          <TextInput
            :label="textInput.label"
            :placeholder="textInput.placeholder"
            :value="textInput.model.value"
            @update:value="(v) => (textInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.rateSwitchInputs"
          :key="`rate-switch-${index}`"
        >
          <SwitchInput
            :label="switchInput.label"
            :value="switchInput.model.value"
            @update:value="(v) => (switchInput.model.value = v)"
          />
        </template>

        <template
          v-for="(textInput, index) in visibleEdits.avatarTextInputs"
          :key="`avatar-text-${index}`"
        >
          <TextInput
            :label="textInput.label"
            :placeholder="textInput.placeholder"
            :value="textInput.model.value"
            @update:value="(v) => (textInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.avatarSwitchInputs"
          :key="`avatar-switch-${index}`"
        >
          <SwitchInput
            :label="switchInput.label"
            :value="switchInput.model.value"
            @update:value="(v) => (switchInput.model.value = v)"
          />
        </template>

        <template
          v-for="(selectInput, index) in visibleEdits.buttonSelectInputs"
          :key="`button-select-${index}`"
        >
          <SelectInput
            :label="selectInput.label"
            :value="selectInput.model.value"
            :options="selectInput.options"
            @update:value="(v) => (selectInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.buttonSwitchInputs"
          :key="`button-switch-${index}`"
        >
          <SwitchInput
            :label="switchInput.label"
            :value="switchInput.model.value"
            @update:value="(v) => (switchInput.model.value = v)"
          />
        </template>
      </div>
    </div>
  </template>
</template>
