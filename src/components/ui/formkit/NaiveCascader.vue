<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NCascader } from 'naive-ui'
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

type CascaderSize = 'small' | 'medium' | 'large'

const size = computed<CascaderSize>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})
const clearable = computed<boolean>(() => (naiveProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)
const bordered = computed<boolean>(() => (naiveProps.value.bordered as boolean | undefined) ?? true)
const filterable = computed<boolean>(() => (naiveProps.value.filterable as boolean | undefined) ?? false)
const multiple = computed<boolean>(() => (naiveProps.value.multiple as boolean | undefined) ?? false)
const placeholder = computed(() => props.context.placeholder as string | undefined)

const options = computed(() => {
  const raw = props.context.options as unknown
  if (!Array.isArray(raw)) return []
  return raw
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { label: String(opt), value: opt }
      }
      if (opt && typeof opt === 'object') return opt
      return null
    })
    .filter((v): v is Record<string, unknown> => v !== null)
})

const value = computed<any>(() => {
  const raw = props.context._value as unknown
  if (raw === undefined || raw === null || raw === '') return multiple.value ? [] : null
  return raw
})

function handleUpdateValue(next: unknown) {
  props.context.node.input(next)
}
</script>

<template>
  <NCascader
    :value="value"
    :options="options"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :filterable="filterable"
    :multiple="multiple"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="bordered"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
