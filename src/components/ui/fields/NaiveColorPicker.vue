<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { ColorPickerProps } from 'naive-ui'
import { NColorPicker } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const size = computed<ColorPickerProps['size']>(() => {
  const raw = uiProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as ColorPickerProps['size']) ?? 'medium'
})
const disabled = computed<boolean>(() =>
  Boolean((uiProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const value = computed(() => (props.context._value ?? '') as string)

function handleUpdateValue(next: string) {
  props.context.node.input(next)
}
</script>

<template>
  <div class="w-full">
    <NColorPicker
      style="width: 100%"
      :value="value"
      :size="size"
      :disabled="disabled"
      @update:value="handleUpdateValue"
    />
  </div>
</template>
