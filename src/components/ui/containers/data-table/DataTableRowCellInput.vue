<script setup lang="ts">
import { computed } from 'vue'
import { FormKit } from '@formkit/vue'
import { NInput } from 'naive-ui'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode } from '@/types/dsl'
import type { DataTableColumn } from './types'

// 预览「新增数据行」弹窗：按列来源元素（DSL FieldNode）渲染原字段控件。
// 用 FormKit :type 直接复用元素注册的输入组件（options / valueFormat 等配置随 props 透传），
// :ignore 隔离在预览主表单上下文之外，值经 update:modelValue 回写 draftRow。
// disabled：表达式驱动（expr）的列值由行数据派生，禁止手输。
const props = defineProps<{
  column: DataTableColumn
  value: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [value: unknown]
}>()

const element = computed<FieldNode | undefined>(() => {
  const el = props.column.element
  if (el && typeof el === 'object' && el.category === 'field') return el as FieldNode
  return undefined
})

const hasElement = computed(() => {
  const el = element.value
  if (!el) return false
  const def = getElementTypeDef(el.type)
  return Boolean(def && def.category === 'field')
})

// 合并元素配置（options + props）透传给 FormKit；type/value 由 :type/:model-value 接管
const formkitAttrs = computed<Record<string, unknown>>(() => {
  const el = element.value
  if (!el) return {}
  const out: Record<string, unknown> = { ...el.props }
  delete out.type
  delete out.value
  if (el.options !== undefined) out.options = el.options
  return out
})

const onUpdate = (v: unknown) => emit('update:value', v)
</script>

<template>
  <FormKit
    v-if="hasElement && element"
    :type="element.type"
    :ignore="true"
    :model-value="value"
    :disabled="props.disabled === true"
    v-bind="formkitAttrs"
    @update:model-value="onUpdate"
  />
  <n-input
    v-else
    size="small"
    :value="(value as string) ?? ''"
    :disabled="props.disabled === true"
    class="!w-full"
    @update:value="onUpdate"
  >
    <template v-slot:password-invisible-icon></template>
  </n-input>
</template>
