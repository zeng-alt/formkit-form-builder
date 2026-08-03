<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NBlockquote } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config } = useSchemaAttrs(context)

const text = computed(() => {
  const raw = config.text
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})
</script>

<template>
  <NBlockquote>
    <InlineEditableText :context="context" prop-key="text" :value="text" />
  </NBlockquote>
</template>
