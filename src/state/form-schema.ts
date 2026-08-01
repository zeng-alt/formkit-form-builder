import { ref } from 'vue'

// 状态门面：formSchema / formMeta 已迁到 form-definition.ts（DSL 真源 + 只读投影），
// 这里统一 re-export，避免既有消费方改动。
export { formSchema, formMeta } from './form-definition'
export type { FormLabelPosition } from './form-definition'

// 选中的根节点下标（未用 __key 定位时的回退）
export const selectedIndex = ref(0)
// 选中的节点唯一 key（优先于 selectedIndex，支持容器内嵌套节点）
export const selectedKey = ref<string | null>(null)
// 当前编辑目标：'form'（表单设置）| 'field'（字段/容器）
export const selectedTarget = ref<'field' | 'form'>('form')
