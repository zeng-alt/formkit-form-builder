<script setup lang="ts">
import { computed, h } from 'vue'
import type { FormKitFrameworkContext } from '@formkit/core'
import { NAvatar } from 'naive-ui'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'
import { omit } from 'naive-ui/es/_utils'

// 纯配置驱动、无需值绑定；context 仅作为配置来源传入 useSchemaAttrs
const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// avatarSize 是本库配置键（映射到 NAvatar 的 size）；fallbackText 是插槽内容
const { config, props, bind } = useSchemaAttrs(context, omit(['fallbackText']))
const { runEvent } = useBindEvents(context, bind)
const fallbackText = computed(() => (config.fallbackText as string | undefined) ?? '')

const renderFallback = () =>
  h(
    'span',
    {
      class: 'flex items-center justify-center w-full h-full',
    },
    fallbackText.value || '?',
  )

async function handleClick(e: MouseEvent) {
  await runEvent('onClick', e)
  context?.handlers?.click?.(e)
}
</script>

<template>
  <div class="w-full py-2 flex items-center" @click="handleClick">
    <NAvatar
      v-bind="props"
      :render-fallback="renderFallback"
      :render-placeholder="renderFallback"
    />
  </div>
</template>
