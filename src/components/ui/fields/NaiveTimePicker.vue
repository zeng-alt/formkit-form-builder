<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { TimePickerProps } from 'naive-ui'
import { NTimePicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

const size = computed<TimePickerProps['size']>(() => {
  const raw = config.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as TimePickerProps['size']) ?? 'medium'
})
const clearable = computed<boolean>(() => (config.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))

const formattedValue = computed<string | null>({
  get: () => {
    const raw = context._value as unknown
    if (raw === null || raw === undefined || raw === '') return null
    return String(raw)
  },
  set: (next) => {
    context.node.input(next)
  },
})
</script>

<template>
  <NTimePicker
    v-bind="props"
    v-model:formatted-value="formattedValue"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :input-props="{ id: context.id }"
    @blur="context.handlers.blur"
  />
</template>
