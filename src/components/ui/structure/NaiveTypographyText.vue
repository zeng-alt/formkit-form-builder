<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NText } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// text/theme/depth 不走 props：text 是插槽内容，theme 映射到 NText 的 type，depth 需 string→number 转换；
// 其余 tag/strong/italic/underline/delete/code 与 NText 同名 prop 且默认一致，经 props 透传
const { config, props } = useSchemaAttrs(context, { omit: ['text', 'theme', 'depth'] })

const text = computed(() => {
  const raw = config.text
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})

// config 是 context.attrs 的响应式镜像（Record<string, unknown>，见 use-schema-attrs.ts），
// theme/depth 是用户在属性面板配置的动态值，运行时才知道具体取值；naive-ui NText 的
// type/depth 是更窄的字面量联合，两边类型来源不同。曾尝试标注为 TextProps['type'] /
// TextProps['depth']，但 Vue 的类型解析器无法解析 naive-ui 经 ExtractPublicPropTypes
// 包装的类型，会静默退化成不做运行时校验的 `type: null`，故保留断言
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
  <NText v-bind="props" :type="theme" :depth="depth as any">
    <span class="whitespace-pre-line">
      <InlineEditableText :context="context" prop-key="text" :value="text" />
    </span>
  </NText>
</template>
