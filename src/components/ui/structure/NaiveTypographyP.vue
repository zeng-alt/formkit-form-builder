<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NP } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// text/theme/depth 不走 props：text 是插槽内容，theme 映射到 NP 的 type，depth 需 string→number 转换；
// align 与 NP 同名 prop 且默认一致，经 props 透传
const { config, props } = useSchemaAttrs(context, { omit: ['text', 'theme', 'depth'] })

const text = computed(() => {
  const raw = config.text
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})

const theme = computed(() => config.theme as any)
const depth = computed(() => {
  const raw = config.depth as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
})
</script>

<template>
  <NP v-bind="props" :type="theme" :depth="depth as any">
    <span class="whitespace-pre-line">
      <InlineEditableText :context="context" prop-key="text" :value="text" />
    </span>
  </NP>
</template>
