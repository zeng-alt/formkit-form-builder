<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { InputNumberProps } from 'naive-ui'
import { NInputNumber } from 'naive-ui'
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

const size = computed<InputNumberProps['size']>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as InputNumberProps['size']) ?? 'medium'
})
const clearable = computed<boolean>(() => (naiveProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const placeholder = computed(() => props.context.placeholder as string | undefined)
const min = computed(() => props.context.min as number | undefined)
const max = computed(() => props.context.max as number | undefined)
const step = computed(() => {
  const raw = props.context.step as string | number | undefined
  if (raw === undefined) return undefined
  if (typeof raw === 'number') return raw
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
})

const value = computed(() => {
  const raw = props.context._value as unknown
  if (raw === null || raw === undefined || raw === '') return null
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) ? parsed : null
})

function handleUpdateValue(next: number | null) {
  props.context.node.input(next)
}
</script>

<template>
  <NInputNumber
    :value="value"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :min="min"
    :max="max"
    :step="step"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="false"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
