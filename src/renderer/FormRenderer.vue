<script setup lang="ts">
import type { Component, DefineComponent } from 'vue'
import { computed, provide, ref, watch } from 'vue'
import type { FormKitNode, FormKitSchemaFormKit } from '@formkit/core'
import { createMessage } from '@formkit/core'
import { FormKit, changeLocale } from '@formkit/vue'
import FormKitSchemaWrapper from './FormKitSchemaWrapper.vue'
import { NButton, type ConfigProviderProps } from 'naive-ui'
import createFormattedSchema from '@/utils/format-schema'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { createSchemaProjector } from '@/dsl'
import { ensureDslKeys } from '@/dsl/keys'
import { snapshotDeep, shareStructure } from '@/utils/structural-share'
import { getSingleNodeSchemaArray } from '@/utils/canvas-schema'
import type { FormDefinition } from '@/types/dsl'
import type { BuilderTheme } from '@/types/theme'
import type { FormBuilderConfig } from '@/types/env'
import { useRuntimeLocale, provideRuntimeLocale } from '@/i18n/runtime-locale'
import { useFormBuilderI18n, provideFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderConfig, provideFormBuilderConfig } from '@/composables/use-config'
import { registerElements } from '@/plugin/register-element'
import BuilderThemeScope from '@/theme/BuilderThemeScope.vue'
import { provideFormDefinition } from '@/composables/use-form-definition'
import { runBindCode } from '@/utils/bind-runtime'
import { provideBinderHttp } from '@/composables/use-bind-http'
import { createSchemaRenderData, PREVIEW_FORM_DATA_KEY } from '@/composables/use-schema-render-data'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { useExprRun } from '@/expression/runtime'
import type { SchemaNode } from '@/utils/schema/types'
import { DEFAULT_LABEL_WIDTH, formLabelLayoutClass, formLabelWidthStyle } from '@/utils/form-layout'

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
type FormActionsScope = {
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

// 兜底定义：仅以 schema 输入（无 definition）渲染时的表单级元信息
const FALLBACK_RENDER_DEFINITION: FormDefinition = {
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
  settings: { labelWidth: DEFAULT_LABEL_WIDTH, labelAlign: 'top' },
}

// 表单定义窄上下文：一次性 provide 一个稳定的 ref，definition 变化时同步改它的值。
// 不能每次 provide 新 ref（provide 只捕获 setup 快照），否则后续 definition 编辑
// 不会反映到 useFormDefinition（字段 bind 的 id / version / name 会读到旧值）。
const renderDefinition = ref<FormDefinition>(
  props.definition ? props.definition : FALLBACK_RENDER_DEFINITION,
)
watch(
  () => props.definition,
  (def) => {
    // 外部（设计器之外）直接喂给 FormRenderer 的定义可能没经过设计器的 ensureDslKeys
    // 规范化，缺 settings 时 buildSchema 读 settings.labelAlign 会抛错——这里统一兜底，
    // 与设计器共用同一份默认值（见 H2：定义进入设计器/渲染器的入口统一补默认设置）。
    if (def) renderDefinition.value = ensureDslKeys(def)
  },
  { immediate: true },
)

provideFormDefinition(renderDefinition)

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

const data = ref<ModelValue>({})

// 本组件实例的增量转换投影：按 DSL 节点身份缓存，definition 未改动的子树复用
// 上次的 schema 对象引用（见下方 definitionSnapshot 的追踪机制）
const schemaProjector = createSchemaProjector()

// definition 快照：snapshotDeep 通过响应式代理读取（不 toRaw），因此外部把 definition
// 包进 reactive() 并原地修改嵌套字段时，这个 computed 能追踪到并重新求值；
// shareStructure 把新快照与上一次的快照结构共享，没变的子树复用上次快照的对象引用——
// 这样 schemaProjector 按节点身份的缓存才能在“原地修改”的场景下继续增量命中
// （见 src/utils/structural-share.ts 顶部注释，修复 B 引入的回归）。
// prevDefinitionSnapshot 用普通变量保存上次结果，不是 ref：它只是 shareStructure 的
// 输入，不需要响应式。
let prevDefinitionSnapshot: FormDefinition | undefined
const definitionSnapshot = computed<FormDefinition | undefined>(() => {
  const snapshot = snapshotDeep(props.definition)
  // 外部定义可能缺 settings（类型必填，运行时不保证）：与设计器共用同一份兜底
  // （见 H2），避免 buildSchema 读 settings.labelAlign 时抛错
  const next = snapshot ? ensureDslKeys(snapshot) : snapshot
  const shared = shareStructure(prevDefinitionSnapshot, next)
  prevDefinitionSnapshot = shared
  return shared
})

// props.schema（裸 schema 通道）同样做快照 + 结构共享，原因同上
let prevSchemaPropSnapshot: FormKitSchemaFormKit[] | undefined
const schemaPropSnapshot = computed<FormKitSchemaFormKit[] | undefined>(() => {
  const next = snapshotDeep(props.schema)
  const shared = shareStructure(prevSchemaPropSnapshot, next)
  prevSchemaPropSnapshot = shared
  return shared
})

// definition / schema 二选一：优先 definition（版本化 DSL），内部转 schema。
let warnedBoth = false
const sourceSchema = computed<FormKitSchemaFormKit[]>(() => {
  if (props.definition) {
    if (props.schema && Array.isArray(props.schema) && !warnedBoth) {
      warnedBoth = true
      console.warn('[FormRenderer] both "definition" and "schema" provided — using "definition"')
    }
    const toSchema =
      props.dataStructure === 'nested' ? schemaProjector.toOutputSchema : schemaProjector.toSchema
    try {
      const next = toSchema(definitionSnapshot.value as FormDefinition)
      return Array.isArray(next) ? next : []
    } catch (e) {
      console.error('[FormRenderer] dslToSchema failed', e)
      return []
    }
  }
  return Array.isArray(schemaPropSnapshot.value)
    ? (schemaPropSnapshot.value as FormKitSchemaFormKit[])
    : []
})

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

// 传给顶层 FormKitSchema 的 data：表单数据 + 表达式 helper（helper 优先），
// 具体的 Proxy 逻辑（挡 slots 写入 + get 陷阱）见 use-schema-render-data.ts 的注释。
const schemaRenderData = createSchemaRenderData(data)

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

const formWrapper = computed<SchemaNode | null>(() => {
  const only = sourceSchema.value.length === 1 ? sourceSchema.value[0] : null
  if (!only || typeof only !== 'object') return null
  if (only.$formkit !== 'form') return null
  if (!Array.isArray(only.children)) return null
  return only
})

const schemaBody = computed<FormKitSchemaFormKit[]>(() => {
  if (formWrapper.value) return formWrapper.value.children as FormKitSchemaFormKit[]
  return sourceSchema.value
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
  return DEFAULT_LABEL_WIDTH
})

// 与画布共用同一套标签布局类（见 utils/form-layout）；formClass prop 仍拼在最前面
const resolvedFormClass = computed(() =>
  [props.formClass, formLabelLayoutClass(resolvedLabelPosition.value)].join(' '),
)

const formattedSchema = createFormattedSchema(schemaBody)
const resolvedSchema = formattedSchema

// D4：按顶层节点拆分渲染，每个顶层节点各自一个 FormKitSchemaWrapper（而不是整份
// resolvedSchema 交给一个 FormKitSchemaWrapper）。FormKitSchema 对 schema prop 是
// deep watch，一旦引用/内容变化就整棵重新 parseSchema + 换新 instanceKey，所有字段
// 组件重建（见 node_modules/@formkit/vue/dist/index.mjs 的 FormKitSchema 实现）；
// 拆开后，未改动的顶层节点其 formatOne 结果 === 上次（D3），getSingleNodeSchemaArray
// 按节点身份缓存的单元素数组同样 === 上次，那个 FormKitSchemaWrapper 的 schema prop
// 引用不变，FormKit 就不会重新解析/重建它旗下的字段；只有真正变化的顶层节点会被
// 重新解析。key 优先用 __key（画布 DnD 身份），没有则退化到 name/index——保证顶层
// 节点顺序变化（删除/插入）时 Vue 按身份复用组件实例，FormKit 内部节点不会因为
// v-for 位置错位而串值。
// key 取格式化前源节点的 DSL id（formkit 节点在顶层 id，$cmp 节点在 props.id）：id 恒有
// 且稳定——缺 key 的定义载入设计器后补齐的 __key 正是复用 id（见 dsl/keys.ts），用 __key
// 的话同一个节点会在"补齐前后"换 key、整批重建。格式化结果里普通字段不再携带 __key、
// 容器被包成无 name 的 $el 节点，所以不能直接用格式化结果；兜底 __key/name/index，
// 重复时追加下标保证唯一
const topLevelSchemaItems = computed(() => {
  const seen = new Set<string>()
  return resolvedSchema.value.map((node: SchemaNode, index: number) => {
    const source = schemaBody.value[index] as SchemaNode | undefined
    const sourceId = source?.id ?? source?.props?.id
    let key =
      (typeof sourceId === 'string' && sourceId) ||
      (typeof source?.__key === 'string' && source.__key) ||
      (typeof node?.name === 'string' && node.name) ||
      `__idx_${index}`
    if (seen.has(key)) key = `${key}__${index}`
    seen.add(key)
    return { key, schemaArr: getSingleNodeSchemaArray(node) as FormKitSchemaFormKit[] }
  })
})

// 注入当前表单数据（dataTable 远程数据 JS 代码通过 form 读取当前值；容器组件的
// 嵌套 FormKitSchema 也用它拼出各自的 schemaRenderData，见 useSchemaRenderData）
provide(PREVIEW_FORM_DATA_KEY, data)

// 注入 JS 绑定代码用的 HTTP 实例：用户 http prop > config.http > 外层注入 > 内置 axios
provideBinderHttp(computed(() => props.http ?? config?.http))

// list/card/inputGroup/buttonGroup/tabs 容器预览的增删行交互开关（ListContainerPreview
// 等组件 inject 读取），仅此一处控制，不涉及节点结构改写
provide('previewListInteractive', props.interactiveContainers)

// ── 操作区：submit / reset 经 FormKit 组件实例（expose 了 node）触发 ──
// FormKit 组件实例 expose 的是完整 FormKitNode（submit/reset 只是 formNode 用到的子集，
// 下面的 input 订阅还要用到 value/on/off，按完整类型声明，两处共用同一个 ref）
type FormKitInstance = {
  node?: FormKitNode
}

const formKitRef = ref<FormKitInstance | null>(null)

// 订阅 FormKit form node 的 input 事件获取实时字段值，含表达式字段
watch(
  () => formKitRef.value?.node,
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
    // node.off 只接受 on() 返回的 receipt（运行时实现是 off(node, ctx, receipt) →
    // _e.off(receipt)，多余参数会被直接丢弃）。此前写成 off('input', sync)，receipt
    // 匹配不到任何订阅，监听器实际从未被移除——表单节点每次重建都会再挂一个，旧的
    // 继续跟着老 node 跑。这里改为保存 receipt 再注销。
    const receipt = node.on('input', sync)
    onCleanup(() => node.off(receipt))
  },
  { immediate: true },
)

const formNode = computed(() => formKitRef.value?.node ?? null)

// 表达式运行时：扫描 schema 中带 expr 的字段，依赖变化时求值并写入 FormKit node
useExprRun(data, resolvedSchema, () => formNode.value)

/** 提交表单（未填必填校验时不触发 submit 事件） */
const submit = () => formNode.value?.submit?.()
/** 重置表单到初始值 */
const reset = () => formNode.value?.reset?.()

/**
 * 校验表单：触发并展示校验错误，返回是否全部通过。
 * 对齐 FormKit 提交流程（标记 submitted + 等待 settle / 异步校验），但不触发 submit 事件。
 */
const validate = async (): Promise<boolean> => {
  const node = formNode.value
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
  // FormKit 传出的是它自己节点树的活值对象，直接 delete 会改写 FormKit 的内部状态；
  // 浅拷贝一份，对外 emit / 传给 runBindCode 的都用这份拷贝，不碰 FormKit 的原对象。
  const payload = { ...formData }
  delete payload.slots
  const submitCode = props.definition?.settings?.submit
  if (typeof submitCode === 'string' && submitCode.trim()) {
    await runBindCode(
      submitCode,
      undefined,
      { form: payload },
      {
        id: props.definition?.id,
        version: props.definition?.version,
        name: props.definition?.name,
      },
      undefined,
      props.http ?? config?.http ?? axios,
    )
    return
  }
  emit('submit', payload, props.definition?.id, props.definition?.version)
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
      :style="formLabelWidthStyle(resolvedLabelWidth)"
    >
      <FormKitSchemaWrapper
        v-for="item in topLevelSchemaItems"
        :key="item.key"
        :schema="item.schemaArr"
        :data="schemaRenderData"
        :library="schemaLibrary"
      />
      <template v-if="$slots.actions">
        <slot
          name="actions"
          :submit="submit"
          :reset="reset"
          :loading="loading"
          :disabled="disabled"
        />
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
