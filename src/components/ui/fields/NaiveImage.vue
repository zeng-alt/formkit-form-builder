<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NImage } from 'naive-ui'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

// 纯配置驱动、无需值绑定；context 仅作为配置来源传入 useSchemaAttrs
const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// src/alt/width/height/objectFit/previewDisabled/lazy 均与 NImage 同名 prop 且默认一致，经 props 透传
const { props } = useSchemaAttrs(context)
</script>

<template>
  <div class="w-full py-2">
    <NImage v-bind="props" />
  </div>
</template>
