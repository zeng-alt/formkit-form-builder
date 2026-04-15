<script setup lang="ts">
import { selectedIndex, formSchema } from '../../../utils/default-form-elements'
import { useFormField } from '../../../composables/form-fields'
import { computed } from 'vue'
import TextInput from './TextInput.vue'
import TagsInput from './TagsInput.vue'
import ToggleInput from './ToggleInput.vue'
import RangeInputs from './RangeInputs.vue'
import SwitchInput from './SwitchInput.vue'
import SelectInput from './SelectInput.vue'

const {
  min,
  max,
  modelValue,
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
  naiveSwitchInputs: [
    { label: 'disabled', model: naiveDisabled },
    { label: 'clearable', model: naiveClearable },
  ],
  naiveSelectInputs: [
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

const hasField = computed(() => !!formSchema.value[selectedIndex.value])

const currentFieldType = computed(() =>
  hasField.value ? formSchema?.value[selectedIndex.value]?.$formkit || null : null,
)

const showForFieldType = (editType: string, fieldType: string | null) => {
  const naiveFields = [
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
      'naiveButton',
      'submit',
    ],
    placeholderTextInputs: ['text', 'textarea', 'email', 'password', 'url', 'tel', 'number'],
    listItemsTagsInputs: ['checkbox', 'radio', 'select'],
    numberToggleInputs: ['number'],
    fileToggleInputs: ['file'],
    rangeInputs: ['range'],
    naiveSwitchInputs: naiveFields,
    naiveSelectInputs: naiveFields,
    naiveDateTimeTextInputs: ['date-time'],
    selectSwitchInputs: ['select'],
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
    numberToggleInputs: showForFieldType('numberToggleInputs', currentFieldType.value)
      ? edits.numberToggleInputs
      : [],
    fileToggleInputs: showForFieldType('fileToggleInputs', currentFieldType.value)
      ? edits.fileToggleInputs
      : [],
    rangeInputs: showForFieldType('rangeInputs', currentFieldType.value) ? edits.rangeInputs : [],
    naiveSwitchInputs: showForFieldType('naiveSwitchInputs', currentFieldType.value)
      ? edits.naiveSwitchInputs
      : [],
    naiveSelectInputs: showForFieldType('naiveSelectInputs', currentFieldType.value)
      ? edits.naiveSelectInputs
      : [],
    naiveDateTimeTextInputs: showForFieldType('naiveDateTimeTextInputs', currentFieldType.value)
      ? edits.naiveDateTimeTextInputs
      : [],
    selectSwitchInputs: showForFieldType('selectSwitchInputs', currentFieldType.value)
      ? edits.selectSwitchInputs
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
          v-for="(selectInput, index) in visibleEdits.naiveSelectInputs"
          :key="`naive-select-${index}`"
        >
          <SelectInput
            :label="selectInput.label"
            :value="selectInput.model.value"
            :options="selectInput.options"
            @update:value="(v) => (selectInput.model.value = v)"
          />
        </template>

        <template
          v-for="(switchInput, index) in visibleEdits.naiveSwitchInputs"
          :key="`naive-switch-${index}`"
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
