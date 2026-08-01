<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { AlertProps } from 'naive-ui'
import { NAlert } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const title = computed(() => uiProps.value.title as AlertProps['title'])
const type = computed(() => (uiProps.value.type as AlertProps['type']) ?? 'default')
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
    :title="title"
    :type="type"
    :closable="closable"
    :bordered="bordered"
    :show-icon="showIcon"
  >
    {{ content }}
  </NAlert>
</template>
