<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { ColorPickerProps } from 'naive-ui'
import { NColorPicker } from 'naive-ui'
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

const size = computed<ColorPickerProps['size']>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as ColorPickerProps['size']) ?? 'medium'
})
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const value = computed(() => (props.context._value ?? '') as string)

function handleUpdateValue(next: string) {
  props.context.node.input(next)
}
</script>

<template>
  <div class="w-full">
    <NColorPicker
      style="width: 100%;"
      :value="value"
      :size="size"
      :disabled="disabled"
      @update:value="handleUpdateValue"
    />
  </div>
</template>
