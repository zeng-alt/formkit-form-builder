<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { DatePickerProps } from 'naive-ui'
import { NDatePicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

// type 是 FormKit input 类型（runtimeProp，不进 attrs），据此派生 naive picker 类型
const pickerType = computed<DatePickerProps['type']>(() => {
  const configured = config.type
  if (typeof configured === 'string' && configured.trim())
    return configured as DatePickerProps['type']
  const t = context.type
  if (t === 'naiveDateTime') return 'datetime'
  return 'date'
})

type FormattedValue = string | [string, string] | null

const formattedValue = computed<FormattedValue>({
  get: () => {
    const raw = context._value as unknown
    if (raw === null || raw === undefined || raw === '') return null
    if (Array.isArray(raw) && raw.length === 2)
      return [String(raw[0]), String(raw[1])] as [string, string]
    return String(raw)
  },
  set: (next: FormattedValue) => {
    context.node.input(next)
  },
})
</script>

<template>
  <NDatePicker
    v-bind="props"
    v-model:formatted-value="formattedValue"
    :type="pickerType"
    :input-props="{ id: context.id }"
    @blur="context.handlers.blur"
  />
</template>
