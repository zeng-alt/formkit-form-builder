<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { DatePickerProps } from 'naive-ui'
import { NDatePicker } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// pickerType 是自定义配置键（旧 DSL 数据用 type，兜底兼容），
// 不用 type 是避免与 FormKit 的 input type 语义冲突（type 是 runtimeProp，不会进 attrs）
const { config, props, bind } = useSchemaAttrs(context, { omit: ['pickerType'] })
const { runEvent } = useBindEvents(context, bind)

// type 是 FormKit input 类型（runtimeProp，不进 attrs），据此派生 naive picker 类型
const pickerType = computed<DatePickerProps['type']>(() => {
  const configured = config.pickerType ?? config.type
  if (typeof configured === 'string' && configured.trim())
    return configured as DatePickerProps['type']
  const t = context.type
  if (t === 'naiveDateTime') return 'datetime'
  return 'date'
})

type FormattedValue = string | [string, string] | null

const formattedValue = computed<FormattedValue>({
  get: () => {
    const raw = context._value as unknown
    if (raw === null || raw === undefined || raw === '') return null
    if (Array.isArray(raw) && raw.length === 2)
      return [String(raw[0]), String(raw[1])] as [string, string]
    return String(raw)
  },
  set: (next: FormattedValue) => {
    context.node.input(next)
    runEvent('onInput', next)
    runEvent('onChange', next)
  },
})

const handleFocus = async (e: FocusEvent) => {
  await runEvent('onFocus', e)
}

const handleBlur = async (e: FocusEvent) => {
  await runEvent('onBlur', e)
  context.handlers.blur(e)
}
</script>

<template>
  <NDatePicker
    v-bind="props"
    v-model:formatted-value="formattedValue"
    :type="pickerType"
    :input-props="{ id: context.id }"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
