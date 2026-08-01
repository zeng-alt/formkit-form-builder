<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { AlertProps } from 'naive-ui'
import { NAlert } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const title = computed(() => {
  const raw = uiProps.value.title
  if (typeof raw === 'string') return raw
  return String(props.context._value ?? '')
})
const theme = computed(() => (uiProps.value.theme as AlertProps['type']) ?? 'default')
const closable = computed<boolean>(() =>
  Boolean((uiProps.value.closable as boolean | undefined) ?? false),
)
const bordered = computed<boolean>(() =>
  Boolean((uiProps.value.bordered as boolean | undefined) ?? false),
)
const showIcon = computed<boolean>(() =>
  Boolean((uiProps.value.showIcon as boolean | undefined) ?? true),
)

const content = computed(() => {
  const raw = uiProps.value.content
  if (typeof raw === 'string') return raw
  return String(props.context._value ?? '')
})
</script>

<template>
  <NAlert
    :type="theme"
    :closable="closable"
    :bordered="bordered"
    :show-icon="showIcon"
  >
    <template #header>
      <InlineEditableText :context="props.context" prop-key="title" :value="title" />
    </template>
    <InlineEditableText :context="props.context" prop-key="content" :value="content" />
  </NAlert>
</template>
