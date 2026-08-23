// ═══ 渲染层：容器元素 画布/预览组件绑定 + 归一化 ═══════════════════════════════
// 由原 src/containers/ 迁入。这里持有容器画布/预览组件，按 type（$cmp 名）索引；
// 渲染 pipeline：canvas/预览库 → normalizeContainerNode → formatContainerPreviewNode。
// 归一化与预览格式均读 container 规格（dataShape + keyProp + primitive，见 container-spec.ts），
// 不再按 kind 逐个硬编码。

import { markRaw } from 'vue'
import type { Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { buildElementSchemaLibrary } from './formkit'
import { registerBuiltinElementTypes } from '../dsl/definitions'
import { getContainerSpec, type ContainerSpec } from './container-spec'
import { applyGroupDisabled, getColSpan, stripInputGroupOuterClass } from '@/utils/dnd/grid'

import ListContainer from '@/components/ui/containers/list/ListContainer.vue'
import ListContainerPreview from '@/components/ui/containers/list/ListContainerPreview.vue'
import CardContainer from '@/components/ui/containers/card/CardContainer.vue'
import CardContainerPreview from '@/components/ui/containers/card/CardContainerPreview.vue'
import InputGroupContainer from '@/components/ui/containers/input-group/InputGroupContainer.vue'
import InputGroupContainerPreview from '@/components/ui/containers/input-group/InputGroupContainerPreview.vue'
import ButtonGroupContainer from '@/components/ui/containers/button-group/ButtonGroupContainer.vue'
import ButtonGroupContainerPreview from '@/components/ui/containers/button-group/ButtonGroupContainerPreview.vue'
import BadgeContainer from '@/components/ui/containers/badge/BadgeContainer.vue'
import BadgeContainerPreview from '@/components/ui/containers/badge/BadgeContainerPreview.vue'
import TabsContainer from '@/components/ui/containers/tabs/TabsContainer.vue'
import TabsContainerPreview from '@/components/ui/containers/tabs/TabsContainerPreview.vue'
import StepsContainer from '@/components/ui/containers/steps/StepsContainer.vue'
import StepsContainerPreview from '@/components/ui/containers/steps/StepsContainerPreview.vue'
import GroupContainer from '@/components/ui/containers/group/GroupContainer.vue'
import DataTableContainer from '@/components/ui/containers/data-table/DataTableContainer.vue'
import DataTableContainerPreview from '@/components/ui/containers/data-table/DataTableContainerPreview.vue'

registerBuiltinElementTypes()

export type SchemaNode = FormKitSchemaFormKit & Record<string, unknown>

export type ContainerFormatCtx = {
  key?: string
  isPlaceholder: boolean
  format: (node: FormKitSchemaFormKit, index: number) => FormKitSchemaFormKit
}

export type ContainerDefinition = {
  id: string
  match: (node: unknown) => boolean
  canvas?: { libraryKey: string; component: Component }
  preview?: { libraryKey: string; component: Component }
  normalize?: (node: SchemaNode) => SchemaNode
  formatPreview?: (node: SchemaNode, ctx: ContainerFormatCtx) => FormKitSchemaFormKit
}

/** 子节点装饰 hook（inputGroup 宽度 / buttonGroup 宽度+禁用），由容器定义按需提供 */
export type TransformChildren = (
  children: FormKitSchemaFormKit[],
  normalized: SchemaNode,
) => FormKitSchemaFormKit[]

/** 取容器规格；内置容器必然注册，取不到即抛错（配置错误尽早暴露） */
function specOf(type: string): ContainerSpec {
  const spec = getContainerSpec(type)
  if (!spec) throw new Error(`[formkit-form-builder] 缺少容器规格: ${type}`)
  return spec
}

/** 通用容器匹配：$cmp === type 或 $formkit === type */
function isContainerOf(node: unknown, type: string): boolean {
  if (!node || typeof node !== 'object') return false
  const n = node as { $cmp?: unknown; $formkit?: unknown }
  return n.$cmp === type || n.$formkit === type
}

// ─── 通用归一化 ────────────────────────────────────────────────────────────────
// 注入 DnD 身份键（props[keyProp]）+ modelValue=children；group 还原为 $cmp:group；
// list（array / arrayOfObjects）默认 showActions=false。全部由规格驱动。

export function normalizeContainer(
  node: SchemaNode,
  type: string,
  spec: ContainerSpec,
): SchemaNode {
  const next: any = { ...node }
  next.$cmp = type
  if (spec.primitive === 'group') delete next.$formkit
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props[spec.keyProp] =
    typeof props[spec.keyProp] === 'string' && props[spec.keyProp]
      ? props[spec.keyProp]
      : ((next.__key as string | undefined) ?? '')
  props.modelValue = next.children
  if (spec.primitive === 'group' && typeof next.name === 'string' && next.name)
    props.name = next.name
  if (
    (spec.dataShape === 'arrayOfObjects' || spec.dataShape === 'array') &&
    props.showActions === undefined
  )
    props.showActions = false
  next.props = props
  return next
}

// ─── inputGroup 预览子节点宽度装饰 ─────────────────────────────────────────────
// children 的宽度按 outerClass 的 col-span-N 展示（4 → 33%、6 → 50%）。
// 逐个 child 读 col-span，改写成对应的 !w-[xx%] 外框类，并去掉网格类/按钮 pt-2。
// 用 !important（!w-）盖过主题 rootClasses 给 formkit-outer 的 w-full，
// 否则与应用/主题 CSS 的级联顺序无关（w-full 100% 会赢过 w-[50%]，元素全宽）。
// 这些 !w-[xx%] 类已加入 uno.config.ts 的 safelist，构建时必定生成。
const INPUT_GROUP_WIDTH_CLASS: Record<number, string> = {
  1: '!w-[8.33%]',
  2: '!w-[16.67%]',
  3: '!w-[25%]',
  4: '!w-[33.33%]',
  5: '!w-[41.67%]',
  6: '!w-[50%]',
  7: '!w-[58.33%]',
  8: '!w-[66.67%]',
  9: '!w-[75%]',
  10: '!w-[83.33%]',
  11: '!w-[91.67%]',
  12: '!w-[100%]',
}
const stripGridWidthClasses = (outerClass: unknown) =>
  (typeof outerClass === 'string' ? outerClass : '')
    .replace(/\bcol-span-\d+\b/g, '')
    .replace(/\b!?w-\[[^\]]+\]/g, '')
    .replace(/\bpt-2\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

function inputGroupSpanOf(child: any): number {
  return getColSpan(child)
}

function decorateInputGroupChild(child: FormKitSchemaFormKit): FormKitSchemaFormKit {
  const anyChild = child as any
  const span = inputGroupSpanOf(anyChild)
  const widthClass = INPUT_GROUP_WIDTH_CLASS[span] ?? 'w-[100%]'
  const base = stripGridWidthClasses(anyChild?.outerClass)
  const outerClass = `${widthClass} ${base}`.trim()
  const next: any = { ...child, outerClass: outerClass || undefined }
  // $cmp 节点：FormKitSchema 把嵌套 props 传给包装组件再透传 FormKit，外框类在
  // props.outerClass 里同样要改写/去网格类，否则预览仍按旧 outerClass 渲染
  if (
    anyChild &&
    typeof anyChild === 'object' &&
    anyChild.props &&
    typeof anyChild.props === 'object'
  ) {
    const props = { ...anyChild.props }
    const propsBase = stripGridWidthClasses((props as any).outerClass)
    props.outerClass = outerClass || propsBase
    next.props = props
  }
  return next as FormKitSchemaFormKit
}

function decorateInputGroupChildren(
  children: FormKitSchemaFormKit[],
  _normalized: SchemaNode,
): FormKitSchemaFormKit[] {
  return children.map(decorateInputGroupChild)
}

// ─── buttonGroup 子节点装饰：去掉按钮外框的 pt-2/宽度类；整体禁用时注入 disabled ──

function decorateButtonGroupChildren(
  children: FormKitSchemaFormKit[],
  normalized: SchemaNode,
): FormKitSchemaFormKit[] {
  const disabled = (normalized as any).props?.disabled
  return children.map((c) => {
    const stripped = stripInputGroupOuterClass(c)
    return disabled ? applyGroupDisabled(stripped) : stripped
  })
}

// ─── 注册表 ────────────────────────────────────────────────────────────────────

const defs: ContainerDefinition[] = [
  {
    id: 'list',
    match: (n) => isContainerOf(n, 'list'),
    canvas: { libraryKey: 'list', component: ListContainer as any },
    preview: { libraryKey: 'list', component: ListContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'list', specOf('list')),
    formatPreview: (n, ctx) => formatContainer(n, ctx, 'list', specOf('list')),
  },
  {
    id: 'card',
    match: (n) => isContainerOf(n, 'card'),
    canvas: { libraryKey: 'card', component: CardContainer as any },
    preview: { libraryKey: 'card', component: CardContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'card', specOf('card')),
    formatPreview: (n, ctx) => formatContainer(n, ctx, 'card', specOf('card')),
  },
  {
    id: 'inputGroup',
    match: (n) => isContainerOf(n, 'inputGroup'),
    canvas: { libraryKey: 'inputGroup', component: InputGroupContainer as any },
    preview: { libraryKey: 'inputGroup', component: InputGroupContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'inputGroup', specOf('inputGroup')),
    formatPreview: (n, ctx) =>
      formatContainer(n, ctx, 'inputGroup', specOf('inputGroup'), {
        transformChildren: decorateInputGroupChildren,
      }),
  },
  {
    id: 'buttonGroup',
    match: (n) => isContainerOf(n, 'buttonGroup'),
    canvas: { libraryKey: 'buttonGroup', component: ButtonGroupContainer as any },
    preview: { libraryKey: 'buttonGroup', component: ButtonGroupContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'buttonGroup', specOf('buttonGroup')),
    formatPreview: (n, ctx) =>
      formatContainer(n, ctx, 'buttonGroup', specOf('buttonGroup'), {
        transformChildren: decorateButtonGroupChildren,
      }),
  },
  {
    id: 'badge',
    match: (n) => isContainerOf(n, 'badge'),
    canvas: { libraryKey: 'badge', component: BadgeContainer as any },
    preview: { libraryKey: 'badge', component: BadgeContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'badge', specOf('badge')),
    formatPreview: (n, ctx) => formatContainer(n, ctx, 'badge', specOf('badge')),
  },
  {
    id: 'tabs',
    match: (n) => isContainerOf(n, 'tabs'),
    canvas: { libraryKey: 'tabs', component: TabsContainer as any },
    preview: { libraryKey: 'tabs', component: TabsContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'tabs', specOf('tabs')),
    formatPreview: (n, ctx) => formatContainer(n, ctx, 'tabs', specOf('tabs')),
  },
  {
    id: 'steps',
    match: (n) => isContainerOf(n, 'steps'),
    canvas: { libraryKey: 'steps', component: StepsContainer as any },
    preview: { libraryKey: 'steps', component: StepsContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'steps', specOf('steps')),
    formatPreview: (n, ctx) => formatContainer(n, ctx, 'steps', specOf('steps')),
  },
  {
    id: 'group',
    match: (n) => isContainerOf(n, 'group'),
    canvas: { libraryKey: 'group', component: GroupContainer as any },
    normalize: (n) => normalizeContainer(n, 'group', specOf('group')),
    formatPreview: (n, ctx) => formatContainer(n, ctx, 'group', specOf('group')),
  },
  {
    id: 'dataTable',
    match: (n) => isContainerOf(n, 'dataTable'),
    canvas: { libraryKey: 'dataTable', component: DataTableContainer as any },
    preview: { libraryKey: 'dataTable', component: DataTableContainerPreview as any },
    normalize: (n) => normalizeContainer(n, 'dataTable', specOf('dataTable')),
    formatPreview: (n, ctx) => formatContainer(n, ctx, 'dataTable', specOf('dataTable')),
  },
]

export function getContainerDefinition(node: unknown): ContainerDefinition | null {
  for (const def of defs) {
    if (def.match(node)) return def
  }
  return null
}

/** 注册自定义容器画布/预览绑定（registerElement 扩展入口用） */
export function registerContainerDefinition(def: ContainerDefinition): void {
  defs.push(def)
}

export function normalizeContainerNode(node: unknown): unknown {
  const def = getContainerDefinition(node)
  if (!def?.normalize) return node
  return def.normalize(node as SchemaNode)
}

export function getCanvasSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = { ...buildElementSchemaLibrary() }
  for (const def of defs) {
    if (!def.canvas) continue
    lib[def.canvas.libraryKey] = markRaw(def.canvas.component) as unknown as Component
  }
  return lib
}

export function getPreviewSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = { ...buildElementSchemaLibrary() }
  for (const def of defs) {
    if (!def.preview) continue
    lib[def.preview.libraryKey] = markRaw(def.preview.component) as unknown as Component
  }
  return lib
}

export function formatContainerPreviewNode(
  node: unknown,
  ctx: ContainerFormatCtx,
): FormKitSchemaFormKit | null {
  const def = getContainerDefinition(node)
  if (!def?.formatPreview) return null
  return def.formatPreview(node as SchemaNode, ctx)
}

// ─── 通用预览包装：按容器规格（dataShape + primitive）决定 group/list 怎么包一层 ──
//  dataShape 决定数据结构：
//    none             → 纯展示壳（buttonGroup），不包
//    array / arrayOfObjects → 动态 list（list），不包外层 group；
//                             array 每条记录标量/单字段，arrayOfObjects 每条记录 object
// objectOfObjects  → 每个子节点（pane）包 group（tabs/steps）
//    object           → 单对象：primitive=group 原生 group；primitive=cmp 壳 + group 包一层

export function formatContainer(
  node: SchemaNode,
  ctx: ContainerFormatCtx,
  type: string,
  spec: ContainerSpec,
  opts?: { transformChildren?: TransformChildren },
): FormKitSchemaFormKit {
  const key = (node as any)?.__key as string | undefined
  const normalized = normalizeContainer(node, type, spec)
  const rawChildren = Array.isArray(normalized.children)
    ? (normalized.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
    : []
  const children = opts?.transformChildren
    ? opts.transformChildren(rawChildren, normalized)
    : rawChildren
  const schemaIf = (normalized as any).if
  const containerName =
    ((normalized as any).props?.name as string | undefined) ??
    ((normalized as any).name as string | undefined)

  const keyPropValue =
    ((normalized as any).props?.[spec.keyProp] as string | undefined) ?? key ?? ''

  // none（buttonGroup）：纯展示容器，不包 group（按钮不产数据），直接 $cmp 承载子按钮
  if (spec.dataShape === 'none') {
    const nextNode: any = {
      $el: 'div',
      attrs: { class: (normalized as any).outerClass || 'col-span-12' },
      children: [
        {
          $cmp: type,
          props: {
            ...(normalized as any).props,
            [spec.keyProp]: keyPropValue,
            modelValue: children,
          },
        },
      ],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as FormKitSchemaFormKit
  }

  // array / arrayOfObjects（list）：渲染 ListContainerPreview.vue
  //（动态 FormKit list，内置 +/删除 交互）。array 每条记录为标量/单字段，arrayOfObjects
  // 每条记录为 object，但预览渲染共用同一组件。
  if (spec.dataShape === 'arrayOfObjects' || spec.dataShape === 'array') {
    const containerProps = { ...(normalized as any).props }
    delete containerProps.modelValue
    const containerNode: any = {
      $cmp: type,
      props: {
        ...containerProps,
        [spec.keyProp]: keyPropValue,
        name: containerName,
        modelValue: children,
        isPlaceholder: ctx.isPlaceholder,
      },
    }
    const nextNode: any = {
      $el: 'div',
      attrs: { class: (normalized as any).outerClass || 'col-span-12' },
      children: [containerNode],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as FormKitSchemaFormKit
  }

  // objectOfObjects（tabs/steps）：每个 pane/step 内容包在 group 中提供 structured data
  if (spec.dataShape === 'objectOfObjects') {
    const panes = Array.isArray(normalized.children)
      ? (normalized.children as FormKitSchemaFormKit[]).map((pane: any, idx) => {
          const paneChildren = Array.isArray(pane?.children)
            ? (pane.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
            : []
          const paneLabel = pane?.label as string | undefined
          const paneName = pane?.name as string | undefined
          // 每个 pane 的内容包裹在 group 中，提供 JSON object 数据；组名用 pane 的 name
          //（数据字段名），未设置时回退 label
          const groupNode: any = {
            $formkit: 'group',
            children: paneChildren.length
              ? [
                  {
                    $el: 'div',
                    attrs: { class: 'grid grid-cols-12 gap-x-4 gap-y-2' },
                    children: paneChildren,
                  },
                ]
              : [],
            outerClass:
              '!border-0 !p-0 !m-0 ![&>.formkit-wrapper]:border-0 ![&>.formkit-wrapper]:p-0 ![&>.formkit-wrapper]:m-0 ![&>.formkit-wrapper>fieldset]:border-0 ![&>.formkit-wrapper>fieldset]:p-0 ![&>.formkit-wrapper>fieldset]:m-0',
          }
          const paneDataKey = paneName ?? paneLabel
          if (paneDataKey) groupNode.name = paneDataKey
          return {
            ...pane,
            label: paneLabel,
            children: [groupNode],
            __key: pane?.__key ?? `${idx}`,
          } as any
        })
      : []
    const nextNode: any = {
      $el: 'div',
      attrs: { class: (normalized as any).outerClass || 'col-span-12' },
      children: [
        {
          $cmp: type,
          props: { ...(normalized as any).props, [spec.keyProp]: keyPropValue, modelValue: panes },
        },
      ],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as FormKitSchemaFormKit
  }

  // object + primitive=group：还原为 FormKit 原生 $formkit:group，直接产出嵌套 object 数据。
  // 子节点递归格式化后放入内部 grid（col-span 布局）；group 原生 schema 是 fragment
  //（无包裹元素，outerClass 无处落地），外层用 $el:div 承载 col-span 宽度。
  if (spec.primitive === 'group') {
    const outerClass = (normalized as any).outerClass
    const groupNode: any = {
      $formkit: 'group',
      children: children.length
        ? [{ $el: 'div', attrs: { class: 'grid grid-cols-12 gap-x-4 gap-y-2' }, children }]
        : [],
    }
    if (containerName) groupNode.name = containerName
    const nextNode: any = {
      $el: 'div',
      attrs: { class: outerClass || 'col-span-12' },
      children: [groupNode],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as FormKitSchemaFormKit
  }

  // object + primitive=cmp（card / inputGroup）：容器整体包裹在 $formkit:group 外层，
  // 提供 JSON object 数据结构；容器 props 中的 name 移入 group，避免组件重复携带
  const containerProps = { ...(normalized as any).props }
  delete containerProps.name
  const containerNode: any = {
    $cmp: type,
    props: {
      ...containerProps,
      [spec.keyProp]: keyPropValue,
      modelValue: children,
    },
  }

  const groupNode: any = {
    $formkit: 'group',
    children: [containerNode],
    outerClass:
      '!border-0 !p-0 !m-0 ![&>.formkit-wrapper]:border-0 ![&>.formkit-wrapper]:p-0 ![&>.formkit-wrapper]:m-0 ![&>.formkit-wrapper>fieldset]:border-0 ![&>.formkit-wrapper>fieldset]:p-0 ![&>.formkit-wrapper>fieldset]:m-0',
  }
  if (containerName) groupNode.name = containerName

  const nextNode: any = {
    $el: 'div',
    attrs: { class: (normalized as any).outerClass || 'col-span-12' },
    children: [groupNode],
  }
  if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
  else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
  return nextNode as FormKitSchemaFormKit
}
