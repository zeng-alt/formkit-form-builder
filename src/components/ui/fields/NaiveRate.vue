<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NRate } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// NRate 没有声明 disabled prop（只有 readonly），透传 disabled 只会落成 NRate 根
// 元素上一个无意义的 HTML 属性，评分依旧可以点——这里排除它，改由下面的 readonly
// 统一表达"不可操作"语义。
const { config, props, bind, disabled } = useSchemaAttrs(context, { omit: ['disabled'] })
const { runEvent } = useBindEvents(context, bind)

// 评分的"禁用"语义就是不可改值，取或映射到 NRate 唯一支持的 readonly：
// - disabled：useSchemaAttrs 统一算出的禁用态（节点自身配置 / FormKit 表单级联二合一）
// - config.readonly：用户本来就可以配置的只读
const readonly = computed<boolean>(() => disabled.value || Boolean(config.readonly))

const count = computed<number>(() => {
  const raw = config.count as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return 5
})

const value = computed<number>(() => {
  const raw = context._value as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
})

async function handleUpdateValue(next: number) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}
</script>

<template>
  <NRate
    v-bind="props"
    :value="value"
    :count="count"
    :readonly="readonly"
    @update:value="handleUpdateValue"
  />
</template>
