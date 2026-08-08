<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NInputNumber } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

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
    :step="step"
    :input-props="{ id: context.id }"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
