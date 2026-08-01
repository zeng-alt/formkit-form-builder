<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { DatePickerProps } from 'naive-ui'
import { NDatePicker } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const size = computed<DatePickerProps['size']>(() => {
  const raw = uiProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as DatePickerProps['size']) ?? 'medium'
})
const clearable = computed<boolean>(() => (uiProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((uiProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)
const bordered = computed<boolean>(() => (uiProps.value.bordered as boolean | undefined) ?? true)

const pickerType = computed<DatePickerProps['type']>(() => {
  const configured = uiProps.value.type
  if (typeof configured === 'string' && configured.trim())
    return configured as DatePickerProps['type']
  const t = props.context.type
  if (t === 'naiveDateTime') return 'datetime'
  return 'date'
})

const valueFormat = computed(() => {
  const configured = uiProps.value.valueFormat
  if (typeof configured === 'string' && configured.trim()) return configured
  return undefined
})

const placeholder = computed(() => props.context.placeholder as string | undefined)

type FormattedValue = string | [string, string] | null

const formattedValue = computed<FormattedValue>({
  get: () => {
    const raw = props.context._value as unknown
    if (raw === null || raw === undefined || raw === '') return null
    if (Array.isArray(raw) && raw.length === 2)
      return [String(raw[0]), String(raw[1])] as [string, string]
    return String(raw)
  },
  set: (next: FormattedValue) => {
    props.context.node.input(next)
  },
})
</script>

<template>
  <NDatePicker
    v-model:formatted-value="formattedValue"
    :type="pickerType"
    :value-format="valueFormat"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="bordered"
    @blur="context.handlers.blur"
  />
</template>
