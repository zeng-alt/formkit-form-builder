<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, inject } from 'vue'
import { FormKit, FormKitSchema } from '@formkit/vue'
import { NButton, NTooltip, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'

const props = defineProps<{
  nodeKey?: string
  listKey?: string
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  name?: string
  isPlaceholder?: boolean
  /** 嵌套列表项模式：以 :index 绑定到外层 list 的数组元素（array of arrays） */
  itemIndex?: number
}>()

const restore = inject('previewListRestore', null as unknown as ((key: string) => void) | null)
const interactive = inject('previewListInteractive', true)

const { t } = useFormBuilderI18n()

const schemaLibrary = getPreviewSchemaLibrary()

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const nodeKey = computed(() => props.nodeKey ?? props.listKey ?? '')
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
const unwrapElLayers = (node: any): any => {
  let n = node
  while (
    n &&
    typeof n.$el === 'string' &&
    Array.isArray(n.children) &&
    n.children.length === 1
  ) {
    n = n.children[0]
  }
  return n
}

// 嵌套列表项：为内层 $cmp list 注入当前项 index（itemIndex），使其以 :index
// 绑定到外层 list 的数组元素（array of arrays），name 不再产生 { field_2: [...] } 层
const nestedItemSchema = (
  schema: FormKitSchemaFormKit[],
  index: number,
): FormKitSchemaFormKit[] =>
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
    const only = unwrapElLayers(list[0] as any)
    if (only && typeof only === 'object' && (only.$formkit === 'group' || only.$cmp === 'group')) {
      if (Array.isArray(only.children) && only.children.length) return only.children
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
  const only = unwrapElLayers(list[0] as any)
  const kind = only?.$formkit ?? only?.$cmp
  // 直接字段：标量项
  if (typeof only?.$formkit === 'string' && kind !== 'group' && kind !== 'list') {
    const { $formkit: _formkit, name: _name, id: _id, __key: _key, ...attrs } = only
    return { type: only.$formkit, attrs }
  }
  // 顶层 group：扁平对象项。剥离组名，展开内部字段（解掉内部 grid 壳），
  // 由模板外层统一铺 grid，避免组内再套一层 group / 网格
  if (kind === 'group') {
    let inner = Array.isArray(only.children) ? (only.children as FormKitSchemaFormKit[]) : []
    if (
      inner.length === 1 &&
      inner[0] &&
      typeof (inner[0] as any).$el === 'string' &&
      Array.isArray((inner[0] as any).children)
    ) {
      inner = (inner[0] as any).children as FormKitSchemaFormKit[]
    }
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
const canRestore = computed(() => props.isPlaceholder === true && typeof restore === 'function')

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
  <div class="w-full rounded-xl border border-border/50 pt-2">
    <div v-if="title" class="mb-2px">
      <div v-if="title" class="text-12px font-bold">{{ title }}</div>
    </div>

    <div class="p-2">
      <div
        v-if="props.isPlaceholder === true"
        class="min-h-[140px] flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-3">
          <n-empty :description="t('builder.listRemove')" />
          <n-button v-if="canRestore" secondary @click="restore?.(nodeKey)">
            <template #icon><span class="i-lucide-plus h-4 w-4"></span></template>
            {{ t('builder.addListContainer') }}
          </n-button>
        </div>
      </div>

      <FormKit
        v-else
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
            />
            <FormKit
              v-else-if="itemTemplate"
              :index="index as number"
              :type="itemTemplate.type"
              v-bind="itemTemplate.attrs"
            >
              <template v-if="itemTemplate.children">
                <div class="grid grid-cols-12 gap-x-4 gap-y-2">
                  <FormKitSchema :schema="itemTemplate.children" :library="schemaLibrary" />
                </div>
              </template>
            </FormKit>
            <n-tooltip
              v-if="interactive && items.length > 1 && (index as number) > 0"
              placement="top"
            >
              <template #trigger>
                <n-button
                  quaternary
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
