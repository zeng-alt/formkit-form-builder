<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NA } from 'naive-ui'
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

const text = computed(() => String(props.context._value ?? ''))
const href = computed(() => (naiveProps.value.href as string | undefined) ?? '#')
const target = computed(() => naiveProps.value.target as any)
</script>

<template>
  <NA :href="href" :target="target">
    {{ text }}
  </NA>
</template>
