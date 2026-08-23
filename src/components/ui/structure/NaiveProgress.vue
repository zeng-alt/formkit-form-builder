<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NProgress } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// 纯配置驱动、无需值绑定；progressType 是自定义键（type 为 FormKit 内部保留键会被过滤），
// 映射到 NProgress 的 type；status/processing/showIndicator/height/strokeWidth/color/railColor
// 与 NProgress 同名 prop 且默认一致，经 props 透传。
// percentage 必须为数字，单独归一化后显式传入（超界截断到 [0, 100]）。
const { config, props } = useSchemaAttrs(context, { omit: ['progressType'] })

const progressType = computed<'line' | 'circle' | 'dashboard' | 'multiple-circle'>(() => {
  const raw = config.progressType
  return typeof raw === 'string' && raw ? (raw as 'line' | 'circle' | 'dashboard' | 'multiple-circle') : 'line'
})

const percentage = computed(() => {
  const raw = (props.value as Record<string, unknown> | undefined)?.percentage
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(num)) return 0
  return Math.min(100, Math.max(0, num))
})
</script>

<template>
  <NProgress v-bind="props" :type="progressType" :percentage="percentage" />
</template>