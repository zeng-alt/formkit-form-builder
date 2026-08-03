<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { InputNumberProps } from 'naive-ui'
import { NInputNumber } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

const size = computed<InputNumberProps['size']>(() => {
  const raw = config.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as InputNumberProps['size']) ?? 'medium'
})
const clearable = computed<boolean>(() => (config.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))

const step = computed(() => {
  const raw = config.step as string | number | undefined
  if (raw === undefined) return undefined
  if (typeof raw === 'number') return raw
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
})

const value = computed(() => {
  const raw = context._value as unknown
  if (raw === null || raw === undefined || raw === '') return null
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : null
})

function handleUpdateValue(next: number | null) {
  context.node.input(next)
}
</script>

<template>
  <NInputNumber
    v-bind="props"
    :value="value"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :step="step"
    :input-props="{ id: context.id }"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
