<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NRate } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

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

async function handleUpdateValue(next: number) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}
</script>

<template>
  <NRate v-bind="props" :value="value" :count="count" @update:value="handleUpdateValue" />
</template>
