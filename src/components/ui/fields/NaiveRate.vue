<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NRate } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))
const clearable = computed<boolean>(() =>
  Boolean((config.clearable as boolean | undefined) ?? true),
)
const count = computed<number>(() => {
  const raw = config.count as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return 5
})

const value = computed<number>(() => {
  const raw = context._value as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
})

function handleUpdateValue(next: number) {
  context.node.input(next)
}
</script>

<template>
  <NRate
    v-bind="props"
    :value="value"
    :count="count"
    :clearable="clearable"
    :disabled="disabled"
    @update:value="handleUpdateValue"
  />
</template>
