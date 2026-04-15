<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NMention } from 'naive-ui'
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

type MentionSize = 'small' | 'medium' | 'large'

const size = computed<MentionSize>(() => {
  const raw = naiveProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})
const disabled = computed<boolean>(() =>
  Boolean((naiveProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)
const placeholder = computed(() => props.context.placeholder as string | undefined)

const options = computed(() => {
  const raw = props.context.options as unknown
  if (!Array.isArray(raw)) return []
  return raw
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        const s = String(opt)
        return { label: s, value: s }
      }
      if (opt && typeof opt === 'object') {
        const value = (opt as Record<string, unknown>).value
        const label = (opt as Record<string, unknown>).label
        if (typeof value === 'string' || typeof value === 'number') {
          return { label: String(label ?? value), value: String(value) }
        }
      }
      return null
    })
    .filter((v): v is { label: string; value: string } => v !== null)
})

const value = computed(() => (props.context._value ?? '') as string)

function handleUpdateValue(next: string) {
  props.context.node.input(next)
}
</script>

<template>
  <NMention
    :value="value"
    :options="options"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="size"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
