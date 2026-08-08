import { ref } from 'vue'
import type { Ref } from 'vue'
import type { FormNode } from '@/types/dsl'

// 状态门面：formSchema 已迁到 form-definition.ts（DSL 真源 + 只读投影），
// 这里统一 re-export，避免既有消费方改动。
export { formSchema } from './form-definition'

export interface SelectionState {
  selectedIndex: Ref<number>
  selectedKey: Ref<string | null>
  selectedTarget: Ref<'field' | 'form'>
  /** 数据表格选中列下标（null = 未选中列；配合 selectedKey 定位所属数据表格节点） */
  selectedColumnIndex: Ref<number | null>
  /** 元素属性编辑目标覆盖：列元素等非树节点复用标准字段编辑器时指向的工作节点 */
  elementEditTarget: Ref<FormNode | null>
  /** 元素属性写回回调：工作节点变更后把结果落回（如 columns[i].element） */
  elementEditCommit: Ref<((node: FormNode) => void) | null>
}

// 按实例创建选中状态。
export function createSelectionState(): SelectionState {
  // 选中的根节点下标（未用 __key 定位时的回退）
  const selectedIndex = ref(0)
  // 选中的节点唯一 key（优先于 selectedIndex，支持容器内嵌套节点）
  const selectedKey = ref<string | null>(null)
  // 当前编辑目标：'form'（表单设置）| 'field'（字段/容器）
  const selectedTarget = ref<'field' | 'form'>('form')
  // 数据表格选中列下标（列非树节点，不能经 selectedKey 定位，需单独记录）
  const selectedColumnIndex = ref<number | null>(null)
  // 列元素属性编辑：非树节点编辑时把工作 DSL 节点挂到此处，标准编辑器读写它
  const elementEditTarget = ref<FormNode | null>(null)
  const elementEditCommit = ref<((node: FormNode) => void) | null>(null)
  return {
    selectedIndex,
    selectedKey,
    selectedTarget,
    selectedColumnIndex,
    elementEditTarget,
    elementEditCommit,
  }
}

// 模块级默认实例（向后兼容）。
export const defaultSelectionState = createSelectionState()
export const { selectedIndex, selectedKey, selectedTarget } = defaultSelectionState
