<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NDivider } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const titlePlacement = computed(() => uiProps.value.titlePlacement as any)
const dashed = computed<boolean>(() =>
  Boolean((uiProps.value.dashed as boolean | undefined) ?? false),
)
const vertical = computed<boolean>(() =>
  Boolean((uiProps.value.vertical as boolean | undefined) ?? false),
)

const title = computed(() => {
  const raw = uiProps.value.title
  if (typeof raw === 'string') return raw
  return String(props.context._value ?? '')
})
</script>

<template>
  <NDivider :title-placement="titlePlacement" :dashed="dashed" :vertical="vertical">
    <InlineEditableText :context="props.context" prop-key="title" :value="title" />
  </NDivider>
</template>
