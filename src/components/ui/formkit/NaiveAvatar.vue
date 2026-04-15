<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NAvatar } from 'naive-ui'
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

const src = computed(() => naiveProps.value.src as string | undefined)
const round = computed<boolean>(() => Boolean((naiveProps.value.round as boolean | undefined) ?? true))
const bordered = computed<boolean>(() => Boolean((naiveProps.value.bordered as boolean | undefined) ?? false))
const fallbackText = computed(() => (naiveProps.value.fallbackText as string | undefined) ?? '')

const size = computed(() => {
  const raw = naiveProps.value.avatarSize as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return 48
})
</script>

<template>
  <div class="w-full py-2 flex items-center">
    <NAvatar :src="src" :round="round" :size="size" :bordered="bordered">
      {{ fallbackText }}
    </NAvatar>
  </div>
</template>
