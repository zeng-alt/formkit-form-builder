<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSlider } from 'naive-ui'
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

const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const min = computed(() => (props.context.min as number | undefined) ?? 0)
const max = computed(() => (props.context.max as number | undefined) ?? 100)
const step = computed(() => {
  const raw = props.context.step as string | number | undefined
  if (raw === undefined) return 1
  if (typeof raw === 'number') return raw
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 1
})

const value = computed(() => {
  const raw = props.context._value?.value as unknown
  if (raw === null || raw === undefined || raw === '') return min.value
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : min.value
})

function handleUpdateValue(next: number) {
  props.context.node.input(next)
}
</script>

<template>
  <NSlider
    :value="value"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    @update:value="handleUpdateValue"
  />
</template>
