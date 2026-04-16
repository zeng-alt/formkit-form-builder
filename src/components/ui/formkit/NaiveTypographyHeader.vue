<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NH1, NH2, NH3, NH4, NH5, NH6 } from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const naiveProps = computed<Record<string, unknown>>(() => {
  const ctx = props.context as unknown as { naiveProps?: Record<string, unknown> }
  const nodeProps = props.context.node.props as Record<string, unknown>
  return (ctx.naiveProps ?? (nodeProps.naiveProps as Record<string, unknown> | undefined) ?? {}) as Record<
    string,
    unknown
  >
})

const text = computed(() => {
  const raw = naiveProps.value.text
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
  <component :is="HeaderCmp">{{ text }}</component>
</template>
