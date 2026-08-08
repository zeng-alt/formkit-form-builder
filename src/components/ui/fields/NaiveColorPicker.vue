<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NColorPicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { props } = useSchemaAttrs(context)

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
      @update:value="handleUpdateValue"
    />
  </div>
</template>
