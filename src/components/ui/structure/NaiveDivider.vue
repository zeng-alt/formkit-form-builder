<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NDivider } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// title 是插槽内容不走 props；titlePlacement/dashed/vertical 与 NDivider 同名 prop 且默认一致，经 props 透传
const { config, props } = useSchemaAttrs(context, { omit: ['title'] })

const title = computed(() => {
  const raw = config.title
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})
</script>

<template>
  <NDivider v-bind="props">
    <InlineEditableText :context="context" prop-key="title" :value="title" />
  </NDivider>
</template>
