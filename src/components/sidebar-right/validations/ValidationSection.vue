<script setup lang="ts">
import SingleValueValidation from './SingleValueValidation.vue'
import SingleParamValidation from './SingleParamValidation.vue'
import DoubleParamValidation from './DoubleParamValidation.vue'
import { selectedIndex, formSchema } from '../../../utils/default-form-elements'
import { computed } from 'vue'
import { useFormBuilderI18n } from '../../../i18n/context'

const { t } = useFormBuilderI18n()

const validations = computed(() => ({
  singleValue: [
    {
      value: 'required',
      label: t('validation.required.label'),
      tooltip: t('validation.required.tooltip'),
    },
    {
      value: 'email',
      label: t('validation.email.label'),
      tooltip: t('validation.email.tooltip'),
    },
    {
      value: 'number',
      label: t('validation.number.label'),
      tooltip: t('validation.number.tooltip'),
    },
    {
      value: 'lowercase',
      label: t('validation.lowercase.label'),
      tooltip: t('validation.lowercase.tooltip'),
    },
    {
      value: 'uppercase',
      label: t('validation.uppercase.label'),
      tooltip: t('validation.uppercase.tooltip'),
    },
    {
      value: 'url',
      label: t('validation.url.label'),
      tooltip: t('validation.url.tooltip'),
    },
    {
      value: 'alpha',
      label: t('validation.alpha.label'),
      tooltip: t('validation.alpha.tooltip'),
    },
    {
      value: 'alphanumeric',
      label: t('validation.alphanumeric.label'),
      tooltip: t('validation.alphanumeric.tooltip'),
    },
    {
      value: 'contains_symbol',
      label: t('validation.contains_symbol.label'),
      tooltip: t('validation.contains_symbol.tooltip'),
    },
    {
      value: 'contains_uppercase',
      label: t('validation.contains_uppercase.label'),
      tooltip: t('validation.contains_uppercase.tooltip'),
    },
    {
      value: 'contains_lowercase',
      label: t('validation.contains_lowercase.label'),
      tooltip: t('validation.contains_lowercase.tooltip'),
    },
    {
      value: 'contains_numeric',
      label: t('validation.contains_numeric.label'),
      tooltip: t('validation.contains_numeric.tooltip'),
    },
  ],
  singleParam: [
    {
      value: 'min',
      label: t('validation.min.label'),
      tooltip: t('validation.min.tooltip'),
      placeholder: t('validation.min.placeholder'),
    },
    {
      value: 'max',
      label: t('validation.max.label'),
      tooltip: t('validation.max.tooltip'),
      placeholder: t('validation.max.placeholder'),
    },
    {
      value: 'matches',
      label: t('validation.matches.label'),
      tooltip: t('validation.matches.tooltip'),
      placeholder: t('validation.matches.placeholder'),
    },
    {
      value: 'starts_with',
      label: t('validation.starts_with.label'),
      tooltip: t('validation.starts_with.tooltip'),
      placeholder: t('validation.starts_with.placeholder'),
    },
    {
      value: 'ends_with',
      label: t('validation.ends_with.label'),
      tooltip: t('validation.ends_with.tooltip'),
      placeholder: t('validation.ends_with.placeholder'),
    },
    {
      value: 'date_after',
      label: t('validation.date_after.label'),
      tooltip: t('validation.date_after.tooltip'),
      placeholder: t('validation.date_after.placeholder'),
    },
    {
      value: 'date_before',
      label: t('validation.date_before.label'),
      tooltip: t('validation.date_before.tooltip'),
      placeholder: t('validation.date_before.placeholder'),
    },
  ],
  doubleParam: [
    {
      value: 'date_between',
      label: t('validation.date_between.label'),
      tooltip: t('validation.date_between.tooltip'),
      switchLabel: t('validation.date_between.label'),
      labelOne: t('validation.minLabel'),
      labelTwo: t('validation.maxLabel'),
      placeholderOne: t('validation.min.placeholder'),
      placeholderTwo: t('validation.max.placeholder'),
    },
    {
      value: 'length',
      label: t('validation.length.label'),
      tooltip: t('validation.length.tooltip'),
      switchLabel: t('validation.length.label'),
      labelOne: t('validation.minLabel'),
      labelTwo: t('validation.maxLabel'),
      placeholderOne: t('validation.min.placeholder'),
      placeholderTwo: t('validation.max.placeholder'),
    },
    {
      value: 'between',
      label: t('validation.between.label'),
      tooltip: t('validation.between.tooltip'),
      switchLabel: t('validation.between.label'),
      labelOne: t('validation.minLabel'),
      labelTwo: t('validation.maxLabel'),
      placeholderOne: t('validation.min.placeholder'),
      placeholderTwo: t('validation.max.placeholder'),
    },
  ],
}))

const currentFieldType = computed(() => {
  if (selectedIndex.value !== null && formSchema.value[selectedIndex.value]) {
    return formSchema?.value[selectedIndex.value]?.$formkit || null
  }
  return null
})

const showForFieldType = (validationType: string, fieldType: string | null) => {
  const validationMap: Record<string, string[]> = {
    required: [
      'text',
      'textarea',
      'number',
      'date',
      'radio',
      'checkbox',
      'naiveCheckbox',
      'email',
      'url',
      'color',
      'time',
      'datetime-local',
      'file',
      'password',
      'range',
      'select',
      'naiveCascader',
      'naiveTreeSelect',
      'naiveMention',
      'naiveRate',
      'naiveSwitch',
      'tel',
    ],
    alpha: ['password'],
    alphanumeric: ['password'],
    contains_symbol: ['password'],
    contains_uppercase: ['password'],
    contains_lowercase: ['password'],
    contains_numeric: ['password'],
    email: ['text', 'email'],
    number: ['text', 'number', 'naiveRate'],
    lowercase: ['text', 'textarea', 'password'],
    uppercase: ['text', 'textarea', 'password'],
    url: ['text', 'url'],
    min: ['number', 'text', 'file', 'naiveRate'],
    max: ['number', 'text', 'file', 'naiveRate'],
    matches: ['text', 'password', 'url', 'tel'],
    starts_with: ['text', 'textarea', 'password', 'url', 'tel', 'email'],
    ends_with: ['text', 'textarea', 'password', 'url', 'tel', 'email'],
    date_after: ['date', 'datetime-local'],
    date_before: ['date', 'datetime-local'],
    date_between: ['date', 'datetime-local'],
    length: ['text', 'textarea', 'password', 'url', 'tel', 'email', 'naiveMention'],
    between: ['number'],
  }
  return !fieldType || validationMap[validationType]?.includes(fieldType) || false
}

const visibleValidations = computed(() => {
  return {
    singleValue: validations.value.singleValue.filter((validation) =>
      showForFieldType(validation.value, currentFieldType.value),
    ),
    singleParam: validations.value.singleParam.filter((validation) =>
      showForFieldType(validation.value, currentFieldType.value),
    ),
    doubleParam: validations.value.doubleParam.filter((validation) =>
      showForFieldType(validation.value, currentFieldType.value),
    ),
  }
})
</script>

<template>
  <div v-if="formSchema[selectedIndex]?.$formkit !== 'submit'">
    <span class="text-sm">{{ t('validation.rulesTitle') }}</span>
  </div>

  <template v-for="validation in visibleValidations.singleValue" :key="validation.value">
    <SingleValueValidation
      :value="validation.value"
      :tooltip="validation.tooltip"
      :label="validation.label"
    />
  </template>

  <template v-for="validation in visibleValidations.singleParam" :key="validation.value">
    <SingleParamValidation
      :value="validation.value"
      :tooltip="validation.tooltip"
      :label="validation.label"
      :placeholder="validation.placeholder"
    />
  </template>

  <template v-for="validation in visibleValidations.doubleParam" :key="validation.value">
    <DoubleParamValidation
      :value="validation.value"
      :tooltip="validation.tooltip"
      :switch-label="validation.switchLabel"
      :label-one="validation.labelOne"
      :label-two="validation.labelTwo"
      :placeholder-one="validation.placeholderOne"
      :placeholder-two="validation.placeholderTwo"
    />
  </template>
</template>
