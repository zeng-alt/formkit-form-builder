<script setup lang="ts">
import { computed } from 'vue'
import { FormKit } from '@formkit/vue'
import { NInput } from 'naive-ui'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode } from '@/types/dsl'
import type { DataTableColumn } from './types'

// 搜索区字段控件：按搜索字段来源元素（DSL FieldNode）渲染原字段控件，
// 与「新增数据行」弹窗（DataTableRowCellInput）同一套思路 —— 用 FormKit :type
// 复用元素注册的输入组件（options / valueFormat 等配置随 props 透传），
// :ignore 隔离在预览主表单上下文之外，值经 update:value 回写 searchValues。
// 无可用元素（缺省/非法）时回落为普通 NInput。
const props = defineProps<{
  column?: DataTableColumn
  value: unknown
}>()

const emit = defineEmits<{
  'update:value': [value: unknown]
}>()

const element = computed<FieldNode | undefined>(() => {
  const el = props.column?.element
  if (el && typeof el === 'object' && el.category === 'field') return el as FieldNode
  return undefined
})

const hasElement = computed(() => {
  const el = element.value
  if (!el) return false
  const def = getElementTypeDef(el.type)
  return Boolean(def && def.category === 'field')
})

// 合并元素配置（options + props）透传给 FormKit；type/value 由 :type/:model-value 接管。
// 与 DataTableRowCellInput 完全一致：用户设置的属性（placeholder/disabled/clearable/size…）全量透传
const formkitAttrs = computed<Record<string, unknown>>(() => {
  const el = element.value
  if (!el) return {}
  const out: Record<string, unknown> = { ...el.props }
  delete out.type
  delete out.value
  delete out.help
  delete out.description
  if (el.options !== undefined) out.options = el.options
  return out
})

const onUpdate = (v: unknown) => emit('update:value', v)
</script>

<template>
  <div class="w-40 shrink-0">
    <FormKit
      v-if="hasElement && element"
      :type="element.type"
      :ignore="true"
      :model-value="value"
      v-bind="formkitAttrs"
      @update:model-value="onUpdate"
    />
    <n-input
      v-else
      size="small"
      clearable
      :value="(value as string) ?? ''"
      :placeholder="column?.title"
      class="w-full"
      @update:value="onUpdate"
    />
  </div>
</template>
