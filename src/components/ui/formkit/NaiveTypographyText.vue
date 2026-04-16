<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NText } from 'naive-ui'
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

const text = computed(() => {
  const raw = naiveProps.value.text
  if (typeof raw === 'string') return raw
  return String(props.context._value ?? '')
})

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
const tag = computed(() => naiveProps.value.tag as any)
const strong = computed(() => Boolean((naiveProps.value.strong as boolean | undefined) ?? false))
const italic = computed(() => Boolean((naiveProps.value.italic as boolean | undefined) ?? false))
const underline = computed(() => Boolean((naiveProps.value.underline as boolean | undefined) ?? false))
const del = computed(() => Boolean((naiveProps.value.delete as boolean | undefined) ?? false))
const code = computed(() => Boolean((naiveProps.value.code as boolean | undefined) ?? false))
</script>

<template>
  <NText
    :type="type"
    :depth="depth as any"
    :tag="tag"
    :strong="strong"
    :italic="italic"
    :underline="underline"
    :delete="del"
    :code="code"
  >
    {{ text }}
  </NText>
</template>
