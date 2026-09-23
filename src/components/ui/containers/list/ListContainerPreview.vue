<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, inject } from 'vue'
import { FormKit, FormKitSchema } from '@formkit/vue'
import { NButton, NTooltip, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { getElementTypeDef } from '@/dsl'
import { useSchemaRenderData } from '@/composables/use-schema-render-data'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'

const props = defineProps<{
  listKey?: string
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  name?: string
  bordered?: boolean
  /** 嵌套列表项模式：以 :index 绑定到外层 list 的数组元素（array of arrays） */
  itemIndex?: number
}>()

const interactive = inject('previewListInteractive', true)

const { t } = useFormBuilderI18n()

const schemaLibrary = getPreviewSchemaLibrary()
// 表单数据 + 表达式 helper：list 是数组容器，条目内字段的 visibleIf 按字段名引用
// 表单数据——默认 dataStructure:'flat' 下字段名平铺在表单数据顶层，传根表单数据是对的；
// dataStructure:'nested' 时容器子字段会嵌套进 group，这里仍传根级数据，但
// useSchemaRenderData 内部会按字段名做树内查找（lookupFieldValue），根层查不到时
// 会往嵌套结构里找，两种模式行为一致（见 use-schema-render-data.ts 顶部注释）。
const schemaRenderData = useSchemaRenderData()

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const bordered = computed<boolean>(() => props.bordered ?? true)
const listName = computed(() =>
  typeof props.name === 'string' && props.name.trim() ? props.name.trim() : props.listKey || 'list',
)
const listItems = computed<FormKitSchemaFormKit[]>(() =>
  Array.isArray(props.modelValue)
    ? props.modelValue
    : Array.isArray(props.children)
      ? props.children
      : [],
)
// 拆箱：跳过外层 $el 包装层（col-span 壳），取出列表项真正的模板节点
const unwrapElLayers = (node: SchemaNode): SchemaNode => {
  let n = node
  while (n && typeof n.$el === 'string' && schemaChildren(n).length === 1) {
    n = schemaChildren(n)[0]!
  }
  return n
}

// 嵌套列表项：为内层 $cmp list 注入当前项 index（itemIndex），使其以 :index
// 绑定到外层 list 的数组元素（array of arrays），name 不再产生 { field_2: [...] } 层
const nestedItemSchema = (schema: FormKitSchemaFormKit[], index: number): FormKitSchemaFormKit[] =>
  schema.map((s) => {
    const n = s as { props?: Record<string, unknown> } | null
    if (!n || typeof n !== 'object') return s
    const props = n.props && typeof n.props === 'object' ? { ...n.props } : {}
    return { ...s, props: { ...props, itemIndex: index } }
  })

const recordFields = computed(() => {
  const list = listItems.value
  // 列表项模板若为单个顶层 group（list 内拖入 group）：直接渲染 group 内部字段，
  // group 名不再产生嵌套，保证每条记录是扁平 object（[{...}]）
  if (list.length === 1) {
    const only = unwrapElLayers(list[0]!)
    if (only && typeof only === 'object' && (only.$formkit === 'group' || only.$cmp === 'group')) {
      const children = schemaChildren(only)
      if (children.length) return children
    }
  }
  return list
})

// 列表项模板 = 列表子节点：
// 直接字段 → 标量项 ["a","b"]；
// 顶层 group → 扁平对象项 [{...}]：组名由 :index 定位，剥离后不再多包一层 {}；
// 顶层 list → 数组项 [[...]]：渲染内层 $cmp list（带增删交互），按 index 绑定，不再包 name；
// 多字段 / $cmp 兜底 → 包 group（对象项，FormKit 多值列表的必需形态）。
const itemTemplate = computed<{
  type: string
  attrs: Record<string, unknown>
  children?: FormKitSchemaFormKit[]
  /** 嵌套列表：原样渲染内层 $cmp list（ListContainerPreview，带增删交互） */
  nestedList?: FormKitSchemaFormKit[]
} | null>(() => {
  const list = listItems.value
  if (list.length !== 1) {
    if (!list.length) return null
    return { type: 'group', attrs: {}, children: list }
  }
  const only = unwrapElLayers(list[0]!)
  const kind = only?.$formkit ?? only?.$cmp
  // 列表项最外层 $el 包装的 col-span（容器的占列数，如 card 的 col-span-6）；
  // 解壳后用它回包 $cmp 子节点，保证布局宽度不被丢弃
  const outerElClass =
    typeof list[0]?.$el === 'string' && typeof list[0]?.attrs?.class === 'string'
      ? (list[0].attrs.class as string)
      : ''
  const outerSpanClass = outerElClass.match(/\bcol-span-\d+\b/)?.[0] ?? ''
  // 直接字段：标量项（$formkit / $cmp 化字段均可）。字段由外层 :index 定位，
  // attrs 不携带 name/id，避免多包一层对象键；$cmp 字段的 FormKit 配置在 props 内。
  const isField = getElementTypeDef(kind)?.category === 'field'
  const isScalar =
    (typeof only?.$formkit === 'string' && kind !== 'group' && kind !== 'list') || isField
  if (isScalar) {
    let attrs: Record<string, unknown>
    if (typeof only?.$formkit === 'string') {
      const { $formkit: _formkit, name: _name, id: _id, __key: _key, ...rest } = only
      attrs = rest
    } else {
      attrs = { ...(only?.props && typeof only.props === 'object' ? only.props : {}) }
      delete attrs.name
      delete attrs.id
      delete attrs.__key
    }
    return { type: kind, attrs }
  }
  // 顶层 group：扁平对象项。剥离组名，展开内部字段（解掉内部 grid 壳），
  // 由模板外层统一铺 grid，避免组内再套一层 group / 网格
  if (kind === 'group') {
    let inner = schemaChildren(only)
    // 组内单一 $el 包装：可能是内部 grid 壳，也可能是容器（card）自身的 col-span 壳；
    // 解壳时记住它的类，回包 $cmp 子节点时优先沿用（否则 colspan 6 会退成 12）
    let innerElClass = ''
    if (
      inner.length === 1 &&
      inner[0] &&
      typeof inner[0].$el === 'string' &&
      Array.isArray(inner[0].children)
    ) {
      innerElClass =
        typeof inner[0].attrs?.class === 'string' ? (inner[0].attrs.class as string) : ''
      inner = schemaChildren(inner[0])
    }
    // 容器/布局子节点（$cmp，如 list 内嵌 card）：组件根不是 formkit-outer，网格里缺 col-span
    // 会退化成 1/12 列宽（xxxx---），按最外层 col-span 回包（缺省 12 = 撑满父容器整行）。
    // $cmp 化的字段（$cmp: text 等）自带 formkit-outer + props.outerClass，不能回包，否则被
    // 套进全宽 div 丢失自身的 col-span 布局。
    const wrapClass = innerElClass.match(/\bcol-span-\d+\b/)?.[0] || outerSpanClass || 'col-span-12'
    inner = inner.map((c) =>
      c && typeof c.$cmp === 'string' && getElementTypeDef(c.$cmp)?.category !== 'field'
        ? ({
            $el: 'div',
            attrs: { class: wrapClass },
            children: [c],
          } as unknown as FormKitSchemaFormKit)
        : c,
    )
    return { type: 'group', attrs: {}, children: inner }
  }
  // 顶层 list：数组项（array of arrays）。直接渲染内层 $cmp list，其 FormKit list
  // 父节点即外层 list，按 index 绑定到外层数组元素；name（field_2）不产生嵌套层，
  // 且内层列表保留添加/删除项的完整交互。
  if (kind === 'list' && only && typeof only === 'object') {
    return { type: 'list', attrs: {}, nestedList: [only as FormKitSchemaFormKit] }
  }
  // 其他 $cmp 容器：包 group 兜底（保持现状）
  return { type: 'group', attrs: {}, children: list }
})
const addItem = (node: unknown, value: unknown) => {
  // 字段子节点：新增标量项；group 子节点：新增对象项；list 子节点：新增数组项
  const t = itemTemplate.value?.type
  const empty = t === 'group' ? {} : t === 'list' ? [] : ''
  ;(node as { input: (v: unknown[]) => void }).input([
    ...(Array.isArray(value) ? value : []),
    empty,
  ])
}
const removeItem = (node: unknown, value: unknown, index: number) => {
  ;(node as { input: (v: unknown[]) => void }).input(
    (Array.isArray(value) ? value : []).filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div :class="['w-full rounded-xl pt-2', bordered ? 'border border-border/50' : '']">
    <div v-if="title" class="mb-2px">
      <div v-if="title" class="text-12px font-bold">{{ title }}</div>
    </div>

    <div class="p-2">
      <FormKit
        type="list"
        :name="itemIndex === undefined ? listName : undefined"
        :index="itemIndex"
        :dynamic="true"
        :value="[]"
      >
        <template #default="{ items, node, value }">
          <div
            v-for="(item, index) in items"
            :key="index"
            class="relative mb-2 rounded-lg border border-border/40 p-4"
          >
            <!-- 列表项 = 列表子节点（:index 作用域渲染），数据格式由子节点决定：
                 group 子节点 → 对象项 [{...}]；字段子节点 → 标量项 ["a","b"]；
                 list 子节点 → 数组项 [[...]]（内层列表自带增删交互） -->
            <FormKitSchema
              v-if="itemTemplate?.nestedList"
              :schema="nestedItemSchema(itemTemplate.nestedList, index as number)"
              :library="schemaLibrary"
              :data="schemaRenderData"
            />
            <FormKit
              v-else-if="itemTemplate"
              :index="index as number"
              :type="itemTemplate.type"
              v-bind="itemTemplate.attrs"
            >
              <template v-if="itemTemplate.children">
                <div class="grid grid-cols-12 gap-x-4 gap-y-2">
                  <FormKitSchema
                    :schema="itemTemplate.children"
                    :library="schemaLibrary"
                    :data="schemaRenderData"
                  />
                </div>
              </template>
            </FormKit>
            <n-tooltip
              v-if="interactive && items.length > 1 && (index as number) > 0"
              placement="top"
            >
              <template #trigger>
                <n-button
                  text
                  type="error"
                  size="small"
                  class="!absolute -top-2 -right-2 z-10"
                  @click.stop="removeItem(node, value, index as number)"
                >
                  <template #icon><span class="i-lucide-trash-2 h-4 w-4"></span></template>
                </n-button>
              </template>
              {{ t('builder.listRemove') }}
            </n-tooltip>
          </div>

          <n-button
            v-if="interactive && recordFields.length > 0"
            secondary
            type="primary"
            size="small"
            class="w-full"
            @click="addItem(node, value)"
          >
            <template #icon><span class="i-lucide-plus h-4 w-4"></span></template>
            {{ t('builder.listAdd') }}
          </n-button>
          <div v-if="recordFields.length <= 0" class="flex w-full items-center justify-center">
            <n-empty :description="t('builder.listDropHere')" />
          </div>
        </template>
      </FormKit>
    </div>
  </div>
</template>
