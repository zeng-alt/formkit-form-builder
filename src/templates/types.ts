// ═══ 表单模板 ═══════════════════════════════════════════════════════════════════
// 每个模板是一个纯函数（build），传入当前语言的 t() 就能产出一份完整的
// FormDefinition——文案跟着调用时的语言走，而不是固化在某一种语言里。
// fieldTypes 只用于弹窗卡片展示"主要字段类型图标"（按 getElementTypeDef(type).icon
// 取真实图标，不在这里重复写死），与 build() 产出的字段类型一一对应但顺序不必严格
// 一致——卡片只是给用户一个大致印象，不是字段清单。

import type { FormDefinition } from '@/types/dsl'

export interface FormTemplateMeta {
  /** 模板身份（弹窗内 key，不进入生成的表单定义） */
  id: string
  /** 卡片图标（i-lucide-*） */
  icon: string
  /** 名称 / 描述 i18n key（templates.<id>.name / .description） */
  nameKey: string
  descriptionKey: string
  /** 字段数量（含分组容器内的字段），用于卡片展示 */
  fieldCount: number
  /** 主要字段类型（DSL type），卡片按此取图标展示 */
  fieldTypes: string[]
  /** 按当前语言构造一份全新的表单定义（每次调用都是独立对象，可直接提交） */
  build: (t: (key: string) => string) => FormDefinition
}
