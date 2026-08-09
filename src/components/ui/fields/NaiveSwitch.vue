<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSwitch } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

const value = computed<boolean>(() => Boolean(context._value ?? false))

async function handleUpdateValue(next: boolean) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}
</script>

<template>
  <NSwitch v-bind="props" :value="value" @update:value="handleUpdateValue" />
</template>
