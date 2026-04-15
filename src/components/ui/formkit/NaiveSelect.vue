<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { SelectOption, SelectProps } from 'naive-ui'
import { NSelect } from 'naive-ui'
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

const size = computed<SelectProps['size']>(() => (naiveProps.value.size as SelectProps['size']) ?? 'medium')
const clearable = computed<boolean>(() => (naiveProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)
const filterable = computed<boolean>(() => (naiveProps.value.filterable as boolean | undefined) ?? false)
const multiple = computed<boolean>(() => (naiveProps.value.multiple as boolean | undefined) ?? false)

const placeholder = computed(() => props.context.placeholder as string | undefined)

type Primitive = string | number
type SelectValue = Primitive | Primitive[] | null

const options = computed<SelectOption[]>(() => {
  const raw = props.context.options as unknown
  if (!Array.isArray(raw)) return []
  return raw.reduce<SelectOption[]>((acc, opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      acc.push({ label: String(opt), value: opt })
      return acc
    }
    if (opt && typeof opt === 'object') {
      const value = (opt as Record<string, unknown>).value
      const label = (opt as Record<string, unknown>).label
      if (typeof value === 'string' || typeof value === 'number') {
        acc.push({ label: String(label ?? value), value })
      }
    }
    return acc
  }, [])
})

const value = computed<SelectValue>(() => {
  const raw = props.context._value?.value as unknown
  if (multiple.value) {
    if (Array.isArray(raw)) return raw.filter((v): v is Primitive => typeof v === 'string' || typeof v === 'number')
    if (typeof raw === 'string' || typeof raw === 'number') return [raw]
    return []
  }
  if (typeof raw === 'string' || typeof raw === 'number') return raw
  if (Array.isArray(raw)) {
    const first = raw.find((v) => typeof v === 'string' || typeof v === 'number')
    return (first as Primitive | undefined) ?? null
  }
  return null
})

function handleUpdateValue(next: SelectValue) {
  props.context.node.input(next)
}
</script>

<template>
  <NSelect
    :value="value"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :filterable="filterable"
    :multiple="multiple"
    :placeholder="placeholder"
    :options="options"
    :input-props="{ id: context.id }"
    :bordered="false"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
