<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NP } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const text = computed(() => {
  const raw = uiProps.value.text
  if (typeof raw === 'string') return raw
  return String(props.context._value ?? '')
})

const theme = computed(() => uiProps.value.theme as any)
const depth = computed(() => {
  const raw = uiProps.value.depth as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
})
const align = computed(() => uiProps.value.align as any)
</script>

<template>
  <NP :type="theme" :depth="depth as any" :align="align">
    <InlineEditableText :context="props.context" prop-key="text" :value="text" />
  </NP>
</template>
