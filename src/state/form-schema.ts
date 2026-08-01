import type { FormKitSchemaFormKit } from '@formkit/core'
import { ref } from 'vue'

// 全局表单 Schema 状态：当前构建的画布数据
export const formSchema = ref<FormKitSchemaFormKit[]>([
  {
    $formkit: 'submit',
    outerClass: 'col-span-12 pt-2',
    type: 'submit',
    name: 'submit_button',
    label: 'Submit',
  },
])

// 选中的根节点下标（未用 __key 定位时的回退）
export const selectedIndex = ref(0)
// 选中的节点唯一 key（优先于 selectedIndex，支持容器内嵌套节点）
export const selectedKey = ref<string | null>(null)
// 当前编辑目标：'form'（表单设置）| 'field'（字段/容器）
export const selectedTarget = ref<'field' | 'form'>('form')

export type FormLabelPosition = 'top' | 'left'

export const formMeta = ref<{
  name: string
  labelPosition: FormLabelPosition
  labelWidth: number
}>({
  name: 'form',
  labelPosition: 'top',
  labelWidth: 80,
})
