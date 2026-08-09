<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSlider } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

const min = computed(() => (config.min as number | undefined) ?? 0)

const value = computed(() => {
  const raw = context._value as unknown
  if (raw === null || raw === undefined || raw === '') return min.value
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : min.value
})

async function handleUpdateValue(next: number) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}
</script>

<template>
  <NSlider v-bind="props" :value="value" @update:value="handleUpdateValue" />
</template>
