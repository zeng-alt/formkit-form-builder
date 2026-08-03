<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NAvatar } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

// 纯配置驱动、无需值绑定；context 仅作为配置来源传入 useSchemaAttrs
const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// avatarSize 是本库配置键（映射到 NAvatar 的 size）；fallbackText 是插槽内容
const { config, props } = useSchemaAttrs(context, { omit: ['avatarSize', 'fallbackText'] })

const round = computed<boolean>(() => Boolean((config.round as boolean | undefined) ?? true))
const fallbackText = computed(() => (config.fallbackText as string | undefined) ?? '')

const size = computed(() => {
  const raw = config.avatarSize as unknown
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
    <NAvatar v-bind="props" :round="round" :size="size">
      {{ fallbackText }}
    </NAvatar>
  </div>
</template>
