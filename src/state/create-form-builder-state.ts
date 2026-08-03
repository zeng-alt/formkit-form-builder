import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import { createFormDefinitionState, type FormDefinitionState } from '@/state/form-definition'
import { createSelectionState, type SelectionState } from '@/state/form-schema'
import { createCanvasUiState, type CanvasUiState } from '@/state/canvas-ui'
import { createSchemaHistory, type SchemaHistory } from '@/composables/schema-history'

/** 单个 FormBuilder 实例的全部状态（表单定义 + 选中 + 画布 UI + 历史漏斗）。 */
export interface FormBuilderState
  extends FormDefinitionState,
    SelectionState,
    CanvasUiState,
    SchemaHistory {
  /** 实例标识：用于 DnD 根 drop-area 选择器作用域（多设计器并存）。 */
  instanceId: string
}

function generateInstanceId(): string {
  return `fbb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 创建独立的 FormBuilder 状态实例。 */
export function createFormBuilderState(): FormBuilderState {
  const def = createFormDefinitionState()
  const selection = createSelectionState()
  const canvas = createCanvasUiState()
  const history = createSchemaHistory({ ...def, ...selection })
  return {
    ...def,
    ...selection,
    ...canvas,
    ...history,
    instanceId: generateInstanceId(),
  }
}

export const BUILDER_STATE_KEY: InjectionKey<FormBuilderState> = Symbol('formBuilderState')

// 模块级默认实例（兜底）：未通过 provideFormBuilderState 提供时，迁移未完成的消费方仍可用。
export const defaultFormBuilderState = createFormBuilderState()

/** 为当前组件子树提供 FormBuilder 状态。 */
export function provideFormBuilderState(
  state: FormBuilderState = createFormBuilderState(),
): FormBuilderState {
  provide(BUILDER_STATE_KEY, state)
  return state
}

/** 读取所在 FormBuilder 实例的状态；子树外（如独立使用的 BuilderPreview）回落到默认实例。 */
export function useFormBuilderState(): FormBuilderState {
  return inject(BUILDER_STATE_KEY, defaultFormBuilderState)
}
