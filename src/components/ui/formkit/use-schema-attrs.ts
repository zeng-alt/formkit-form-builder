import { computed, reactive, watchEffect } from 'vue'
import type { FormKitFrameworkContext } from '@formkit/core'
import { useOptionalFormDefinition } from '@/composables/use-form-definition'

// 配置经 FormKit 展平进 node.props.attrs，并由 bindings.observeProps 同步为 framework context
// 的响应式 attrs（node.props.attrs 重赋值 → prop:attrs → context.attrs）。
// 属性面板修改配置即走这条响应式通道触发组件重渲染 —— useAttrs() 只能拿到 $cmp 渲染时的快照，
// 无法响应后续变更，因此这里用稳定 reactive 对象镜像 context.attrs，组件据此响应式读取。
// 命名对齐 FormKit 语义：$cmp 节点的配置叫 props（区别于 $el 节点的 HTML attrs）。
const INTERNAL_KEYS = new Set([
  'context',
  'key',
  '__key',
  '__bind',
  '__attrs',
  '__disabledIf',
  '__readonlyIf',
  'outerClass',
  'value',
  'modelValue',
  'name',
  'label',
  'help',
  'type',
  'validation',
  'validation-messages',
  'validationMessages',
  'config',
  'plugins',
  '__root',
  '__slots',
  '_value',
  'if',
  'children',
])

// 表单级只读设置下，原生支持 readonly 语义的字段类型（底层 naive-ui 组件确实声明了
// readonly prop：NInput / NInputNumber）；其余组件没有只读语义，统一在下面的 disabled
// 计算属性里退化为禁用（见 FormSettings.readonly 的注释）。
const READONLY_CAPABLE_TYPES = new Set([
  'text',
  'email',
  'url',
  'tel',
  'password',
  'textarea',
  'number',
])

export function useSchemaAttrs(context: FormKitFrameworkContext, opts: { omit?: string[] } = {}) {
  const omitSet = new Set(opts.omit ?? [])
  // 表单级设置（size/disabled/readonly 的渲染层兜底默认值）：字段自身有配置时优先用
  // 字段自身的，没有配置时才回落到这里——不写回节点数据，纯渲染态计算。子树外
  // （脱离 FormBuilder/FormRenderer 的孤立用法）拿不到上下文，按无表单级设置处理。
  const formCtx = useOptionalFormDefinition()

  // config：context.attrs 的响应式镜像（含 __bind 等内部键），整体镜像到稳定 reactive 对象
  const config = reactive<Record<string, unknown>>({})
  watchEffect(() => {
    const { props = {}, ...rest } = context?.attrs || {}
    const bag = {
      ...props,
      ...rest,
    }
    const next: Record<string, unknown> = bag && typeof bag === 'object' ? bag : {}
    for (const key of Object.keys(config)) {
      if (!(key in next)) delete config[key]
    }
    Object.assign(config, next)
  })

  // props：剔除内部键 + 组件自定义排除项后，可安全 v-bind 到 naive-ui 组件的属性
  const props = computed<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(config)) {
      if (INTERNAL_KEYS.has(key) || omitSet.has(key) || value === undefined) continue
      out[key] = value
    }
    // 自定义属性 map（node.props.__attrs）展开为 naive-ui 组件属性，未定义值跳过
    const attrs = config.__attrs
    if (attrs && typeof attrs === 'object') {
      for (const [key, value] of Object.entries(attrs as Record<string, unknown>)) {
        if (value === undefined) continue
        out[key] = value
      }
    }
    // 尺寸级联：字段自身未配置 size，或仍是元素定义里烘焙的基线默认值 'medium'
    // （拖入画布的字段几乎都在 commonProps 里带着这个值出生，不是用户手动选的，
    // 与"未设置"在语义上等价——参见 elements/definitions/fields.ts 的 commonProps），
    // 才回落表单级设置；字段被显式改成 small/large 视为用户的确定选择，不覆盖。
    if (out.size === undefined || out.size === 'medium') {
      const formSize = formCtx?.formSettings.value?.size
      if (formSize) out.size = formSize
    }
    // 只读级联：表单级只读、或字段自身条件只读（G：readonlyIf）为真时，只有原生
    // 支持 readonly 语义的字段类型才透传真正的 readonly（值仍可见、不可编辑）；
    // 其余类型没有只读语义，交给下面的 disabled 计算属性统一退化为禁用——判断口径
    // 与表单级只读共用同一份 READONLY_CAPABLE_TYPES，不另起一套。
    if (out.readonly === undefined) {
      const formReadonly = Boolean(formCtx?.formSettings.value?.readonly)
      const condReadonly = Boolean(config.__readonlyIf)
      if ((formReadonly || condReadonly) && READONLY_CAPABLE_TYPES.has(context.type)) {
        out.readonly = true
      }
    }
    return out
  })

  // bind：绑定代码（onClick/onInput/onChange...），原 node.props.__bind 现位于 config.__bind
  const bind = computed<Record<string, unknown>>(() =>
    typeof config.__bind === 'object' && config.__bind
      ? (config.__bind as Record<string, unknown>)
      : {},
  )

  // ─── disabled：FormKit 保留属性名，会被拦截、永远不会流入 context.attrs / props ──
  // disabled 命中 @formkit/vue useInput.ts 的 pseudoProps 表（字面量 "disabled"），
  // 因此不会像其余配置那样经 context.attrs 流入上面的 props；FormKit 改落到
  // context.disabled（节点自身配置 / 表单级联二合一，两者谁有值就生效）。这里统一算
  // 一次，所有字段包装组件都直接解构使用，不用每个组件各自重复摸底层位置——
  // 仍兜底读一次 config.disabled，覆盖用户经"自定义属性"面板绕开保留名拦截的情形
  // （config 镜像的是 context.attrs，正常路径下不会有 disabled，只有这条兜底路径才用得到）。
  const disabled = computed<boolean>(() => {
    if (Boolean(config.disabled) || Boolean(context.disabled)) return true
    const settings = formCtx?.formSettings.value
    if (settings?.disabled) return true
    // 表单级只读 + 当前字段类型不支持真正的 readonly 语义：退化为禁用（B1，见
    // FormSettings.readonly 与上面 READONLY_CAPABLE_TYPES 的注释）
    if (settings?.readonly && !READONLY_CAPABLE_TYPES.has(context.type)) return true
    // G：条件禁用（disabledIf）直接生效；条件只读（readonlyIf）在当前类型不支持
    // 原生只读语义时同样退化为禁用——与表单级 disabled/readonly、字段静态 disabled
    // 三者是"任一为真即生效"的关系，这里统一 OR 进来，不走 FormKit 自己的
    // disabled 级联属性（那套机制在节点自身有值时会屏蔽父级/表单级级联，见
    // fieldNodeToSchema 里 __disabledIf/__readonlyIf 的注释）。
    if (config.__disabledIf) return true
    if (config.__readonlyIf && !READONLY_CAPABLE_TYPES.has(context.type)) return true
    return false
  })

  return { config, props, bind, disabled }
}
