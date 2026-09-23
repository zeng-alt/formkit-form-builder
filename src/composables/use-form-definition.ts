// ═══ 窄只读上下文：表单定义 ═══════════════════════════════════════════════════
// FormRenderer 子树（渲染态）不需要 undo/redo/选中态/画布交互，只需要读 formDefinition
// 派生出的只读信息（id/version/name/settings 等）。此前这类消费方借用完整的
// FormBuilderState（useFormBuilderState()），靠 createMinimalFormBuilderState() 伪造
// 出 17 个 noop 方法 / 空 ref 才能满足类型——FormRenderer 子树里没有任何消费方真的用到
// 那些字段，纯粹是被类型签名逼出来的假实现。这里改成一个只承载 FormDefinition 本身的
// 窄上下文，FormBuilder（画布设计态）与 FormRenderer（只读渲染态）各自按需 provide，
// 互不牵连对方的历史 / 选中状态。
import { computed, inject, provide } from 'vue'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { DSL_VERSION } from '@/types/dsl'
import type { FormDefinition } from '@/types/dsl'

const FORM_DEFINITION_KEY: InjectionKey<
  Ref<FormDefinition> | ComputedRef<FormDefinition>
> = Symbol('formDefinition')

/** 为当前组件子树提供表单定义（只读窄上下文）。
 *  传入的 ref/computed 需保持稳定引用——provide 只在 setup 时捕获一次，子树消费方
 *  读的是同一个 ref 的 .value；definition 变化时改这个 ref 的值即可，不要每次重新
 *  调用本函数（那样子树后续读到的还是旧值）。 */
export function provideFormDefinition(
  source: Ref<FormDefinition> | ComputedRef<FormDefinition>,
): void {
  provide(FORM_DEFINITION_KEY, source)
}

/** 仅读取表单级只读信息（version/id/name/root/settings 等），不包含字段编辑/写操作。
 *  供 FormRenderer 等只读渲染场景使用，避免引入 patchSelected 等设计器专用逻辑。
 *  子树外调用直接报错：当前全部调用方（字段事件绑定 / 数据表格预览）都只在
 *  FormBuilder / FormRenderer 子树内渲染，两者都会 provide 这个上下文，找不到就是
 *  真的用错了地方，宁可让调用方立刻看到问题，也不要悄悄回落一份假定义。 */
export function useFormDefinition() {
  const source = inject(FORM_DEFINITION_KEY, null)
  if (!source) {
    throw new Error(
      '[formkit-form-builder] useFormDefinition() 必须在 FormBuilder / FormRenderer（或 provideFormDefinition）子树内调用：未找到表单定义上下文。',
    )
  }

  const formDefinition = computed(() => source.value)
  const formName = computed(() => source.value?.name ?? '')
  const formId = computed(() => source.value?.id ?? '')
  const formVersion = computed(() => source.value?.version ?? DSL_VERSION)
  const formLabelPosition = computed<'top' | 'left'>(() =>
    source.value?.settings?.labelAlign === 'left' ? 'left' : 'top',
  )
  const formLabelWidth = computed(() => source.value?.settings?.labelWidth ?? 80)
  const formSubmit = computed(() => source.value?.settings?.submit ?? '')
  const formLayout = computed(() => source.value?.settings?.layout ?? 'vertical')
  const formColumns = computed(() => source.value?.settings?.columns ?? 12)
  const formFullWidth = computed(() => source.value?.settings?.fullWidth ?? false)
  const formRoot = computed(() => source.value?.root)
  const formSettings = computed(() => source.value?.settings)
  const formMeta = computed(() => source.value?.meta)

  return {
    formDefinition,
    formName,
    formId,
    formVersion,
    formLabelPosition,
    formLabelWidth,
    formSubmit,
    formLayout,
    formColumns,
    formFullWidth,
    formRoot,
    formSettings,
    formMeta,
  }
}
