<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NImage } from 'naive-ui'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

// 纯配置驱动、无需值绑定；context 仅作为配置来源传入 useSchemaAttrs
const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// src/alt/width/height/objectFit/previewDisabled/lazy 均与 NImage 同名 prop 且默认一致，经 props 透传
const { props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

async function handleClick(e: MouseEvent) {
  await runEvent('onClick', e)
  context?.handlers?.click?.(e)
}
</script>

<template>
  <div class="w-full py-2" @click="handleClick">
    <NImage v-bind="props" />
  </div>
</template>
