<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NDivider } from 'naive-ui'
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

const titlePlacement = computed(() => naiveProps.value.titlePlacement as any)
const dashed = computed<boolean>(() => Boolean((naiveProps.value.dashed as boolean | undefined) ?? false))
const vertical = computed<boolean>(() => Boolean((naiveProps.value.vertical as boolean | undefined) ?? false))

const title = computed(() => {
  const raw = naiveProps.value.title
  if (typeof raw === 'string') return raw
  return String(props.context._value ?? '')
})
</script>

<template>
  <NDivider :title-placement="titlePlacement" :dashed="dashed" :vertical="vertical">
    {{ title }}
  </NDivider>
</template>
