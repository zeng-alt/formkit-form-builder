<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NRate } from 'naive-ui'
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
const readonly = computed<boolean>(() => Boolean((naiveProps.value.readonly as boolean | undefined) ?? false))
const clearable = computed<boolean>(() => Boolean((naiveProps.value.clearable as boolean | undefined) ?? true))
const allowHalf = computed<boolean>(() => Boolean((naiveProps.value.allowHalf as boolean | undefined) ?? false))
const count = computed<number>(() => {
  const raw = naiveProps.value.count as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return 5
})

const value = computed<number>(() => {
  const raw = props.context._value as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
})

function handleUpdateValue(next: number) {
  props.context.node.input(next)
}
</script>

<template>
  <NRate
    :value="value"
    :count="count"
    :allow-half="allowHalf"
    :clearable="clearable"
    :readonly="readonly"
    :disabled="disabled"
    @update:value="handleUpdateValue"
  />
</template>
