<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NP } from 'naive-ui'
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

const text = computed(() => String(props.context._value ?? ''))

const type = computed(() => naiveProps.value.type as any)
const depth = computed(() => {
  const raw = naiveProps.value.depth as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
})
const align = computed(() => naiveProps.value.align as any)
</script>

<template>
  <NP :type="type" :depth="depth as any" :align="align">
    {{ text }}
  </NP>
</template>
