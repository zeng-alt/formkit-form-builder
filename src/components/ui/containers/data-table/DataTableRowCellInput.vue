<script setup lang="ts">
import { computed } from 'vue'
import { FormKit } from '@formkit/vue'
import { NInput } from 'naive-ui'
import { evalExpr, getElementTypeDef } from '@/dsl'
import { resolveValidation } from '@/dsl/compile'
import type { FieldNode } from '@/types/dsl'
import type { DataTableColumn } from './types'

// 预览「新增数据行」弹窗：按列来源元素（DSL FieldNode）渲染原字段控件。
// 用 FormKit :type 直接复用元素注册的输入组件（options / valueFormat 等配置随 props 透传），
// :ignore 隔离在预览主表单上下文之外，值经 update:modelValue 回写 draftRow。
// disabled：表达式驱动（expr）的列值由行数据派生，禁止手输。
// validate：为真且列有字段元素时按列的 validation 规则参与外层 FormKit 表单校验
// （:ignore 改为 false，挂到调用方包好的 form/group 节点上）；默认 false，行为与此前一致。
// row：当前行完整数据，供列元素的 requiredIf 按行内其它列的值求值（G：数据表格列
// 条件必填，成本考量只做了这一项，见 dsl/compile.ts 里 resolveFieldValidation 附近的说明）。
const props = defineProps<{
  column: DataTableColumn
  value: unknown
  disabled?: boolean
  validate?: boolean
  row?: Record<string, unknown>
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

// 派生列（disabled）禁止手输，也不参与校验；没有字段元素兜底成 n-input 时同样不校验
const shouldValidate = computed(
  () => props.validate === true && hasElement.value && props.disabled !== true,
)

// 合并元素配置（options + props）透传给 FormKit；type/value 由 :type/:model-value 接管；
// 参与校验时追加 name/label/validation，交由外层表单节点收集校验状态
const formkitAttrs = computed<Record<string, unknown>>(() => {
  const el = element.value
  const out: Record<string, unknown> = { ...el?.props }
  delete out.type
  delete out.value
  if (el?.options !== undefined) out.options = el.options
  if (shouldValidate.value) {
    const resolved = resolveValidation(el?.validation)
    out.name = props.column.key
    // label 用于校验提示里的字段名（如「姓名不得留空」）；列名已由表头 / 弹窗自己的标题显示，
    // FormKit 的标签只保留给读屏器，不在单元格里重复显示
    out.label = props.column.title
    out['label-class'] = 'sr-only'
    let rules = resolved.validation
    // G：条件必填——按当前行数据求值 requiredIf，字段已有静态 required 时静态优先
    // （与普通字段的 dsl/convert/field.ts resolveFieldValidation 同一优先级）
    const hasStaticRequired = (el?.validation ?? []).some((r) => r.rule === 'required')
    if (el?.requiredIf && !hasStaticRequired) {
      const result = evalExpr(el.requiredIf, props.row ?? {})
      if (result.ok && result.value) rules = [...rules, ['required']]
    }
    out.validation = rules
    out['validation-messages'] = resolved['validation-messages']
    out['validation-visibility'] = 'dirty'
  }
  return out
})

const onUpdate = (v: unknown) => emit('update:value', v)
</script>

<template>
  <FormKit
    v-if="hasElement && element"
    :type="element.type"
    :ignore="!shouldValidate"
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
