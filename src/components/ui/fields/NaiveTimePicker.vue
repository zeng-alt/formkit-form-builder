<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NTimePicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { props } = useSchemaAttrs(context)

const formattedValue = computed<string | null>({
  get: () => {
    const raw = context._value as unknown
    if (raw === null || raw === undefined || raw === '') return null
    return String(raw)
  },
  set: (next) => {
    context.node.input(next)
  },
})
</script>

<template>
  <NTimePicker
    v-bind="props"
    v-model:formatted-value="formattedValue"
    :input-props="{ id: context.id }"
    @blur="context.handlers.blur"
  />
</template>
