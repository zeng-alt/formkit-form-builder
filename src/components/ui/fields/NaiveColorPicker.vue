<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { ColorPickerProps } from 'naive-ui'
import { NColorPicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

const size = computed<ColorPickerProps['size']>(() => {
  const raw = config.size as string | undefined
  if (raw === 'tiny') return 'small'
  return (raw as ColorPickerProps['size']) ?? 'medium'
})
const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))

const value = computed(() => (context._value ?? '') as string)

function handleUpdateValue(next: string) {
  context.node.input(next)
}
</script>

<template>
  <div class="w-full">
    <NColorPicker
      v-bind="props"
      style="width: 100%"
      :value="value"
      :size="size"
      :disabled="disabled"
      @update:value="handleUpdateValue"
    />
  </div>
</template>
