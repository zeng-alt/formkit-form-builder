<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { InputProps } from 'naive-ui'
import { NInput } from 'naive-ui'
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

const size = computed<InputProps['size']>(() => (naiveProps.value.size as InputProps['size']) ?? 'medium')
const clearable = computed<boolean>(() => (naiveProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const value = computed(() => (props.context._value ?? '') as string)
const placeholder = computed(() => props.context.placeholder as string | undefined)

function handleUpdateValue(next: string) {
  props.context.node.input(next)
}
</script>

<template>
  <NInput
    :value="value"
    type="textarea"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="false"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
