<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { TimePickerProps } from 'naive-ui'
import { NTimePicker } from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const naiveProps = computed<Record<string, unknown>>(() => {
  const ctx = props.context as unknown as { naiveProps?: Record<string, unknown> }
  const nodeProps = props.context.node.props as Record<string, unknown>
  return (ctx.naiveProps ?? (nodeProps.naiveProps as Record<string, unknown> | undefined) ?? {}) as Record<
    string,
    unknown
  >
})

const size = computed<TimePickerProps['size']>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as TimePickerProps['size']) ?? 'medium'
})
const clearable = computed<boolean>(() => (naiveProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const placeholder = computed(() => props.context.placeholder as string | undefined)

const formattedValue = computed<string | null>({
  get: () => {
    const raw = props.context._value as unknown
    if (raw === null || raw === undefined || raw === '') return null
    return String(raw)
  },
  set: (next) => {
    props.context.node.input(next)
  },
})
</script>

<template>
  <NTimePicker
    v-model:formatted-value="formattedValue"
    value-format="HH:mm"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="false"
    @blur="context.handlers.blur"
  />
</template>
