<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { InputProps } from 'naive-ui'
import { NInput } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const size = computed<InputProps['size']>(() => (uiProps.value.size as InputProps['size']) ?? 'medium')
const clearable = computed<boolean>(() => (uiProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((uiProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)
const bordered = computed<boolean>(() => (uiProps.value.bordered as boolean | undefined) ?? true)
const pair = computed<boolean>(() => Boolean((uiProps.value.pair as boolean | undefined) ?? false))
const separator = computed<string>(() => (uiProps.value.separator as string | undefined) ?? '-')

const inputType = computed(() => {
  const type = props.context.type
  if (type === 'password') return 'password'
  return 'text'
})

const value = computed(() => {
  const raw = props.context._value as unknown
  if (!pair.value) return (raw ?? '') as string
  if (Array.isArray(raw)) {
    const a = raw[0] ?? ''
    const b = raw[1] ?? ''
    return [String(a), String(b)] as [string, string]
  }
  if (typeof raw === 'string') {
    const parts = raw.split(separator.value)
    return [parts[0] ?? '', parts[1] ?? ''] as [string, string]
  }
  return ['', ''] as [string, string]
})
const placeholder = computed(() => props.context.placeholder as string | undefined)

async function handleUpdateValue(next: string | [string, string]) {
  props.context.node.input(next)
}

const handleFocus = async (e: FocusEvent) => {
  props.context.handlers.focus?.(e as any)
}

const handleBlur = async (e: FocusEvent) => {
  props.context.handlers.blur(e)
}
</script>

<template>
  <NInput
    :value="value"
    :type="inputType"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="bordered"
    :pair="pair"
    :separator="separator"
    @update:value="handleUpdateValue"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
