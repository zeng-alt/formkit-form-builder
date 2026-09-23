<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NP, NText } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// text/theme/depth/align 不走 props：text 是插槽内容，depth 需 string→number 转换；其余经 props 透传到 NP。
// align 不能透传：NP 没有 align prop，透传会落成 <p align="...">，而 HTML 的 align 属性
// 只认 left / right / center / justify，编辑面板给出的 start / end 会被浏览器忽略。
// 改用 CSS text-align，它原生支持 start / center / end。
// NP 只有 depth 一个自有 prop、没有 type，无法表达主题色——主题与深度交给内层 NText
// 承载（与 NaiveTypographyText 同一套取值），NP 只负责段落的块级语义与间距
const { config, props } = useSchemaAttrs(context, { omit: ['text', 'theme', 'depth', 'align'] })

const text = computed(() => {
  const raw = config.text
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})

// 同 NaiveTypographyText.vue：config 是用户动态配置值（Record<string, unknown>），
// naive-ui NText 的 type/depth 是更窄的字面量联合。曾尝试标注为 TextProps['type'] /
// PProps['depth']，但 Vue 的类型解析器无法解析 naive-ui 经 ExtractPublicPropTypes
// 包装的类型，会静默退化成不做运行时校验的 `type: null`，故保留断言
const theme = computed(() => config.theme as any)
const textAlign = computed(() => {
  const raw = config.align
  return raw === 'start' || raw === 'center' || raw === 'end' ? raw : undefined
})
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
  <NP v-bind="props" :style="textAlign ? { textAlign } : undefined">
    <NText :type="theme" :depth="depth as any">
      <span class="whitespace-pre-line">
        <InlineEditableText :context="context" prop-key="text" :value="text" />
      </span>
    </NText>
  </NP>
</template>
