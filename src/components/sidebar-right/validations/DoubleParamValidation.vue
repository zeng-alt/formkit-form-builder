<script setup lang="ts">
import { useFormField } from '../../../composables/form-fields'
import { getValueParts } from '../../../utils/utils'
import { NInput, NDatePicker } from 'naive-ui'
import { computed } from 'vue'
import { MoveRight } from 'lucide-vue-next'
import { ValidationCard, ValidationSwitch } from '../../ui/validation-card'

const props = defineProps<{
  value: string
  tooltip: string
  switchLabel: string
  labelOne: string
  labelTwo: string
  placeholderOne: string
  placeholderTwo: string
}>()

const { updateValidationString, isValidationChecked, isActive, createValidationValue } =
  useFormField()

const active = isActive(isValidationChecked, props.value)
const validation = createValidationValue(props.value)

const min = computed({
  get: () => getValueParts(validation.value || '')[0] || '',
  set: (value: string | null) => {
    const val = value || ''
    const [, maxVal] = getValueParts(validation.value || '')

    validation.value =
      props.value === 'between' || props.value === 'date_between'
        ? `${val},${maxVal}`
        : maxVal
          ? `${val || '0'},${maxVal}`
          : val
  },
})

const max = computed({
  get: () => getValueParts(validation.value || '')[1] || '',
  set: (value: string | null) => {
    const val = value || ''
    const [minVal] = getValueParts(validation.value || '')

    validation.value =
      props.value === 'between' || props.value === 'date_between'
        ? `${minVal},${val}`
        : val === ''
          ? minVal || ''
          : `${minVal || '0'},${val}`
  },
})

const minDate = computed({
  get: () => (min.value ? new Date(min.value).getTime() : null),
  set: (val: number | null) => {
    if (val) {
      min.value = new Date(val).toISOString().split('T')[0] || ''
    } else {
      min.value = ''
    }
  },
})

const maxDate = computed({
  get: () => (max.value ? new Date(max.value).getTime() : null),
  set: (val: number | null) => {
    if (val) {
      max.value = new Date(val).toISOString().split('T')[0] || ''
    } else {
      max.value = ''
    }
  },
})

const toggleSwitch = () => {
  if (props.value === 'between') {
    updateValidationString(`between:${min.value},${max.value}`, !active.value)
  } else if (props.value === 'date_between') {
    if (!min.value || !max.value) {
      updateValidationString(
        `date_between:01/01/2002,01/01/2003`, // date between needs a valid range to be toggled
        !active.value,
      )
    } else {
      updateValidationString(`date_between:${min.value},${max.value}`, !active.value)
    }
  } else {
    updateValidationString(
      !max.value
        ? `length:${min.value}`
        : !min.value
          ? `length:0,${max.value}`
          : `length:${min.value},${max.value}`,
      !active.value,
    )
  }
}
</script>

<template>
  <ValidationCard>
    <ValidationSwitch
      :isActive="active"
      @update:isActive="toggleSwitch"
      :label="props.switchLabel"
      :tooltip="props.tooltip"
      :show-switch="true"
    />
    <div class="flex flex-row gap-2" v-if="active && props.value !== 'date_between'">
      <div class="flex flex-col gap-1">
        <span class="text-xs">{{ props.labelOne }}</span>
        <n-input
          size="small"
          v-model:value="min"
          :placeholder="props.placeholderOne"
          class="text-[10px]"
        />
      </div>
      <MoveRight class="mt-5" />
      <div class="flex flex-col gap-1">
        <span class="text-xs">{{ props.labelTwo }}</span>
        <n-input
          size="small"
          v-model:value="max"
          :placeholder="props.placeholderTwo"
          class="text-[10px]"
        />
      </div>
    </div>
    <div class="flex flex-col gap-2" v-if="active && props.value === 'date_between'">
      <div class="flex flex-col gap-1">
        <span class="text-xs">{{ props.labelOne }}</span>
        <n-date-picker size="small" type="date" v-model:value="minDate" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs">{{ props.labelTwo }}</span>
        <n-date-picker size="small" type="date" v-model:value="maxDate" />
      </div>
    </div>
    <span
      v-if="
        (!max || !min) && (props.value === 'between' || props.value === 'date_between') && active
      "
      class="text-xs text-destructive"
      >Both values must be set</span
    >
  </ValidationCard>
</template>
