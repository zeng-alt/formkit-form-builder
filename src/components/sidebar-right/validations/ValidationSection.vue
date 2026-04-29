<script setup lang="ts">
import SingleValueValidation from './SingleValueValidation.vue'
import SingleParamValidation from './SingleParamValidation.vue'
import DoubleParamValidation from './DoubleParamValidation.vue'
import { computed } from 'vue'
import { useFormBuilderI18n } from '../../../i18n/context'
import { useFormField, selectedField } from '../../../composables/form-fields'

const { t } = useFormBuilderI18n()
const { currentFieldType } = useFormField()

const validations = computed(() => ({
  singleValue: [
    {
      value: 'accepted',
      label: t('validation.accepted.label'),
      tooltip: t('validation.accepted.tooltip'),
    },
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
      value: 'alpha_spaces',
      label: t('validation.alpha_spaces.label'),
      tooltip: t('validation.alpha_spaces.tooltip'),
    },
    {
      value: 'alphanumeric',
      label: t('validation.alphanumeric.label'),
      tooltip: t('validation.alphanumeric.tooltip'),
    },
    {
      value: 'symbol',
      label: t('validation.symbol.label'),
      tooltip: t('validation.symbol.tooltip'),
    },
    {
      value: 'contains_alpha',
      label: t('validation.contains_alpha.label'),
      tooltip: t('validation.contains_alpha.tooltip'),
    },
    {
      value: 'contains_alphanumeric',
      label: t('validation.contains_alphanumeric.label'),
      tooltip: t('validation.contains_alphanumeric.tooltip'),
    },
    {
      value: 'contains_alpha_spaces',
      label: t('validation.contains_alpha_spaces.label'),
      tooltip: t('validation.contains_alpha_spaces.tooltip'),
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
      value: 'confirm',
      label: t('validation.confirm.label'),
      tooltip: t('validation.confirm.tooltip'),
      placeholder: t('validation.confirm.placeholder'),
    },
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
    {
      value: 'date_format',
      label: t('validation.date_format.label'),
      tooltip: t('validation.date_format.tooltip'),
      placeholder: t('validation.date_format.placeholder'),
    },
    {
      value: 'is',
      label: t('validation.is.label'),
      tooltip: t('validation.is.tooltip'),
      placeholder: t('validation.is.placeholder'),
    },
    {
      value: 'not',
      label: t('validation.not.label'),
      tooltip: t('validation.not.tooltip'),
      placeholder: t('validation.not.placeholder'),
    },
    {
      value: 'require_one',
      label: t('validation.require_one.label'),
      tooltip: t('validation.require_one.tooltip'),
      placeholder: t('validation.require_one.placeholder'),
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

const showForFieldType = (validationType: string, fieldType: string | null) => {
  const validationMap: Record<string, string[]> = {
    accepted: ['checkbox'],
    required: [
      'text',
      'textarea',
      'number',
      'date',
      'radio',
      'checkbox',
      'email',
      'url',
      'color',
      'time',
      'naiveDateTime',
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
    alpha: ['text', 'textarea', 'password'],
    alpha_spaces: ['text', 'textarea', 'password'],
    alphanumeric: ['text', 'textarea', 'password'],
    symbol: ['text', 'textarea', 'password'],
    contains_alpha: ['text', 'textarea', 'password'],
    contains_alphanumeric: ['text', 'textarea', 'password'],
    contains_alpha_spaces: ['text', 'textarea', 'password'],
    contains_symbol: ['text', 'textarea', 'password'],
    contains_uppercase: ['text', 'textarea', 'password'],
    contains_lowercase: ['text', 'textarea', 'password'],
    contains_numeric: ['text', 'textarea', 'password'],
    confirm: ['password', 'text'],
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
    date_after: ['date', 'naiveDateTime'],
    date_before: ['date', 'naiveDateTime'],
    date_between: ['date', 'naiveDateTime'],
    date_format: ['date', 'naiveDateTime', 'text'],
    is: ['text', 'textarea', 'password', 'url', 'tel', 'email', 'number'],
    not: ['text', 'textarea', 'password', 'url', 'tel', 'email', 'number'],
    require_one: ['checkbox', 'radio', 'select'],
    length: ['text', 'textarea', 'password', 'url', 'tel', 'email', 'naiveMention'],
    between: ['number'],
  }
  return !fieldType || validationMap[validationType]?.includes(fieldType) || false
}

const visibleValidations = computed(() => {
  return {
    singleValue: validations.value.singleValue.filter((validation) =>
      showForFieldType(validation.value, currentFieldType.value ?? null),
    ),
    singleParam: validations.value.singleParam.filter((validation) =>
      showForFieldType(validation.value, currentFieldType.value ?? null),
    ),
    doubleParam: validations.value.doubleParam.filter((validation) =>
      showForFieldType(validation.value, currentFieldType.value ?? null),
    ),
  }
})
</script>

<template>
  <div v-if="(selectedField as any)?.$formkit !== 'submit'">
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
