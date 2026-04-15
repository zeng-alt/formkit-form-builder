<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSwitch } from 'naive-ui'
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

type SwitchSize = 'small' | 'medium' | 'large'

const size = computed<SwitchSize>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})

const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const value = computed<boolean>(() => Boolean(props.context._value ?? false))

function handleUpdateValue(next: boolean) {
  props.context.node.input(next)
}
</script>

<template>
  <NSwitch :value="value" :size="size" :disabled="disabled" @update:value="handleUpdateValue" />
</template>
