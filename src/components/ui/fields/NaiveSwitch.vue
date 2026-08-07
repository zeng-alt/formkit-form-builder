<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSwitch } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

type SwitchSize = 'small' | 'medium' | 'large'

const size = computed<SwitchSize>(() => {
  const raw = config.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})

const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))

const value = computed<boolean>(() => Boolean(context._value ?? false))

function handleUpdateValue(next: boolean) {
  context.node.input(next)
}
</script>

<template>
  <NSwitch
    v-bind="props"
    :value="value"
    :size="size"
    :disabled="disabled"
    @update:value="handleUpdateValue"
  />
</template>
