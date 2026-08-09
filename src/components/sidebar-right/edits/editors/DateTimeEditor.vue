<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { DEFAULT_DATE_TIME_VALUE_FORMAT } from '@/elements/constants'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()
const naiveValueFormat = createPropsProp<string>('valueFormat', '')
const valueFormat = computed<string>({
  get: () => {
    const raw = naiveValueFormat.value
    if (typeof raw === 'string' && raw.trim()) return raw
    return DEFAULT_DATE_TIME_VALUE_FORMAT
  },
  set: (v) => {
    naiveValueFormat.value = v
  },
})

const naivePickerType = createPropsProp<string>('type', 'datetime')
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
  <LabelHelpSection />
  <PlaceholderSection />
  <SelectInput
    :label="t('edits.props.type')"
    :value="naivePickerType"
    :options="[
      { label: 'date', value: 'date' },
      { label: 'datetime', value: 'datetime' },
      { label: 'daterange', value: 'daterange' },
      { label: 'datetimerange', value: 'datetimerange' },
      { label: 'month', value: 'month' },
      { label: 'monthrange', value: 'monthrange' },
      { label: 'year', value: 'year' },
      { label: 'yearrange', value: 'yearrange' },
      { label: 'quarter', value: 'quarter' },
      { label: 'quarterrange', value: 'quarterrange' },
      { label: 'week', value: 'week' },
    ]"
    @update:value="(v) => (naivePickerType = v)"
  />
  <TextInput
    :label="t('edits.props.valueFormat')"
    :placeholder="DEFAULT_DATE_TIME_VALUE_FORMAT"
    :value="valueFormat"
    @update:value="(v) => (valueFormat = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>
