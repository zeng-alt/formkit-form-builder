import { ref } from 'vue'
import type { Ref } from 'vue'

// 状态门面：formSchema 已迁到 form-definition.ts（DSL 真源 + 只读投影），
// 这里统一 re-export，避免既有消费方改动。
export { formSchema } from './form-definition'

export interface SelectionState {
  selectedIndex: Ref<number>
  selectedKey: Ref<string | null>
  selectedTarget: Ref<'field' | 'form'>
}

// 按实例创建选中状态。
export function createSelectionState(): SelectionState {
  // 选中的根节点下标（未用 __key 定位时的回退）
  const selectedIndex = ref(0)
  // 选中的节点唯一 key（优先于 selectedIndex，支持容器内嵌套节点）
  const selectedKey = ref<string | null>(null)
  // 当前编辑目标：'form'（表单设置）| 'field'（字段/容器）
  const selectedTarget = ref<'field' | 'form'>('form')
  return { selectedIndex, selectedKey, selectedTarget }
}

// 模块级默认实例（向后兼容）。
export const defaultSelectionState = createSelectionState()
export const { selectedIndex, selectedKey, selectedTarget } = defaultSelectionState
