// ═══ 字段 / 容器组件按需加载 ══════════════════════════════════════════════════════
// 背景：src/elements/formkit.ts 原先顶部静态 import 了全部字段组件，哪怕表单里只有
// 一个文本框，日期/数据表格/级联等重型组件也会跟着进首屏（见任务规格「背景」实测）。
// 这里把「哪些类型按需加载、去哪拿」收敛成一张表，并提供：
//   - createLazyComponent：把某个类型包成 defineAsyncComponent，供 formkitBindings /
//     容器预览绑定使用；
//   - preloadElementComponents / collectElementTypes：渲染前预取，避免可见的加载态
//     （FormRenderer、设计器空闲预加载都用它）。
// 只在这一个文件里维护"类型 → import()"清单，formkit.ts / canvas.ts 不再关心具体
// 是同步还是异步——按类型问这里要组件即可。
import { defineComponent, defineAsyncComponent, h, markRaw, type Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { schemaNodeToDslNode } from '../dsl'
import { useFormBuilderI18n } from '../i18n/context'
import type { FormDefinition, FormNode } from '../types/dsl'
import type { SchemaNode } from '../utils/schema/types'

type ComponentLoader = () => Promise<{ default: Component }>

// ─── 字段：按需加载（体积占比大、非每表单必用，见规格 X1）───────────────────────
// 按"用途相近"分组、各分组合成一个 chunk（elements/lazy-groups/*.ts 的桶文件），
// 而不是每个类型单独一个 import()：实测发现每个类型各自成 chunk 时，构建工具会把
// naive-ui 内部一些原本已经在首屏合并的共享小模块也拆成独立文件（首屏请求数从 54
// 涨到 106），字节数虽然更小，弱网下反而因为请求数变多而更慢。分组合并同一个 chunk
// 之后请求数明显收窄，同时仍然保留"only load what a plain form actually needs"的
// 核心收益（富文本/签名/数据表格体积大且用途独立，各自单独一个 chunk）。
const dateFamily = () => import('./lazy-groups/date-family')
const selectionFamily = () => import('./lazy-groups/selection-family')
const mediaFamily = () => import('./lazy-groups/media-family')
const miscFamily = () => import('./lazy-groups/misc-family')

const lazyFieldLoaders: Record<string, ComponentLoader> = {
  date: () => dateFamily().then((m) => ({ default: m.NaiveDatePicker })),
  naiveDateTime: () => dateFamily().then((m) => ({ default: m.NaiveDatePicker })),
  time: () => dateFamily().then((m) => ({ default: m.NaiveTimePicker })),
  naiveCascader: () => selectionFamily().then((m) => ({ default: m.NaiveCascader })),
  naiveTreeSelect: () => selectionFamily().then((m) => ({ default: m.NaiveTreeSelect })),
  naiveTransfer: () => selectionFamily().then((m) => ({ default: m.NaiveTransfer })),
  naiveMention: () => selectionFamily().then((m) => ({ default: m.NaiveMention })),
  naiveAutoComplete: () => selectionFamily().then((m) => ({ default: m.NaiveAutoComplete })),
  file: () => mediaFamily().then((m) => ({ default: m.NaiveUpload })),
  color: () => mediaFamily().then((m) => ({ default: m.NaiveColorPicker })),
  naiveAvatar: () => mediaFamily().then((m) => ({ default: m.NaiveAvatar })),
  naiveImage: () => mediaFamily().then((m) => ({ default: m.NaiveImage })),
  naiveRate: () => miscFamily().then((m) => ({ default: m.NaiveRate })),
  range: () => miscFamily().then((m) => ({ default: m.NaiveSlider })),
  naiveQrCode: () => miscFamily().then((m) => ({ default: m.NaiveQrCode })),
  naiveProgress: () => miscFamily().then((m) => ({ default: m.NaiveProgress })),
  naiveAlert: () => miscFamily().then((m) => ({ default: m.NaiveAlert })),
  naiveBackTop: () => miscFamily().then((m) => ({ default: m.NaiveBackTop })),
  // 体积大且用途独立，各自单独一个 chunk，不与上面几组合并
  richText: () => import('@/components/ui/fields/RichText.vue'),
  signature: () => import('@/components/ui/fields/SignaturePad.vue'),
}

// ─── 容器：预览版组件按需加载（画布版仍同步，见 elements/canvas.ts 顶部说明）────
const lazyContainerPreviewLoaders: Record<string, ComponentLoader> = {
  dataTable: () => import('@/components/ui/containers/data-table/DataTableContainerPreview.vue'),
}

function resolveLoader(type: string): ComponentLoader | undefined {
  return lazyFieldLoaders[type] ?? lazyContainerPreviewLoaders[type]
}

/** 某类型是否走按需加载（formkit.ts / canvas.ts 判断要不要用异步组件） */
export function hasLazyLoader(type: string): boolean {
  return Boolean(resolveLoader(type))
}

/** 全部按需加载类型（设计器空闲预加载用，一次性预热所有分组） */
export function getAllLazyElementTypes(): string[] {
  return [...Object.keys(lazyFieldLoaders), ...Object.keys(lazyContainerPreviewLoaders)]
}

// ─── 加载缓存：按类型只发起一次 import()，预加载与实际渲染共用同一个 Promise ──────
const modulePromises = new Map<string, Promise<Component>>()
const resolvedTypes = new Set<string>()

function loadOnce(type: string): Promise<Component> | undefined {
  const loader = resolveLoader(type)
  if (!loader) return undefined
  let promise = modulePromises.get(type)
  if (!promise) {
    promise = loader().then((mod) => {
      resolvedTypes.add(type)
      return mod.default
    })
    modulePromises.set(type, promise)
  }
  return promise
}

/** 类型对应的组件是否已经加载完成——渲染前用它判断"这次不用等"（见 FormRenderer）。 */
export function isTypeLoaded(type: string): boolean {
  return resolvedTypes.has(type)
}

/** 并行预加载一批元素类型；不是按需类型（始终静态加载）的直接忽略。
 *  loader 结果按类型缓存（loadOnce），重复调用同一类型不会重复发起网络请求。 */
export function preloadElementComponents(types: string[]): Promise<void> {
  return Promise.all(types.map((t) => loadOnce(t) ?? Promise.resolve(undefined))).then(
    () => undefined,
  )
}

// ─── 加载失败占位：一行 muted 文字，不让整个表单崩掉 ─────────────────────────────
const LazyLoadErrorPlaceholder = markRaw(
  defineComponent({
    name: 'LazyLoadErrorPlaceholder',
    setup() {
      const { t } = useFormBuilderI18n()
      return () =>
        h('div', { class: 'text-xs text-muted-foreground py-1' }, t('elements.common.loadError'))
    },
  }),
)

const asyncComponentCache = new Map<string, Component>()

/** 把某个按需加载类型包成可直接放进 FormKit library / 容器预览绑定的异步组件；
 *  非按需类型返回 undefined（调用方应继续用原来的同步组件）。同一类型只创建一次
 *  组件实例并缓存复用——这样"加载过一次"的类型在所有渲染实例间共享同一份已 resolve
 *  的状态，不会因为拿到的是"新的" defineAsyncComponent 而重新经历一次加载态。 */
export function createLazyComponent(type: string): Component | undefined {
  if (!resolveLoader(type)) return undefined
  const cached = asyncComponentCache.get(type)
  if (cached) return cached
  const comp = markRaw(
    defineAsyncComponent({
      loader: () => loadOnce(type) as Promise<Component>,
      errorComponent: LazyLoadErrorPlaceholder,
      onError(_error, _retry, fail) {
        // 不重试：这些是同源代码分包，失败大多是网络问题，重试意义不大；
        // 直接展示占位，不让 defineAsyncComponent 把错误抛给上层导致整个表单崩掉。
        fail()
      },
    }),
  )
  asyncComponentCache.set(type, comp)
  return comp
}

// ─── 收集表单里用到的元素类型（含嵌套容器 / 数据表格列）───────────────────────────

function walkFormNode(node: FormNode, into: Set<string>): void {
  into.add(node.type)
  const children = (node as { children?: FormNode[] }).children
  if (Array.isArray(children)) {
    for (const child of children) walkFormNode(child, into)
  }
}

/** 遍历 DSL 定义收集用到的全部元素类型，去重；容器（含数据表格）按其 children
 *  递归展开——数据表格的列本身就是普通 DSL 字段节点，一并收集在内。 */
export function collectElementTypes(definition: FormDefinition): string[] {
  const types = new Set<string>()
  walkFormNode(definition.root, types)
  return [...types]
}

/** 仅供测试使用：清空某个类型已缓存的加载状态，模拟"这个类型还没加载过"，用来
 *  验证按需加载真实的"加载中 → 加载完成"过渡（见 renderer/__tests__ 下的用例）。
 *  测试环境默认会在每个文件开始前预热全部按需类型（src/test-setup），不重置的话
 *  观察不到这个过渡。生产代码不应该调用它。 */
export function __resetLoadStateForTesting(type: string): void {
  modulePromises.delete(type)
  resolvedTypes.delete(type)
  asyncComponentCache.delete(type)
}

/** schema 版本：给只有裸 FormKit schema（没有 DSL 定义）的渲染通道用，如
 *  FormRenderer 的 schema prop。经 schemaNodeToDslNode 转成 DSL 节点后复用同一套
 *  遍历逻辑，因此同样能识别容器 / 数据表格列里的类型。 */
export function collectElementTypesFromSchema(
  schema: FormKitSchemaFormKit[] | undefined,
): string[] {
  const types = new Set<string>()
  for (const node of schema ?? []) {
    if (node && typeof node === 'object') {
      walkFormNode(schemaNodeToDslNode(node as SchemaNode), types)
    }
  }
  return [...types]
}
