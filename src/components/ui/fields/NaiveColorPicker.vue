<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NColorPicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

const value = computed(() => (context._value ?? '') as string)

async function handleUpdateValue(next: string) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
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
