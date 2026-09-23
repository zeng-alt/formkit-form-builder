import { computed, shallowRef } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormDefinition, FormSettings } from '../types/dsl'
import { createSchemaProjector, schemaToDsl } from '../dsl'
import { ensureDslKeys } from '../dsl/keys'
import { freezeDeepDev } from '../utils/freeze'

// 默认画布初始节点（带稳定 __key，保证投影 / 选中一致）。不在这里写死 label：
// 这里没有 i18n（t 函数）可用，硬编码的英文 'Submit' 在中文界面下就是错的；
// 留空交给 BuilderMain 在拿到 t() 后补上当前语言的文案（见 BuilderMain.vue）。
const DEFAULT_CHILDREN: FormKitSchemaFormKit[] = [
  {
    $formkit: 'submit',
    type: 'submit',
    name: 'submit_button',
    __key: 'submit_default',
  },
]

// 表单级设置默认值（未显式提供时使用）
const DEFAULT_FORM_NAME = 'form'
const DEFAULT_SETTINGS: FormSettings = { layout: 'vertical', labelWidth: 80, labelAlign: 'top' }

// 纯函数：组装 form 包裹节点。name / settings 未显式提供时回落 fallback（实例的当前表单级设置）。
function buildWrappedSchema(
  children: FormKitSchemaFormKit[],
  source?: Pick<FormDefinition, 'name' | 'settings'>,
  fallback?: Pick<FormDefinition, 'name' | 'settings'>,
): FormKitSchemaFormKit[] {
  const name = source?.name ?? fallback?.name ?? DEFAULT_FORM_NAME
  const settings = source?.settings ?? fallback?.settings ?? DEFAULT_SETTINGS
  return [
    {
      $formkit: 'form',
      name,
      props: {
        labelPosition: settings.labelAlign === 'left' ? 'left' : 'top',
        labelWidth: settings.labelWidth ?? 80,
      },
      children,
    },
  ]
}

export interface FormDefinitionState {
  formDefinition: ShallowRef<FormDefinition>
  formSchema: ComputedRef<FormKitSchemaFormKit[]>
  /** 本实例的增量转换投影（按节点身份缓存）。commitSchemaReconcile 的基线投影
   *  复用同一个 projector 才能命中缓存，因此随实例状态一并暴露，不要再改调
   *  公开的 dslToSchema（那是无缓存的纯函数，每次都会重新转换整棵树）。 */
  schemaProjector: ReturnType<typeof createSchemaProjector>
  commitSchemaChildren: (
    children: FormKitSchemaFormKit[],
    source?: Pick<FormDefinition, 'name' | 'settings'>,
  ) => FormDefinition
}

// 按实例创建表单定义状态（DSL 真源 + 只读 schema 投影）。
export function createFormDefinitionState(initialDefinition?: FormDefinition): FormDefinitionState {
  // 规范表单定义：唯一真源，整体替换、从不深层改写（编辑路径全是展开拷贝），
  // 用 shallowRef 而不是 ref：深层代理对不可变数据没有意义，配合开发态冻结，
  // Vue 的 reactive() 对不可扩展对象本来就会跳过代理直接返回原对象。
  const formDefinition = shallowRef<FormDefinition>(
    freezeDeepDev(
      initialDefinition
        ? ensureDslKeys(initialDefinition)
        : schemaToDsl(
            buildWrappedSchema(DEFAULT_CHILDREN, {
              name: DEFAULT_FORM_NAME,
              settings: DEFAULT_SETTINGS,
            }),
          ),
    ),
  )

  // 本实例的增量转换投影：formSchema 与 commitSchemaReconcile 的基线投影共用同一个
  // projector，命中同一份按节点身份缓存的转换结果
  const schemaProjector = createSchemaProjector()

  // schema 投影（只读）：渲染 / DnD / 画布使用，由 DSL 派生
  const formSchema = computed<FormKitSchemaFormKit[]>(() => {
    const wrapped = schemaProjector.toSchema(formDefinition.value)
    const children = wrapped[0]?.children
    return Array.isArray(children) ? (children as FormKitSchemaFormKit[]) : []
  })

  // 由 schema 投影提交 → 转回 DSL（供 DnD / 容器更新 / legacy 导入使用）
  // source 用于覆盖表单级设置（如导入带 name / settings 的外部 schema）
  const commitSchemaChildren = (
    children: FormKitSchemaFormKit[],
    source?: Pick<FormDefinition, 'name' | 'settings'>,
  ): FormDefinition =>
    schemaToDsl(buildWrappedSchema(children, source, formDefinition.value), {
      id: formDefinition.value?.id,
    })

  return { formDefinition, formSchema, schemaProjector, commitSchemaChildren }
}
