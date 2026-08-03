<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NBackTop } from 'naive-ui'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

// 纯配置驱动、无需值绑定；context 仅作为配置来源传入 useSchemaAttrs。
// show/right/bottom/visibilityHeight 与 NBackTop 同名 prop 且默认一致，经 props 透传
const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { props } = useSchemaAttrs(context)
</script>

<template>
  <NBackTop v-bind="props" />
</template>
