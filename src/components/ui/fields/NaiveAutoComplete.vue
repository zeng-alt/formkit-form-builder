<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NAutoComplete } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

const options = computed(() => {
  const raw = (config.options ?? context.options) as unknown
  if (!Array.isArray(raw)) return []
  return raw
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        const s = String(opt)
        return { label: s, value: s }
      }
      if (opt && typeof opt === 'object') {
        const value = (opt as Record<string, unknown>).value
        const label = (opt as Record<string, unknown>).label
        if (typeof value === 'string' || typeof value === 'number') {
          return { label: String(label ?? value), value: String(value) }
        }
      }
      return null
    })
    .filter((v): v is { label: string; value: string } => v !== null)
})

const value = computed(() => (context._value ?? '') as string)

async function handleUpdateValue(next: string | null) {
  context.node.input(next ?? '')
  await runEvent('onInput', next ?? '')
  await runEvent('onChange', next ?? '')
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
  <NAutoComplete
    v-bind="props"
    :value="value"
    :options="options"
    @update:value="handleUpdateValue"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
