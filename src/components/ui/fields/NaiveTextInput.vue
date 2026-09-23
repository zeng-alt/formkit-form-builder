<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NInput } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// 配置经 context.attrs 响应式流入（属性面板修改即触发重渲染）；prefix/suffix 是插槽内容键
// disabled 由 useSchemaAttrs 统一算出（见该文件顶部注释）：它是 FormKit 保留属性名，
// 会被拦截进 context.disabled，永远不会流入 context.attrs / props 这个透传包——因此
// 必须单独转发给 NInput，否则编辑面板的"禁用"开关、以及 FormRenderer 的整表单禁用
// 都对输入框没有任何效果（与 CustomButton.vue 的 disabled 处理同一模式）。
const { config, props, bind, disabled } = useSchemaAttrs(context, { omit: ['prefix', 'suffix'] })
const { runEvent } = useBindEvents(context, bind)

const inputType = computed(() => {
  const type = context.type
  if (type === 'password') return 'password'
  return 'text'
})

const prefix = computed(() => String((config.prefix as string | undefined) ?? '').trim())
const suffix = computed(() => String((config.suffix as string | undefined) ?? '').trim())

const isIcon = (value: string) => value.startsWith('i-')

const pair = computed<boolean>(() => Boolean((config.pair as boolean | undefined) ?? false))
const separator = computed<string>(() => (config.separator as string | undefined) ?? '-')

const value = computed(() => {
  const raw = context._value as unknown
  if (!pair.value) return (raw ?? '') as string
  if (Array.isArray(raw)) {
    const a = raw[0] ?? ''
    const b = raw[1] ?? ''
    return [String(a), String(b)] as [string, string]
  }
  if (typeof raw === 'string') {
    const parts = raw.split(separator.value)
    return [parts[0] ?? '', parts[1] ?? ''] as [string, string]
  }
  return ['', ''] as [string, string]
})
async function handleUpdateValue(next: string | [string, string]) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}

const handleFocus = async (e: FocusEvent) => {
  await runEvent('onFocus', e)
}

const handleBlur = async (e: FocusEvent) => {
  await runEvent('onBlur', e)
  context.handlers.blur(e)
}
</script>

<template>
  <NInput
    v-bind="props"
    :value="value"
    :type="inputType"
    :input-props="{ id: context.id }"
    :pair="pair"
    :separator="separator"
    :disabled="disabled"
    @update:value="handleUpdateValue"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <template v-if="prefix" #prefix>
      <span v-if="isIcon(prefix)" :class="[prefix, 'h-4 w-4']"></span>
      <span v-else class="text-xs text-muted-foreground">{{ prefix }}</span>
    </template>
    <template v-if="suffix" #suffix>
      <span v-if="isIcon(suffix)" :class="[suffix, 'h-4 w-4']"></span>
      <span v-else class="text-xs text-muted-foreground">{{ suffix }}</span>
    </template>
  </NInput>
</template>
