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
const { config, props, bind } = useSchemaAttrs(context, { omit: ['disabled'] })
const { runEvent } = useBindEvents(context, bind)

// 评分的"禁用"语义就是不可改值，取或映射到 NRate 唯一支持的 readonly：
// - config.disabled：节点自身配置的 disabled（编辑面板开关写入，正常经 FormKit
//   保留属性名落进 context.disabled，这里仍防御性读一次——例如用户经"自定义属性"
//   面板手填 disabled 这种绕开保留属性拦截的路径）
// - context.disabled：FormKit 级联禁用态（FormRenderer 的表单级 :disabled 经
//   FormKit 节点树级联到每个字段，未被节点自身显式覆盖时会落到这里）
// - config.readonly：用户本来就可以配置的只读
const readonly = computed<boolean>(
  () => Boolean(config.disabled) || Boolean(context.disabled) || Boolean(config.readonly),
)

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
