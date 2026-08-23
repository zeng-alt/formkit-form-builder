<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NA } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// text 是插槽内容、href 有兜底默认，均不走 props；target 与 NA 同名 prop，经 props 透传
const { config, props } = useSchemaAttrs(context, { omit: ['text', 'href'] })

const text = computed(() => {
  const raw = config.text
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})

const href = computed(() => (config.href as string | undefined) ?? '#')
</script>

<template>
  <NA v-bind="props" :href="href">
    <span class="whitespace-pre-line">
      <InlineEditableText :context="context" prop-key="text" :value="text" />
    </span>
  </NA>
</template>
