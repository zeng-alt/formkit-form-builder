import { computed, inject, type ComputedRef, type Ref } from 'vue'
import { EXPR_SCHEMA_HELPERS } from '@/dsl'
import { lookupFieldValue } from '@/utils/schema/form-data'

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
 *
 * get 陷阱兜底按字段名做树内查找（lookupFieldValue）：dataStructure:'nested' 下
 * 容器/布局节点被 dslToOutputSchema 包进同名 group（见 schema-adapter.ts 的
 * wrapNodeWithGroup），容器内字段的数据不再落在根层，`$字段名` 这种按字段名的
 * 引用在根层直接查会落空。base 是根表单数据，只有 Reflect.get 在根层没查到
 * （返回 undefined）时才会落到这条兜底路径，flat 模式下正常字段都在根层，走的
 * 还是 Reflect.get 这条零额外开销的路径。真正落进兜底的未命中键实测只有 Vue 的
 * __v_isRef 这类响应式内部标记，lookupFieldValue 对 __v_ 前缀直接短路，命中路径
 * 另有缓存，兜底分支的开销与表单规模无关。
 */
export function createSchemaRenderData(
  source: Ref<Record<string, unknown>> | null,
): ComputedRef<Record<string, unknown>> {
  return computed<Record<string, unknown>>(() => {
    const base = source?.value as Record<string, unknown> | undefined
    // 没有表单数据（画布设计态）时同样要挡住 slots：这个 computed 的结果被同一画布上
    // 所有条目的 FormKitSchema 共用，每个 FormKitSchema 挂载时往 data 写入自己的 slots、
    // 卸载时置为 null（@formkit/vue 的 cleanUp）——共用的普通对象会被一个条目的挂载/卸载
    // 改写，其它条目的 schema 一旦引用 $slots 就会读到别人的（或 null 的）slots
    if (!base || typeof base !== 'object')
      return new Proxy({ ...EXPR_SCHEMA_HELPERS } as Record<string, unknown>, {
        set: (target, key, value) => key === 'slots' || Reflect.set(target, key, value),
        deleteProperty: (target, key) => key === 'slots' || Reflect.deleteProperty(target, key),
      })
    return new Proxy(base, {
      get(target, key, receiver) {
        if (typeof key === 'string' && Object.hasOwn(EXPR_SCHEMA_HELPERS, key)) {
          return EXPR_SCHEMA_HELPERS[key]
        }
        const value = Reflect.get(target, key, receiver)
        if (value !== undefined || typeof key !== 'string') return value
        return lookupFieldValue(target as Record<string, unknown>, key)
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
 * 容器（list/card/tabs/... 等）把根表单数据整体传给内部 FormKitSchema：DSL 的
 * visibleIf / expr 语义就是"按字段名引用表单数据"，dataStructure: 'flat' 下所有
 * 字段名平铺在根层，直接传根数据即可；dataStructure: 'nested' 下容器子字段会被
 * dslToOutputSchema 嵌套进同名 group（见 schema-adapter.ts 的 wrapNodeWithGroup），
 * 根层按名字直接查会落空——createSchemaRenderData 的 Proxy get 陷阱在这种情况下
 * 会用 lookupFieldValue 按字段名在整棵数据树里查找，flat / nested 两种模式行为
 * 一致（曾经是已知限制，已修复）。
 */
export function useSchemaRenderData(): ComputedRef<Record<string, unknown>> {
  const previewFormData = inject<Ref<Record<string, unknown>> | null>(PREVIEW_FORM_DATA_KEY, null)
  return createSchemaRenderData(previewFormData)
}
