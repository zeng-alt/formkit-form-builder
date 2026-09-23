<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { AlertProps } from 'naive-ui'
import { NAlert } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// title/content 是插槽内容、theme 映射到 NAlert 的 type，均不走 props；
// closable/bordered 与 NAlert 同名 prop 且默认一致，经 props 透传。
// showIcon 不在这条透传链路上：它命中 FormKit useInput.ts 的 pseudoProps 表
// （/^[a-zA-Z-]+(?:-icon|Icon)$/），会被 FormKit 拦截，根本不会流入 context.attrs，
// 因此也不会出现在 useSchemaAttrs 镜像出的 config/props 里——落进的是 context.showIcon，
// 必须单独显式读出来转发，否则"显示图标"开关关掉后图标依然会显示（NAlert 的 showIcon
// 默认就是 true，静默透传失败时表现为开关看似能拨但毫无效果）。
const { config, props } = useSchemaAttrs(context, { omit: ['title', 'content', 'theme'] })

const title = computed(() => {
  const raw = config.title
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})
const theme = computed(() => (config.theme as AlertProps['type']) ?? 'default')

const content = computed(() => {
  const raw = config.content
  if (typeof raw === 'string') return raw
  return String(context._value ?? '')
})

const showIcon = computed<boolean>(() => {
  const raw = (context as unknown as Record<string, unknown>).showIcon
  return typeof raw === 'boolean' ? raw : true
})
</script>

<template>
  <NAlert v-bind="props" :type="theme" :show-icon="showIcon">
    <template #header>
      <InlineEditableText :context="context" prop-key="title" :value="title" />
    </template>
    <InlineEditableText :context="context" prop-key="content" :value="content" />
  </NAlert>
</template>
