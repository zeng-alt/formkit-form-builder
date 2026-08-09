<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NTimePicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

const formattedValue = computed<string | null>({
  get: () => {
    const raw = context._value as unknown
    if (raw === null || raw === undefined || raw === '') return null
    return String(raw)
  },
  set: (next) => {
    context.node.input(next)
    runEvent('onInput', next)
    runEvent('onChange', next)
  },
})

const handleFocus = async (e: FocusEvent) => {
  await runEvent('onFocus', e)
}

const handleBlur = async (e: FocusEvent) => {
  await runEvent('onBlur', e)
  context.handlers.blur(e)
}
</script>

<template>
  <NTimePicker
    v-bind="props"
    v-model:formatted-value="formattedValue"
    :input-props="{ id: context.id }"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
