<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NCheckbox } from 'naive-ui'
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

type CheckboxSize = 'small' | 'medium' | 'large'

const size = computed<CheckboxSize>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})

const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const checked = computed<boolean>(() => Boolean(props.context._value ?? false))

function handleUpdateChecked(next: boolean) {
  props.context.node.input(next)
}
</script>

<template>
  <div class="w-full py-1">
    <NCheckbox :checked="checked" :disabled="disabled" :size="size" @update:checked="handleUpdateChecked" />
  </div>
</template>
