import { computed, reactive, watchEffect } from 'vue'
import type { FormKitFrameworkContext } from '@formkit/core'

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

export function useSchemaAttrs(context: FormKitFrameworkContext, opts: { omit?: string[] } = {}) {
  const omitSet = new Set(opts.omit ?? [])

  // config：context.attrs 的响应式镜像（含 __bind 等内部键），整体镜像到稳定 reactive 对象
  const config = reactive<Record<string, unknown>>({})
  watchEffect(() => {
    const { props = {}, ...rest } = (context as any)?.attrs || {}
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
    return out
  })

  // bind：绑定代码（onClick/onInput/onChange...），原 node.props.__bind 现位于 config.__bind
  const bind = computed<Record<string, unknown>>(() =>
    typeof config.__bind === 'object' && config.__bind
      ? (config.__bind as Record<string, unknown>)
      : {},
  )

  return { config, props, bind }
}
