<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NInputNumber } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

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

async function handleUpdateValue(next: number | null) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}

const handleFocus = async (e: FocusEvent) => {
  await runEvent('onFocus', e)
}

const handleBlur = async (e: FocusEvent) => {
  await runEvent('onBlur', e)
  context.handlers.blur(e)
}
</script>

<template>
  <NInputNumber
    v-bind="props"
    :value="value"
    :step="step"
    :input-props="{ id: context.id }"
    @update:value="handleUpdateValue"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
