<script setup lang="ts">
import type { Component, DefineComponent } from 'vue'
import { computed, provide, ref, watch } from 'vue'
import type { FormKitNode, FormKitSchemaFormKit } from '@formkit/core'
import { createMessage } from '@formkit/core'
import { FormKit, changeLocale } from '@formkit/vue'
import FormKitSchemaWrapper from './FormKitSchemaWrapper.vue'
import { NButton, type ConfigProviderProps } from 'naive-ui'
import createFormattedSchema from '@/utils/format-schema'
import { collectSchemaNames, generateKey, toSafeName } from '@/utils/dnd/schema'
import { getContainerKind } from '@/utils/schema/containers'
import { getContainerSpec } from '@/elements/container-spec'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { dslToOutputSchema, dslToSchema } from '@/dsl'
import type { FormDefinition } from '@/types/dsl'
import type { BuilderTheme } from '@/types/theme'
import type { FormBuilderConfig } from '@/types/env'
import { useRuntimeLocale, provideRuntimeLocale } from '@/i18n/runtime-locale'
import { useFormBuilderI18n, provideFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderConfig, provideFormBuilderConfig } from '@/composables/use-config'
import { registerElements } from '@/plugin/register-element'
import BuilderThemeScope from '@/theme/BuilderThemeScope.vue'
import {
  provideFormBuilderState,
  createMinimalFormBuilderState,
  type FormBuilderState,
} from '@/state/create-form-builder-state'
import { runBindCode } from '@/utils/bind-runtime'
import { provideBinderHttp } from '@/composables/use-bind-http'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { useExprRun } from '@/expression/runtime'

type ModelValue = Record<string, unknown>

// 对齐 BuilderMain：按配置的语言/兜底解析初始 locale
const resolveInitialLocale = (cfg: FormBuilderConfig | undefined): string => {
  const available = cfg?.availableLocales ?? ['zh-CN', 'en']
  const fallback = cfg?.localeFallback ?? 'zh-CN'
  return available.includes(cfg?.locale ?? '') ? cfg!.locale! : fallback
}

// FormKit 是泛型组件（props 为所有输入类型的大联合），dts 打包时无法命名其推断类型
// （TS2883/TS7056）。这里显式收敛为本组件实际用到的 props 类型，与 FormKitSchemaWrapper 同套路。
type FormKitTypedProps = {
  type?: string
  name?: string
  actions?: boolean
  formClass?: string
  disabled?: boolean
  modelValue?: ModelValue
  'onUpdate:modelValue'?: (value: ModelValue) => void
  onSubmit?: (formData: ModelValue) => void
}
const FormKitTyped = FormKit as DefineComponent<FormKitTypedProps>

/** #actions 槽作用域：可由外部自定义操作区按钮，复用表单提交/重置 */
export type FormActionsScope = {
  submit: () => void
  reset: () => void
  loading: boolean
  disabled: boolean
}

const props = withDefaults(
  defineProps<
    {
      /** 主输入：版本化 DSL 表单定义（设计器导出的 JSON），内部 dslToSchema 转换 */
      definition?: FormDefinition
      /** 备选输入：裸 FormKit schema 数组（灵活通道）；与 definition 同传时优先 definition */
      schema?: FormKitSchemaFormKit[]
      /** 有 definition 时的数据输出结构：flat 扁平 | nested 容器转 group 嵌套 */
      dataStructure?: 'flat' | 'nested'
      modelValue?: ModelValue
      /** 渲染默认操作区（提交/重置两按钮）；false 则不显示，配合 #actions 槽自定义 */
      actions?: boolean
      /** 默认提交按钮文案（缺省 i18n：提交 / Submit） */
      submitLabel?: string
      /** 默认重置按钮文案（缺省 i18n：重置 / Reset） */
      resetLabel?: string
      /** 默认提交按钮透传属性（naive NButton props） */
      submitAttrs?: Record<string, unknown>
      /** 默认重置按钮透传属性（naive NButton props） */
      resetAttrs?: Record<string, unknown>
      /** 默认操作区按钮对齐方式 */
      actionsJustify?: 'start' | 'center' | 'end' | 'space-between'
      formClass?: string
      formName?: string
      labelPosition?: 'top' | 'left'
      labelWidth?: number
      schemaLibrary?: Record<string, Component>
      interactiveContainers?: boolean
      /** 本实例配置；传了则自给（registerElements + provide + locale/i18n），不传回落外层 Builder/BuilderProvider 注入 */
      config?: FormBuilderConfig
      /** 自定义主题：内部映射到 naive-ui 的 darkTheme / lightTheme；缺省自动跟随系统 */
      theme?: BuilderTheme
      /** 自定义 HTTP 请求库实例：供 JS 绑定代码里的 axios 变量使用；缺省使用内置 axios */
      http?: AxiosInstance
      /** 禁用整个表单（所有输入 + 操作区按钮）；缺省 false */
      disabled?: boolean
    } & Omit<Partial<ConfigProviderProps>, 'theme'>
  >(),
  {
    dataStructure: 'flat',
    actions: false,
    actionsJustify: 'start',
    formClass: 'w-full !grid !grid-cols-12 gap-x-4 gap-y-2',
    interactiveContainers: true,
    disabled: false,
  },
)

const builderState = computed<FormBuilderState>(() => {
  if (props.definition) {
    return createMinimalFormBuilderState(props.definition)
  }
  // 兜底：创建一个默认定义
  return createMinimalFormBuilderState({
    version: 2,
    id: 'default-form',
    name: 'form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [],
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
  })
})

provideFormBuilderState(builderState.value)

defineSlots<{
  /** 自定义操作区（覆盖默认提交/重置两按钮）。作用域提供 submit / reset / loading */
  actions?: (props: FormActionsScope) => unknown
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelValue): void
  (e: 'submit', formData: ModelValue, id: string | undefined, version: number | undefined): void
}>()

// ── 配置：prop 优先，否则回落注入（BuilderProvider / 外层 Builder 提供）──
const injectedCfg = useFormBuilderConfig()
if (props.config) {
  registerElements(props.config.elements)
  provideFormBuilderConfig(props.config)
}
const config = (props.config ?? injectedCfg) as FormBuilderConfig
const hasOwnConfig = Boolean(props.config)

// ── locale：自带 config（自包含渲染）时自建运行时代码；否则继承所在实例注入，缺省 zh-CN ──
const runtimeLocale = hasOwnConfig
  ? provideRuntimeLocale({
      initialLocale: resolveInitialLocale(config),
      availableLocales: config?.availableLocales ?? ['zh-CN', 'en'],
      localeFallback: config?.localeFallback ?? 'zh-CN',
    })
  : useRuntimeLocale()
const resolvedNaiveLocale = computed(() => props.locale ?? runtimeLocale.naiveLocale.value)
const resolvedNaiveDateLocale = computed(
  () => props.dateLocale ?? runtimeLocale.naiveDateLocale.value,
)

// 同步 FormKit 全局语言（提交按钮 / 校验文案），与 BuilderMain 同一套逻辑
watch(
  () => runtimeLocale.locale.value,
  (next) => {
    changeLocale(next === 'en' ? 'en' : 'zh')
  },
  { immediate: true },
)

// 自带 config 时自包含 i18n（对齐 BuilderMain）；否则沿用外层注入
if (hasOwnConfig) {
  provideFormBuilderI18n({
    locale: computed(() => runtimeLocale.locale.value),
    localeFallback: computed(() => runtimeLocale.localeFallback.value),
    messages: computed(() => config?.messages as Record<string, any> | undefined),
  })
}

const { t } = useFormBuilderI18n()

const safeClone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const internalSchema = ref<FormKitSchemaFormKit[]>([])
const data = ref<ModelValue>({})
const listItemSeq = ref<Record<string, number>>({})

// definition / schema 二选一：优先 definition（版本化 DSL），内部转 schema。
let warnedBoth = false
const sourceSchema = computed<FormKitSchemaFormKit[]>(() => {
  if (props.definition) {
    if (props.schema && Array.isArray(props.schema) && !warnedBoth) {
      warnedBoth = true
      console.warn('[FormRenderer] both "definition" and "schema" provided — using "definition"')
    }
    const toSchema = props.dataStructure === 'nested' ? dslToOutputSchema : dslToSchema
    try {
      const next = toSchema(props.definition)
      return Array.isArray(next) ? next : []
    } catch (e) {
      console.error('[FormRenderer] dslToSchema failed', e)
      return []
    }
  }
  return Array.isArray(props.schema) ? props.schema : []
})

watch(
  sourceSchema,
  (next) => {
    internalSchema.value = safeClone(Array.isArray(next) ? next : [])
    listItemSeq.value = {}
  },
  { immediate: true, deep: true },
)

watch(
  () => props.modelValue,
  (next) => {
    if (!next) return
    if (next === data.value) return
    data.value = safeClone(next)
  },
  { immediate: true, deep: true },
)

watch(
  data,
  (next) => {
    emit('update:modelValue', next)
  },
  { deep: true },
)

// FormKitSchema 渲染上下文会把内部 slots 写进传入的 data 对象（Object.assign(reactive(data), { slots })），
// 而这里 data 同时是表单 v-model 的数据源，slots 会因此泄漏进表单值（结构里多出 slots:{}）。
// 给 FormKitSchema 传一个挡住 slots 写入的代理，阻断泄漏源头。
const schemaRenderData = computed<Record<string, unknown>>(() => {
  const base = data.value as Record<string, unknown>
  if (!base || typeof base !== 'object') return {}
  return new Proxy(base, {
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

// 表单 v-model 回写同样会带 slots（FormKit 节点值内部合并了 __slots），在这里统一剥离
const onFormModelValueUpdate = (value: ModelValue) => {
  if (!value || typeof value !== 'object') return
  const next: ModelValue = {}
  for (const key of Object.keys(value)) {
    if (key === 'slots') continue
    next[key] = value[key]
  }
  data.value = next
}

const schemaLibrary = computed<Record<string, Component>>(() => {
  if (props.schemaLibrary) return props.schemaLibrary
  return getPreviewSchemaLibrary()
})

const formWrapper = computed<any | null>(() => {
  const only = internalSchema.value.length === 1 ? (internalSchema.value[0] as any) : null
  if (!only || typeof only !== 'object') return null
  if (only.$formkit !== 'form') return null
  if (!Array.isArray(only.children)) return null
  return only
})

const schemaBody = computed<FormKitSchemaFormKit[]>(() => {
  if (formWrapper.value) return formWrapper.value.children as FormKitSchemaFormKit[]
  return internalSchema.value
})

const resolvedFormName = computed(() => {
  const fromSchema = formWrapper.value?.name
  if (typeof fromSchema === 'string' && fromSchema.trim()) return fromSchema
  const fromProps = props.formName
  if (typeof fromProps === 'string' && fromProps.trim()) return fromProps
  return undefined
})

const resolvedLabelPosition = computed<'top' | 'left'>(() => {
  const fromSchema = formWrapper.value?.props?.labelPosition
  if (fromSchema === 'left' || fromSchema === 'top') return fromSchema
  return props.labelPosition === 'left' ? 'left' : 'top'
})

const resolvedLabelWidth = computed<number>(() => {
  const fromSchema = Number(formWrapper.value?.props?.labelWidth)
  if (Number.isFinite(fromSchema)) return fromSchema
  const fromProps = Number(props.labelWidth)
  if (Number.isFinite(fromProps)) return fromProps
  return 80
})

const resolvedFormClass = computed(() => {
  const base = props.formClass
  const common = ['[&_.formkit-label]:text-xs', '[&_.formkit-label]:font-bold'].join(' ')
  if (resolvedLabelPosition.value === 'left') {
    return [
      base,
      common,
      'fk-label-left',
      '[&_.formkit-wrapper]:flex',
      '[&_.formkit-wrapper]:flex-row',
      '[&_.formkit-wrapper]:items-start',
      '[&_.formkit-wrapper]:gap-3',
      '[&_.formkit-label]:mb-0',
      '[&_.formkit-label]:w-[var(--fk-label-width)]',
      '[&_.formkit-label]:shrink-0',
      '[&_.formkit-label]:pt-1',
      '[&_.formkit-inner]:flex-1',
      '[&_.formkit-inner]:min-w-0',
    ].join(' ')
  }
  return [base, common].join(' ')
})

const formattedSchema = createFormattedSchema(schemaBody)
const resolvedSchema = formattedSchema

type Found = { node: FormKitSchemaFormKit; path: number[] } | null

const findSchemaNodeByKey = (schema: any[], key: string, path: number[] = []): Found => {
  for (let i = 0; i < schema.length; i++) {
    const node = schema[i]
    if (!node || typeof node !== 'object') continue
    const nextPath = [...path, i]
    if ((node as any).__key === key) return { node, path: nextPath }
    const children = (node as any)?.children
    if (Array.isArray(children)) {
      const found = findSchemaNodeByKey(children, key, [...nextPath, -1])
      if (found) return found
    }
  }
  return null
}

const normalizePath = (path: number[]) => path.filter((p) => p !== -1)

const getParentArrayAtPath = (schema: any[], path: number[]) => {
  const p = normalizePath(path)
  if (p.length === 0) return null
  if (p.length === 1) return { parentArr: schema, index: p[0]!, parentNode: null as any }
  let cursor: any = schema[p[0]!]
  for (let i = 1; i < p.length - 1; i++) {
    cursor = cursor?.children?.[p[i]!]
  }
  const parentArr = Array.isArray(cursor?.children) ? cursor.children : null
  return parentArr ? { parentArr, index: p[p.length - 1]!, parentNode: cursor } : null
}

const updateAtPath = (schema: any[], path: number[], nextNode: any): any[] => {
  const p = normalizePath(path)
  if (p.length === 0) return schema
  const nextSchema = [...schema]
  const idx0 = p[0]!
  if (p.length === 1) {
    nextSchema[idx0] = nextNode
    return nextSchema
  }
  const parent = { ...(nextSchema[idx0] as any) }
  let cursor: any = parent
  for (let i = 1; i < p.length - 1; i++) {
    const idx = p[i]!
    const arr = Array.isArray(cursor.children) ? [...cursor.children] : []
    const child = { ...(arr[idx] as any) }
    arr[idx] = child
    cursor.children = arr
    cursor = child
  }
  const lastIdx = p[p.length - 1]!
  const lastArr = Array.isArray(cursor.children) ? [...cursor.children] : []
  lastArr[lastIdx] = nextNode
  cursor.children = lastArr
  nextSchema[idx0] = parent
  return nextSchema
}

const removeAtPath = (schema: any[], path: number[]) => {
  const info = getParentArrayAtPath(schema, path)
  if (!info) return schema
  const { parentArr, index, parentNode } = info
  const nextArr = parentArr.filter((_: any, i: number) => i !== index)
  if (!parentNode) return nextArr
  const nextParent = { ...(parentNode as any), children: nextArr }
  return updateAtPath(schema, path.slice(0, -1), nextParent)
}

const insertAfterAtPath = (schema: any[], path: number[], nextNode: any) => {
  const info = getParentArrayAtPath(schema, path)
  if (!info) return schema
  const { parentArr, index, parentNode } = info
  const nextArr = [...parentArr]
  nextArr.splice(index + 1, 0, nextNode)
  if (!parentNode) return nextArr
  const nextParent = { ...(parentNode as any), children: nextArr }
  return updateAtPath(schema, path.slice(0, -1), nextParent)
}

const canonicalBaseName = (value: unknown) => {
  const safe = toSafeName(value)
  const match = safe.match(/^(.*_\d+)_\d+$/)
  return match?.[1] || safe
}

const isStructureNode = (node: any) => {
  const kind = getContainerKind(node)
  if (kind) return true
  return ['group'].includes(String(node?.$formkit ?? ''))
}

const collectLeafBases = (node: any, bases: Set<string>) => {
  if (!node || typeof node !== 'object') return
  if (!isStructureNode(node) && node.$formkit !== 'submit') {
    const rawName = node.name || node.$formkit || node.$cmp || 'field'
    const base = canonicalBaseName(rawName)
    if (base) bases.add(base)
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) collectLeafBases(c, bases)
  }
}

const cloneNodeWithFreshIdentity = (node: any, existingNames: Set<string>, listSuffix: number) => {
  if (!node || typeof node !== 'object') return node
  const nextKey = generateKey()
  const next: any = { ...node, __key: nextKey }
  const kind = getContainerKind(node)
  if (node.$formkit !== 'submit') {
    if (!isStructureNode(node)) {
      const rawName = node.name || node.$formkit || node.$cmp || 'field'
      const base = canonicalBaseName(rawName)
      let candidate = listSuffix > 0 ? `${base}_${listSuffix}` : base
      let i = 1
      while (existingNames.has(candidate)) {
        candidate = `${base}_${listSuffix}_${i}`
        i++
      }
      next.name = candidate
      existingNames.add(candidate)
      existingNames.add(toSafeName(candidate))
    }
    next.id = `field_${nextKey}`
  }
  if (Array.isArray(node.children)) {
    next.children = node.children.map((c: any) =>
      cloneNodeWithFreshIdentity(c, existingNames, listSuffix),
    )
  }
  if (kind) {
    const baseProps = typeof next.props === 'object' && next.props ? next.props : {}
    // 按容器规格注入各自的 keyProp（listKey/cardKey/inputGroupKey/buttonGroupKey/tabsKey），
    // 修复旧实现把 cardKey 误写进 inputGroup/buttonGroup/tabs 的问题
    const spec = getContainerSpec(node.$cmp ?? node.$formkit)
    if (spec && spec.primitive === 'cmp') {
      next.props = {
        ...baseProps,
        [spec.keyProp]: nextKey,
        modelValue: Array.isArray(next.children) ? next.children : [],
      }
    } else {
      // group 预览为原生 $formkit: 'group'，无需容器 key；只更新 children 即可
      next.props = baseProps
    }
  }
  return next
}

const eachField = (schema: FormKitSchemaFormKit[], fn: (field: any) => void) => {
  for (const field of schema) {
    fn(field)
    const children = (field as any)?.children
    if (Array.isArray(children)) eachField(children as FormKitSchemaFormKit[], fn)
  }
}

const collectSchemaNamesSafe = (schema: FormKitSchemaFormKit[], names: Set<string>) => {
  collectSchemaNames(schema, names)
  eachField(schema, (field) => {
    const raw = field?.name
    if (typeof raw !== 'string' || !raw) return
    names.add(toSafeName(raw))
  })
}

// 注入当前表单数据（dataTable 远程数据 JS 代码通过 form 读取当前值）
provide('previewFormData', data)

// 注入 JS 绑定代码用的 HTTP 实例：用户 http prop > config.http > 外层注入 > 内置 axios
provideBinderHttp(computed(() => props.http ?? config?.http))

provide('previewListInteractive', props.interactiveContainers)

provide('previewListDuplicate', (key: string) => {
  if (!props.interactiveContainers) return
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return
  const existingNames = new Set<string>()
  collectSchemaNamesSafe(internalSchema.value as any, existingNames)
  const bases = new Set<string>()
  collectLeafBases(found.node as any, bases)
  let nextSuffix = (listItemSeq.value[key] ?? 0) + 1
  const isFree = (suffix: number) => {
    for (const base of bases) {
      const candidate = `${base}_${suffix}`
      if (existingNames.has(candidate) || existingNames.has(toSafeName(candidate))) return false
    }
    return true
  }
  while (!isFree(nextSuffix)) nextSuffix++
  listItemSeq.value = { ...listItemSeq.value, [key]: nextSuffix }
  const cloned = cloneNodeWithFreshIdentity(safeClone(found.node as any), existingNames, nextSuffix)
  internalSchema.value = insertAfterAtPath(internalSchema.value as any[], found.path, cloned) as any
})

provide('previewListIsLast', (key: string) => {
  if (!props.interactiveContainers) return true
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return true
  const info = getParentArrayAtPath(internalSchema.value as any[], found.path)
  if (!info) return true
  const { parentArr } = info
  const last = [...parentArr]
    .reverse()
    .find((n: any) => getContainerKind(n) === 'list' && (n as any)?.__preview_placeholder !== true)
  if (!last) return true
  return (last as any).__key === key
})

provide('previewListRemove', (key: string) => {
  if (!props.interactiveContainers) return
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return
  const hasOtherList = (() => {
    const walk = (nodes: any[]): boolean => {
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        if (
          getContainerKind(node) === 'list' &&
          node.__key !== key &&
          (node as any).__preview_placeholder !== true
        )
          return true
        const children = (node as any)?.children
        if (Array.isArray(children) && walk(children)) return true
      }
      return false
    }
    return walk(internalSchema.value as any[])
  })()

  if (!hasOtherList) {
    const current: any = found.node as any
    const nextNode: any = { ...current, __preview_placeholder: true }
    internalSchema.value = updateAtPath(internalSchema.value as any[], found.path, nextNode) as any
    return
  }

  internalSchema.value = removeAtPath(internalSchema.value as any[], found.path) as any
})

provide('previewListRestore', (key: string) => {
  if (!props.interactiveContainers) return
  const found = findSchemaNodeByKey(internalSchema.value as any[], key)
  if (!found) return
  const current: any = found.node as any
  const { __preview_placeholder, ...rest } = current
  const nextNode: any = {
    ...rest,
    children: Array.isArray(current.children) ? current.children : [],
  }
  internalSchema.value = updateAtPath(internalSchema.value as any[], found.path, nextNode) as any
})

// ── 操作区：submit / reset 经 FormKit 组件实例（expose 了 node）触发 ──
type FormKitInstance = {
  node?: {
    submit?: () => void
    reset?: () => void
  }
}

const formKitRef = ref<FormKitInstance | null>(null)

// 订阅 FormKit form node 的 input 事件获取实时字段值，含表达式字段
watch(
  () => (formKitRef.value as any)?.node,
  (node, _prev, onCleanup) => {
    if (!node) return
    const sync = () => {
      const raw = node.value as Record<string, unknown> | undefined
      if (!raw || typeof raw !== 'object') return
      const next: Record<string, unknown> = {}
      let changed = false
      for (const key of Object.keys(raw)) {
        if (key === 'slots') continue
        const val = raw[key]
        next[key] = val
        if (data.value[key] !== val) changed = true
      }
      for (const key of Object.keys(data.value)) {
        if (!(key in next) && key !== 'slots') {
          changed = true
          break
        }
      }
      if (changed) data.value = next
    }
    node.on('input', sync)
    onCleanup(() => node.off('input', sync))
  },
  { immediate: true },
)

const formNode = computed(() => {
  const inst = formKitRef.value as { node?: { submit?: () => void; reset?: () => void } } | null
  return inst?.node ?? null
})

// 表达式运行时：扫描 schema 中带 expr 的字段，依赖变化时求值并写入 FormKit node
useExprRun(data, resolvedSchema, () => formNode.value as any)

/** 提交表单（未填必填校验时不触发 submit 事件） */
const submit = () => formNode.value?.submit?.()
/** 重置表单到初始值 */
const reset = () => formNode.value?.reset?.()

/**
 * 校验表单：触发并展示校验错误，返回是否全部通过。
 * 对齐 FormKit 提交流程（标记 submitted + 等待 settle / 异步校验），但不触发 submit 事件。
 */
const validate = async (): Promise<boolean> => {
  const node = formNode.value as FormKitNode | null
  if (!node) return true
  // 标记 submitted，使校验消息对用户可见（FormKit 提交流程同款行为）
  const setSubmitted = (n: FormKitNode) => {
    n.store.set(createMessage({ key: 'submitted', value: true, visible: false }))
  }
  node.walk(setSubmitted)
  setSubmitted(node)
  await node.settled
  if (node.ledger.value('validating')) {
    await node.ledger.settled('validating')
  }
  return !node.ledger.value('blocking')
}

const loading = ref(false)

// ── 提交：优先执行 settings.submit 自定义逻辑（经 dslToSchema 写入表单节点 props），
//    再对外触发 submit 事件；异步逻辑期间 loading 置位，驱动操作区按钮 loading 态 ──
const handleSubmit = async (formData: Record<string, unknown>) => {
  delete formData.slots
  const submitCode = props.definition?.settings?.submit
  if (typeof submitCode === 'string' && submitCode.trim()) {
    await runBindCode(
      submitCode,
      undefined,
      { form: formData },
      props.definition?.id,
      props.definition?.version,
      undefined,
      props.http ?? config?.http ?? axios,
    )
    return
  }
  emit('submit', formData, props.definition?.id, props.definition?.version)
}

defineExpose({ submit, reset, validate, loading })

const resolvedSubmitLabel = computed(() => props.submitLabel ?? t('elements.submit.label'))
const resolvedResetLabel = computed(() => props.resetLabel ?? t('elements.reset.label'))
</script>

<template>
  <BuilderThemeScope
    :theme="props.theme"
    :locale="resolvedNaiveLocale"
    :date-locale="resolvedNaiveDateLocale"
    :theme-overrides="themeOverrides"
    :breakpoints="breakpoints"
    :cls-prefix="clsPrefix"
    :inline-theme-disabled="inlineThemeDisabled"
    :preflight-style-disabled="preflightStyleDisabled"
  >
    <div
      v-if="props.schema?.[0]?.name"
      class="flex flex-row items-center justify-center gap-1 px-1 pb-3"
    >
      <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span class="i-lucide-file-text h-5 w-5 shrink-0 text-muted-foreground"></span>
        <span class="truncate text-[14px]">{{ props.schema?.[0]?.name }}</span>
      </div>
      <span
        v-if="props.schema?.[0]?.props?.version"
        class="text-[11px] text-muted-foreground ml-2 mt-1"
      >
        v{{ props.schema?.[0]?.props?.version }}
      </span>
    </div>
    <FormKitTyped
      ref="formKitRef"
      type="form"
      :name="resolvedFormName"
      :actions="false"
      :disabled="disabled"
      :model-value="data"
      @update:model-value="onFormModelValueUpdate"
      @submit="handleSubmit"
      :form-class="resolvedFormClass"
      :style="{ '--fk-label-width': `${resolvedLabelWidth}px` }"
    >
      <FormKitSchemaWrapper
        :schema="resolvedSchema"
        :data="schemaRenderData"
        :library="schemaLibrary"
      />
      <template v-if="$slots.actions">
        <slot name="actions" :submit="submit" :reset="reset" :loading="loading" :disabled="disabled" />
      </template>
      <template v-else-if="actions">
        <div
          :class="[
            'col-span-12',
            'flex',
            'gap-3',
            actionsJustify === 'center'
              ? 'justify-center'
              : actionsJustify === 'end'
                ? 'justify-end'
                : actionsJustify === 'space-between'
                  ? 'justify-between'
                  : 'justify-start',
          ]"
        >
          <NButton
            type="primary"
            attr-type="submit"
            v-bind="submitAttrs ?? {}"
            :loading="loading"
            :disabled="disabled"
          >
            {{ resolvedSubmitLabel }}
          </NButton>
          <NButton v-bind="resetAttrs ?? {}" :disabled="disabled" @click="reset">{{
            resolvedResetLabel
          }}</NButton>
        </div>
      </template>
    </FormKitTyped>
  </BuilderThemeScope>
</template>
