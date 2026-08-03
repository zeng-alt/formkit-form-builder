<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSlider } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))

const min = computed(() => (config.min as number | undefined) ?? 0)
const max = computed(() => (config.max as number | undefined) ?? 100)
const step = computed(() => {
  const raw = config.step as string | number | undefined
  if (raw === undefined) return 1
  if (typeof raw === 'number') return raw
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 1
})

const value = computed(() => {
  const raw = context._value as unknown
  if (raw === null || raw === undefined || raw === '') return min.value
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : min.value
})

function handleUpdateValue(next: number) {
  context.node.input(next)
}
</script>

<template>
  <NSlider
    v-bind="props"
    :value="value"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    @update:value="handleUpdateValue"
  />
</template>
