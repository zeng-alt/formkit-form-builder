import { computed, ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormDefinition } from '../types/dsl'
import { dslToSchema, schemaToDsl } from '../dsl'

export type FormLabelPosition = 'top' | 'left'

// 默认画布初始节点（带稳定 __key，保证投影 / 选中一致）
const DEFAULT_CHILDREN: FormKitSchemaFormKit[] = [
  {
    $formkit: 'submit',
    outerClass: 'col-span-12 pt-2',
    type: 'submit',
    name: 'submit_button',
    label: 'Submit',
    __key: 'submit_default',
  },
]

// 表单级设置（name / labelPosition / labelWidth）
export const formMeta = ref<{
  name: string
  labelPosition: FormLabelPosition
  labelWidth: number
}>({
  name: 'form',
  labelPosition: 'top',
  labelWidth: 80,
})

function buildWrappedSchema(children: FormKitSchemaFormKit[]): FormKitSchemaFormKit[] {
  return [
    {
      $formkit: 'form',
      name: formMeta.value.name,
      props: {
        labelPosition: formMeta.value.labelPosition,
        labelWidth: formMeta.value.labelWidth,
      },
      children: children as any,
    },
  ]
}

// 规范表单定义：唯一真源。画布 / DnD 的 schema（formSchema）是其只读投影。
export const formDefinition = ref<FormDefinition>(schemaToDsl(buildWrappedSchema(DEFAULT_CHILDREN)))

// schema 投影（只读）：渲染 / DnD / 画布使用，由 DSL 派生
export const formSchema = computed<FormKitSchemaFormKit[]>(() => {
  const wrapped = dslToSchema(formDefinition.value)
  const children = wrapped[0]?.children
  return Array.isArray(children) ? (children as FormKitSchemaFormKit[]) : []
})

// 由 schema 投影提交 → 转回 DSL（供 DnD / 容器更新 / legacy 导入使用）
export function commitSchemaChildren(children: FormKitSchemaFormKit[]): FormDefinition {
  return schemaToDsl(buildWrappedSchema(children), { id: formDefinition.value?.id })
}
