<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { AlertProps } from 'naive-ui'
import { NAlert } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// title/content 是插槽内容、theme 映射到 NAlert 的 type，均不走 props；
// closable/bordered/showIcon 与 NAlert 同名 prop 且默认一致，经 props 透传
const { config, props } = useSchemaAttrs(context, { omit: ['title', 'content', 'theme'] })

const title = computed(() => {
  const raw = config.title
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})
const theme = computed(() => (config.theme as AlertProps['type']) ?? 'default')

const content = computed(() => {
  const raw = config.content
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})
</script>

<template>
  <NAlert v-bind="props" :type="theme">
    <template #header>
      <InlineEditableText :context="context" prop-key="title" :value="title" />
    </template>
    <InlineEditableText :context="context" prop-key="content" :value="content" />
  </NAlert>
</template>
