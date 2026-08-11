<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NQrCode } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// value（二维码内容）是 NQRCode 的必填 prop，但 useSchemaAttrs 会过滤内部键 value，
// 这里从 config / context 单独取值；其余（size/color/background/padding/level/bordered）经 props 透传
const { config, props } = useSchemaAttrs(context)

const value = computed(() => {
  const raw = config.value
  if (typeof raw === 'string' && raw.trim()) return raw
  return String(context._value ?? '')
})
</script>

<template>
  <NQrCode v-bind="props" :value="value" />
</template>
