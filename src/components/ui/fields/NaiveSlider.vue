<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSlider } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

const min = computed(() => (config.min as number | undefined) ?? 0)

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
  <NSlider v-bind="props" :value="value" @update:value="handleUpdateValue" />
</template>
