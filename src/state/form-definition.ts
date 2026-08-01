import { ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormDefinition } from '../types/dsl'
import { schemaToDsl } from '../dsl'
import { formSchema, formMeta } from './form-schema'

// 规范表单定义：与 legacy formSchema + formMeta 保持同步（唯一写点是 schema-history 的 commit/undo/redo）
// form 级设置（name / labelPosition / labelWidth）由 formMeta 提供，其余节点来自画布 schema

function buildWrappedSchema(): FormKitSchemaFormKit[] {
  return [
    {
      $formkit: 'form',
      name: formMeta.value.name,
      props: {
        labelPosition: formMeta.value.labelPosition,
        labelWidth: formMeta.value.labelWidth,
      },
      children: formSchema.value as any,
    },
  ]
}

export const formDefinition = ref<FormDefinition>(schemaToDsl(buildWrappedSchema()))

// 从当前 schema + formMeta 重建规范 DSL（画布状态变更后由 schema-history 调用）
export function syncFormDefinition(): void {
  formDefinition.value = schemaToDsl(buildWrappedSchema(), {
    id: formDefinition.value?.id,
  })
}
