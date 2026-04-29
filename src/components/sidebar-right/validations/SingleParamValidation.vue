<script setup lang="ts">
import { useFormField } from '../../../composables/form-fields'
import { NInput, NDatePicker } from 'naive-ui'
import { ValidationCard, ValidationSwitch } from '../../ui/validation-card'
import { computed } from 'vue'
import { useFormBuilderI18n } from '../../../i18n/context'

const props = defineProps<{
  value: string
  tooltip: string
  label: string
  placeholder: string
}>()

const { t } = useFormBuilderI18n()
const {
  isActive,
  createValidationValue,
  createValidationMessageValue,
  updateValidationString,
  isValidationChecked,
} =
  useFormField()

const active = isActive(isValidationChecked, props.value)
const paramValue = createValidationValue(props.value)
const messageValue = createValidationMessageValue(props.value)

const inputValue = computed({
  get: () => paramValue.value || '',
  set: (val: string) => {
    paramValue.value = val
  },
})

// DatePicker uses timestamp in naive-ui
const dateValue = computed({
  get: () => (paramValue.value ? new Date(paramValue.value).getTime() : null),
  set: (val: number | null) => {
    if (val) {
      const date = new Date(val)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      paramValue.value = `${year}-${month}-${day}`
    } else {
      paramValue.value = ''
    }
  },
})

const toggleSwitch = () => {
  const currentlyActive = active.value
  const nextActive = !currentlyActive
  let nextParam = paramValue.value
  if (nextActive && props.value === 'matches' && !nextParam) nextParam = '/[0-9]/'
  if (!nextActive && props.value === 'matches') messageValue.value = ''
  updateValidationString(`${props.value}:${nextParam}`, nextActive)
}
</script>

<template>
  <ValidationCard>
    <ValidationSwitch
      :isActive="active"
      @update:isActive="toggleSwitch"
      :label="props.label"
      :tooltip="props.tooltip"
      :show-switch="true"
    />
    <n-input
      v-if="active && props.value !== 'date_after' && props.value !== 'date_before'"
      v-model:value="inputValue"
      size="small"
      :placeholder="props.placeholder"
      class="text-[10px]"
      style="font-size: 10px"
    />
    <n-input
      v-if="active && props.value === 'matches'"
      v-model:value="messageValue"
      size="small"
      :placeholder="t('validation.matchesMessage.placeholder')"
      class="text-[10px]"
      style="font-size: 10px"
    />
    <n-date-picker
      v-if="active && (props.value === 'date_after' || props.value === 'date_before')"
      v-model:value="dateValue"
      size="small"
      type="date"
    />
  </ValidationCard>
</template>
