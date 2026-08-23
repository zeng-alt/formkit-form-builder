<script setup lang="ts">
import { computed, watch } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { DATE_PICKER_TYPE_VALUE_FORMATS, DEFAULT_DATE_VALUE_FORMAT, DEFAULT_TIME_VALUE_FORMAT } from '@/elements/constants'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp, currentFieldType } = useFormField()
const { t } = useFormBuilderI18n()

const defaultValueFormat = computed(() => {
  if (currentFieldType.value === 'time') return DEFAULT_TIME_VALUE_FORMAT
  return DEFAULT_DATE_VALUE_FORMAT
})

const naiveValueFormat = createPropsProp<string>('valueFormat', '')
const valueFormat = computed<string>({
  get: () => {
    const raw = naiveValueFormat.value
    if (typeof raw === 'string' && raw.trim()) return raw
    return defaultValueFormat.value
  },
  set: (v) => {
    naiveValueFormat.value = v
  },
})

const naivePickerType = createPropsProp<string>('pickerType', 'date')

const typeOptions = computed(() =>
  ['date', 'datetime', 'daterange', 'datetimerange', 'month', 'monthrange', 'year', 'yearrange', 'quarter', 'quarterrange', 'week'].map(
    (value) => ({ label: t(`edits.pickerType.${value}`), value }),
  ),
)

watch(naivePickerType, (type) => {
  naiveValueFormat.value = DATE_PICKER_TYPE_VALUE_FORMATS[type] ?? defaultValueFormat.value
})
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
  <LabelHelpSection />
  <PlaceholderSection />
  <SelectInput
    v-if="currentFieldType === 'date'"
    :label="t('edits.props.type')"
    :value="naivePickerType"
    :options="typeOptions"
    @update:value="(v) => (naivePickerType = v)"
  />
  <TextInput
    :label="t('edits.props.valueFormat')"
    :placeholder="defaultValueFormat"
    :value="valueFormat"
    @update:value="(v) => (valueFormat = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>
