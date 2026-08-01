import { computed, ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormDefinition, FormSettings } from '../types/dsl'
import { dslToSchema, schemaToDsl } from '../dsl'

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

// 表单级设置默认值（未显式提供时使用）
const DEFAULT_FORM_NAME = 'form'
const DEFAULT_SETTINGS: FormSettings = { layout: 'vertical', labelWidth: 80, labelAlign: 'top' }

// 表单级设置（name / labelAlign / labelWidth）统一由 FormDefinition 承载，无旁路状态。
// 未传 source 时回落到 formDefinition（保持当前表单级设置）。
function buildWrappedSchema(
  children: FormKitSchemaFormKit[],
  source?: Pick<FormDefinition, 'name' | 'settings'>,
): FormKitSchemaFormKit[] {
  const name = source?.name ?? formDefinition.value?.name ?? DEFAULT_FORM_NAME
  const settings = source?.settings ?? formDefinition.value?.settings ?? DEFAULT_SETTINGS
  return [
    {
      $formkit: 'form',
      name,
      props: {
        labelPosition: settings.labelAlign === 'left' ? 'left' : 'top',
        labelWidth: settings.labelWidth ?? 80,
      },
      children: children as any,
    },
  ]
}

// 规范表单定义：唯一真源。画布 / DnD 的 schema（formSchema）是其只读投影。
export const formDefinition = ref<FormDefinition>(
  schemaToDsl(
    buildWrappedSchema(DEFAULT_CHILDREN, { name: DEFAULT_FORM_NAME, settings: DEFAULT_SETTINGS }),
  ),
)

// schema 投影（只读）：渲染 / DnD / 画布使用，由 DSL 派生
export const formSchema = computed<FormKitSchemaFormKit[]>(() => {
  const wrapped = dslToSchema(formDefinition.value)
  const children = wrapped[0]?.children
  return Array.isArray(children) ? (children as FormKitSchemaFormKit[]) : []
})

// 由 schema 投影提交 → 转回 DSL（供 DnD / 容器更新 / legacy 导入使用）
// source 用于覆盖表单级设置（如导入带 name / settings 的外部 schema）
export function commitSchemaChildren(
  children: FormKitSchemaFormKit[],
  source?: Pick<FormDefinition, 'name' | 'settings'>,
): FormDefinition {
  return schemaToDsl(buildWrappedSchema(children, source), { id: formDefinition.value?.id })
}
