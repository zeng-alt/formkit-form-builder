// ═══ 渲染层：容器元素 画布/预览组件绑定 + 归一化 ═══════════════════════════════
// 由原 src/containers/ 迁入。这里持有容器画布/预览组件，按 type（$cmp 名）索引；
// 渲染 pipeline：canvas/预览库 → normalizeContainerNode → formatContainerPreviewNode。

import { markRaw } from 'vue'
import type { Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { buildElementSchemaLibrary } from './formkit'
import { registerBuiltinElementTypes } from '../dsl/definitions'

import ListContainer from '@/components/ui/containers/list/ListContainer.vue'
import ListContainerPreview from '@/components/ui/containers/list/ListContainerPreview.vue'
import CardContainer from '@/components/ui/containers/card/CardContainer.vue'
import CardContainerPreview from '@/components/ui/containers/card/CardContainerPreview.vue'
import InputGroupContainer from '@/components/ui/containers/input-group/InputGroupContainer.vue'
import InputGroupContainerPreview from '@/components/ui/containers/input-group/InputGroupContainerPreview.vue'
import TabsContainer from '@/components/ui/containers/tabs/TabsContainer.vue'
import TabsContainerPreview from '@/components/ui/containers/tabs/TabsContainerPreview.vue'

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

// ─── list ──────────────────────────────────────────────────────────────────────

function isListContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'list' || node.$formkit === 'list'
}

function normalizeList(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'list'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.listKey =
    typeof props.listKey === 'string' && props.listKey
      ? props.listKey
      : ((next.__key as string | undefined) ?? '')
  props.modelValue = next.children
  if (props.showActions === undefined) props.showActions = false
  next.props = props
  return next
}

// ─── card ──────────────────────────────────────────────────────────────────────

function isCardContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'card' || node.$formkit === 'card'
}

function normalizeCard(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'card'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.cardKey =
    typeof props.cardKey === 'string' && props.cardKey
      ? props.cardKey
      : ((next.__key as string | undefined) ?? '')
  props.modelValue = next.children
  next.props = props
  return next
}

// ─── input-group ───────────────────────────────────────────────────────────────

function isInputGroupContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'inputGroup' || node.$formkit === 'inputGroup'
}

function normalizeInputGroup(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'inputGroup'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.inputGroupKey =
    typeof props.inputGroupKey === 'string' && props.inputGroupKey
      ? props.inputGroupKey
      : ((next.__key as string | undefined) ?? '')
  props.modelValue = next.children
  next.props = props
  return next
}

// ─── tabs ──────────────────────────────────────────────────────────────────────

function isTabsContainer(node: any) {
  if (!node || typeof node !== 'object') return false
  return node.$cmp === 'tabs' || node.$formkit === 'tabs'
}

function normalizeTabs(node: SchemaNode): SchemaNode {
  const next: any = { ...node }
  next.$cmp = next.$cmp || 'tabs'
  next.children = Array.isArray(next.children) ? next.children : []
  const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
  props.tabsKey =
    typeof props.tabsKey === 'string' && props.tabsKey
      ? props.tabsKey
      : ((next.__key as string | undefined) ?? '')
  props.modelValue = next.children
  next.props = props
  return next
}

// ─── 注册表 ────────────────────────────────────────────────────────────────────

const defs: ContainerDefinition[] = [
  {
    id: 'list',
    match: isListContainer,
    canvas: { libraryKey: 'list', component: ListContainer as any },
    preview: { libraryKey: 'list', component: ListContainerPreview as any },
    normalize: normalizeList,
    formatPreview: (node, ctx) => formatContainer(node, ctx, 'list', normalizeList, 'listKey'),
  },
  {
    id: 'card',
    match: isCardContainer,
    canvas: { libraryKey: 'card', component: CardContainer as any },
    preview: { libraryKey: 'card', component: CardContainerPreview as any },
    normalize: normalizeCard,
    formatPreview: (node, ctx) => formatContainer(node, ctx, 'card', normalizeCard, 'cardKey'),
  },
  {
    id: 'inputGroup',
    match: isInputGroupContainer,
    canvas: { libraryKey: 'inputGroup', component: InputGroupContainer as any },
    preview: { libraryKey: 'inputGroup', component: InputGroupContainerPreview as any },
    normalize: normalizeInputGroup,
    formatPreview: (node, ctx) =>
      formatContainer(node, ctx, 'inputGroup', normalizeInputGroup, 'inputGroupKey'),
  },
  {
    id: 'tabs',
    match: isTabsContainer,
    canvas: { libraryKey: 'tabs', component: TabsContainer as any },
    preview: { libraryKey: 'tabs', component: TabsContainerPreview as any },
    normalize: normalizeTabs,
    formatPreview: (node, ctx) => formatTabs(node, ctx),
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

// ─── 通用预览包装（list / card / inputGroup）───────────────────────────────────

function formatContainer(
  node: SchemaNode,
  ctx: ContainerFormatCtx,
  cmp: string,
  normalize: (n: SchemaNode) => SchemaNode,
  keyProp: string,
): FormKitSchemaFormKit {
  const key = (node as any)?.__key as string | undefined
  const normalized = normalize(node)
  const children = Array.isArray(normalized.children)
    ? (normalized.children as FormKitSchemaFormKit[]).map((c, i) => ctx.format(c, i))
    : []
  const schemaIf = (normalized as any).if
  const containerName = ((normalized as any).props?.name as string | undefined)
    ?? (normalized as any).name as string | undefined

  // list 容器：渲染 ListContainerPreview.vue（动态 FormKit list，内置 +/删除 交互），
  // 每条记录为 object，整体数据形态为数组 [{...},{...}]
  if (cmp === 'list') {
    const containerProps = { ...(normalized as any).props }
    delete containerProps.modelValue
    const containerNode: any = {
      $cmp: 'list',
      props: {
        ...containerProps,
        listKey: ((normalized as any).props?.listKey as string | undefined) ?? key ?? '',
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

  // card / inputGroup：容器整体包裹在 $formkit: 'group' 外层，提供 JSON object 数据结构
  // 容器 props 中的 name 移入 group，避免容器组件重复携带
  const containerProps = { ...(normalized as any).props }
  delete containerProps.name
  const containerNode: any = {
    $cmp: cmp,
    props: {
      ...containerProps,
      [keyProp]: ((normalized as any).props?.[keyProp] as string | undefined) ?? key ?? '',
      modelValue: children,
    },
  }

  const groupNode: any = {
    $formkit: 'group',
    children: [containerNode],
    outerClass: '!border-0 !p-0 !m-0 ![&>.formkit-wrapper]:border-0 ![&>.formkit-wrapper]:p-0 ![&>.formkit-wrapper]:m-0 ![&>.formkit-wrapper>fieldset]:border-0 ![&>.formkit-wrapper>fieldset]:p-0 ![&>.formkit-wrapper>fieldset]:m-0',
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

// tabs 预览：pane 子节点也逐层格式化，每个 pane 内容包裹在 group 中提供 structured data
function formatTabs(node: SchemaNode, ctx: ContainerFormatCtx): FormKitSchemaFormKit {
  const key = (node as any)?.__key as string | undefined
  const normalized = normalizeTabs(node)
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
            ? [{ $el: 'div', attrs: { class: 'grid grid-cols-12 gap-x-4 gap-y-2' }, children: paneChildren }]
            : [],
          outerClass: '!border-0 !p-0 !m-0 ![&>.formkit-wrapper]:border-0 ![&>.formkit-wrapper]:p-0 ![&>.formkit-wrapper]:m-0 ![&>.formkit-wrapper>fieldset]:border-0 ![&>.formkit-wrapper>fieldset]:p-0 ![&>.formkit-wrapper>fieldset]:m-0',
        }
        const paneDataKey = paneName ?? paneLabel
        if (paneDataKey) groupNode.name = paneDataKey
        return { ...pane, label: paneLabel, children: [groupNode], __key: pane?.__key ?? `${idx}` } as any
      })
    : []
  const schemaIf = (normalized as any).if
  const nextNode: any = {
    $el: 'div',
    attrs: { class: (normalized as any).outerClass || 'col-span-12' },
    children: [
      {
        $cmp: 'tabs',
        props: {
          ...(normalized as any).props,
          tabsKey: ((normalized as any).props?.tabsKey as string | undefined) ?? key ?? '',
          modelValue: panes,
        },
      },
    ],
  }
  if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
  else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
  return nextNode as FormKitSchemaFormKit
}
