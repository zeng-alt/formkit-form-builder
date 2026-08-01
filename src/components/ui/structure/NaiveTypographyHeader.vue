<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NH1, NH2, NH3, NH4, NH5, NH6 } from 'naive-ui'
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

const HeaderCmp = computed(() => {
  const type = props.context.type
  if (type === 'naiveH1') return NH1
  if (type === 'naiveH2') return NH2
  if (type === 'naiveH3') return NH3
  if (type === 'naiveH4') return NH4
  if (type === 'naiveH5') return NH5
  return NH6
})
</script>

<template>
  <component :is="HeaderCmp">
    <InlineEditableText :context="props.context" prop-key="text" :value="text" />
  </component>
</template>
