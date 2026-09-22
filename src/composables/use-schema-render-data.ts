import { computed, inject, type ComputedRef, type Ref } from 'vue'
import { EXPR_SCHEMA_HELPERS } from '@/dsl'

// ─── 注入键 ───────────────────────────────────────────────────────────────
// FormRenderer 把当前表单数据以这个 key provide 下去（dataTable 远程数据 JS 代码、
// badge 表达式取值、容器内嵌套 FormKitSchema 都要用它）。此前散落在多个文件里
// 各自手写字符串字面量，容易改一处漏一处，这里统一成常量，模块间共享同一份真源。
export const PREVIEW_FORM_DATA_KEY = 'previewFormData'

/**
 * 构造传给 FormKitSchema 的 data：表单数据 + 表达式 helper（helper 优先）。
 *
 * FormKitSchema 渲染上下文会把内部 slots 写进传入的 data 对象（Object.assign(reactive(data), { slots })），
 * 而 source 同时可能是表单 v-model 的数据源，slots 会因此泄漏进表单值（结构里多出 slots:{}）。
 * 给 FormKitSchema 传一个挡住 slots 写入的代理，阻断泄漏源头。
 *
 * 同一个代理顺带注入 EXPR_SCHEMA_HELPERS（visibleIf 编译出的 $fkb_* 调用在这里解析）：
 * 之所以在 get 里做优先级判断、而不是简单 `{ ...base, ...EXPR_SCHEMA_HELPERS }` 拼一个
 * 新对象，是因为 base 是表单 v-model 的原始响应式对象——拼新对象会丢失字段级响应性
 * （深层字段变化不会让这个 computed 重新求值），直接 Object.assign 进 base 又会把
 * helper 函数写脏进表单输出数据（重蹈上面 slots 泄漏的覆辙）。get 陷阱不改变 base
 * 本身，只在读取时让同名 helper 覆盖字段（字段名不能以 fkb_ 开头，见 NameInput 校验，
 * 所以正常情况下不会有真实字段被挡住）。
 */
export function createSchemaRenderData(
  source: Ref<Record<string, unknown>> | null,
): ComputedRef<Record<string, unknown>> {
  return computed<Record<string, unknown>>(() => {
    const base = source?.value as Record<string, unknown> | undefined
    if (!base || typeof base !== 'object') return { ...EXPR_SCHEMA_HELPERS }
    return new Proxy(base, {
      get(target, key, receiver) {
        if (typeof key === 'string' && Object.hasOwn(EXPR_SCHEMA_HELPERS, key)) {
          return EXPR_SCHEMA_HELPERS[key]
        }
        return Reflect.get(target, key, receiver)
      },
      set(target, key, value) {
        if (key === 'slots') return true
        return Reflect.set(target, key, value)
      },
      deleteProperty(target, key) {
        if (key === 'slots') return true
        return Reflect.deleteProperty(target, key)
      },
    }) as Record<string, unknown>
  })
}

/**
 * 容器组件（card/list/tabs/steps/badge/buttonGroup/inputGroup 等运行时预览组件）用：
 * 注入 FormRenderer 提供的 previewFormData，交给 createSchemaRenderData 构造 data。
 *
 * 注入不到时（画布设计态：ContainerChildrenGrid 渲染的是设计器画布，不在 FormRenderer
 * 树下，没有人 provide previewFormData）只给 helper——画布设计态本来就没有真实表单
 * 数据可言，这是固有情况，不是遗漏。
 *
 * 已知限制：list 容器把根表单数据整体传给内部 FormKitSchema，这在默认 dataStructure:
 * 'flat'（所有字段名平铺在表单数据顶层）下是对的——DSL 的 visibleIf 语义就是"按字段名
 * 引用表单数据"。但 dataStructure: 'nested' 时容器子字段会被 dslToOutputSchema 嵌套进
 * group，根级按名字取不到同名字段，容器内 visibleIf 在 nested 模式下仍会解析不到——
 * 这个差异不在本次修复范围内，需要专门按 nested 输出结构调整 data 的取值路径。
 */
export function useSchemaRenderData(): ComputedRef<Record<string, unknown>> {
  const previewFormData = inject<Ref<Record<string, unknown>> | null>(PREVIEW_FORM_DATA_KEY, null)
  return createSchemaRenderData(previewFormData)
}
