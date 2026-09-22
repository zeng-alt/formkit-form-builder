import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import { createFormDefinitionState, type FormDefinitionState } from '@/state/form-definition'
import { createSelectionState, type SelectionState } from '@/state/form-schema'
import { createCanvasUiState, type CanvasUiState } from '@/state/canvas-ui'
import { createSchemaHistory, type SchemaHistory } from '@/composables/schema-history'
import { computed, ref } from 'vue'
import type { FormDefinition } from '@/types/dsl'

/** 单个 FormBuilder 实例的全部状态（表单定义 + 选中 + 画布 UI + 历史漏斗）。 */
export interface FormBuilderState
  extends FormDefinitionState, SelectionState, CanvasUiState, SchemaHistory {
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

/** 创建最小 FormBuilder 状态（仅含 formDefinition 真源，其余字段为空实现满足类型）。
 *  供 FormSchemaRenderer 等只读渲染场景使用，不需要 undo/redo/选中/画布交互。 */
export function createMinimalFormBuilderState(definition: FormDefinition): FormBuilderState {
  const def = createFormDefinitionState(definition)
  const noop = () => {}
  const noopWithArg = <T>(_arg: T) => {}
  const falseRef = computed(() => false)

  return {
    ...def,
    selectedIndex: ref(0),
    selectedKey: ref<string | null>(null),
    selectedTarget: ref<'field' | 'form'>('form'),
    selectedColumnIndex: ref<number | null>(null),
    elementEditTarget: ref(null),
    elementEditCommit: ref(null),
    canvasView: ref<'desktop' | 'tablet' | 'mobile'>('desktop'),
    isLoading: ref(false),
    commitFormDefinition: noopWithArg,
    commitSchema: noopWithArg,
    commitSchemaReconcile: noopWithArg,
    undo: noop,
    redo: noop,
    resetHistory: noop,
    setFormDefinition: noopWithArg,
    canUndo: falseRef,
    canRedo: falseRef,
    instanceId: `renderer-${Date.now()}`,
  }
}

export const BUILDER_STATE_KEY: InjectionKey<FormBuilderState> = Symbol('formBuilderState')

/** 为当前组件子树提供 FormBuilder 状态。 */
export function provideFormBuilderState(
  state: FormBuilderState = createFormBuilderState(),
): FormBuilderState {
  provide(BUILDER_STATE_KEY, state)
  return state
}

/** 读取所在 FormBuilder / FormRenderer 实例的状态；子树外调用直接报错（不再回落全局单例）。
 *  多实例场景下，静默写进一个谁也看不见的全局实例比报错更难排查——找不到上下文时
 *  宁可让调用方立刻看到问题，也不要悄悄改错状态。独立使用的组件请改用
 *  useOptionalFormBuilderState()。 */
export function useFormBuilderState(): FormBuilderState {
  const state = inject(BUILDER_STATE_KEY, null)
  if (!state) {
    throw new Error(
      '[formkit-form-builder] useFormBuilderState() 必须在 FormBuilder / FormRenderer（或 provideFormBuilderState）子树内调用：未找到实例状态。独立使用的组件请改用 useOptionalFormBuilderState()。',
    )
  }
  return state
}

/** 可选读取：可脱离 FormBuilder 独立使用的组件（如 BuilderPreview 传 schema prop）用它，
 *  子树外返回 null，由调用方自行决定回落逻辑。 */
export function useOptionalFormBuilderState(): FormBuilderState | null {
  return inject(BUILDER_STATE_KEY, null)
}
