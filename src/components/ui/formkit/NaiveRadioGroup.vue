<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NRadio, NRadioGroup } from 'naive-ui'
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

type GroupSize = 'small' | 'medium' | 'large'

const size = computed<GroupSize>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)

const options = computed(() => {
  const raw = props.context.options as unknown
  if (!Array.isArray(raw)) return []
  return raw
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { label: String(opt), value: opt }
      }
      if (opt && typeof opt === 'object') {
        const value = (opt as Record<string, unknown>).value
        const label = (opt as Record<string, unknown>).label
        if (value !== undefined) return { label: String(label ?? value), value }
      }
      return null
    })
    .filter((v): v is { label: string; value: string | number } => v !== null)
})

const value = computed(() => props.context._value?.value as string | number | null | undefined)

function handleUpdateValue(next: string | number) {
  props.context.node.input(next)
}
</script>

<template>
  <NRadioGroup :value="value" :disabled="disabled" :size="size" @update:value="handleUpdateValue">
    <div class="flex flex-col gap-2 w-full py-1">
      <NRadio v-for="opt in options" :key="String(opt.value)" :value="opt.value">
        {{ opt.label }}
      </NRadio>
    </div>
  </NRadioGroup>
</template>
