<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NButton, NDropdown, NEmpty, NInput, NModal, NScrollbar, type MenuOption } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import {
  createDefaultFormElements,
  getElementDefinition,
  getElementDefinitions,
  getElementTypeBySchema,
} from '@/elements'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode } from '@/types/dsl'
import { canvasData, columnKind, toRowKey, toPageSize } from './utils'
import DataTableCellRenderer from './DataTableCellRenderer.vue'
import type { DataTableColumn } from './types'

// 画布组件：数据表格容器。分区契约（见 types.ts）：
//   搜索区 = 容器 children（拖入的字段即搜索条件），空时显示 drop 提示，有内容显示字段块 +
//   搜索/重置按钮；
//   内容区 = props.columns（纯列定义）：新增列经弹窗选择字段元素生成列，可拖拽排序 / 删除，
//   下方渲染占位数据行。列变更经 canvasCtx.updateNodePropsByKey 写回节点 props。
const { selectedKey, selectedColumnIndex } = useFormBuilderState()

const props = withDefaults(
  defineProps<{
    dataTableKey?: string
    modelValue: FormKitSchemaFormKit[]
    label?: string
    disabled?: boolean
    // 列区（节点 props.columns）：纯列定义，非树节点
    columns?: DataTableColumn[]
    data?: Record<string, unknown>[]
    rowKey?: string
    bordered?: boolean
    size?: 'small' | 'medium' | 'large'
    scrollX?: number
    pagination?: boolean
    pageSize?: number
    remote?: boolean
    /** 搜索区是否可展开/收起（开启后显示切换按钮；未展开单行，展开按布局换行排放） */
    searchExpandable?: boolean
  }>(),
  {
    modelValue: () => [],
    columns: () => [],
    data: () => [],
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormKitSchemaFormKit[]): void
  (e: 'select', key: string): void
}>()

const { t } = useFormBuilderI18n()
const canvasCtx = useCanvasSchemaContext()

// ─── 搜索区（children）────────────────────────────────────────────────────────
const searchItems = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

function commitSearch(value: FormKitSchemaFormKit[]) {
  const k = props.dataTableKey
  if (k && canvasCtx?.updateContainerChildren) {
    canvasCtx.updateContainerChildren(k, value)
  } else {
    emit('update:modelValue', value)
  }
}

const dndSearch = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: searchItems,
  onUpdateModelValue: commitSearch,
})

// ─── 内容区（props.columns）───────────────────────────────────────────────────
const columnItems = computed(() => (Array.isArray(props.columns) ? props.columns : []))

function patchColumns(next: DataTableColumn[]) {
  const k = props.dataTableKey
  if (!k || !canvasCtx?.updateNodePropsByKey) return
  canvasCtx.updateNodePropsByKey(k, { columns: next.length ? next : undefined })
}

const dndColumns = useContainerDragAndDrop<DataTableColumn>({
  modelValue: columnItems,
  onUpdateModelValue: patchColumns,
})

// ─── 新增列（弹窗）/ 新增搜索字段（下拉选择字段元素）─────────────────────────────
// 展示型控件（头像/图片等）不入列，字段元素 = 目录中 category 为 field 的类型。
const fieldElementOptions = computed(() =>
  getElementDefinitions()
    .filter((d) => d.category === 'field')
    .map((d) => ({ type: d.type, label: t(d.tooltipKey ?? ''), icon: d.icon })),
)

const defaultFieldByType = computed(() => {
  const map = new Map<string, FormKitSchemaFormKit>()
  for (const node of createDefaultFormElements(t)) {
    const type = getElementTypeBySchema(node)
    if (type) map.set(type, node)
  }
  return map
})

// 搜索区"新增搜索字段"下拉选项
const typeOptions = computed<MenuOption[]>(() =>
  fieldElementOptions.value.map((item) => ({
    key: item.type,
    label: item.label,
    icon: item.icon ? () => h('span', { class: `${item.icon} h-3.5 w-3.5` }) : undefined,
  })),
)

// naive-ui 运行时要求 menu-props 为函数，但类型定义为对象，这里用 any 绕过
const searchDropdownMenuProps: any = () => ({ style: { maxHeight: '280px' } })

const modalOpen = ref(false)
const searchExpanded = ref(false)

function pickColumnField(type: string) {
  addColumn(type)
  modalOpen.value = false
}

// 新增列弹窗：搜索关键词过滤 + 计数
const columnKeyword = ref('')
const filteredFieldOptions = computed(() => {
  const kw = columnKeyword.value.trim().toLowerCase()
  if (!kw) return fieldElementOptions.value
  return fieldElementOptions.value.filter(
    (item) => item.label.toLowerCase().includes(kw) || item.type.toLowerCase().includes(kw),
  )
})

// 追加一个搜索字段到 children（复用调色板默认字段 schema）
function addSearchField(type: string) {
  const source = defaultFieldByType.value.get(type)
  if (!source) return
  const cloned = JSON.parse(JSON.stringify(source)) as FormKitSchemaFormKit
  dndSearch.items.value = [...dndSearch.items.value, cloned]
  dndSearch.emitUpdate()
}

// 追加一列（纯列定义，引用字段类型；key/title 可在右侧编辑器调整；
// element 保存来源字段元素的 DSL 节点，name=key、label=title，供编辑面板展示原元素信息）
let colSeq = 0
function addColumn(type: string) {
  const def = getElementDefinition(type)
  const label = def?.tooltipKey ? t(def.tooltipKey) : type
  const key = `${type}_${colSeq++}`
  const typeDef = getElementTypeDef(type)
  const element = typeDef ? ({ ...typeDef.defaults(), name: key, label } as FieldNode) : undefined
  const col: DataTableColumn = { key, title: label, render: type, element }
  dndColumns.items.value = [...dndColumns.items.value, col]
  dndColumns.emitUpdate()
}

const deleteSearchItem = (index: number) => {
  dndSearch.items.value = dndSearch.items.value.filter((_, i) => i !== index)
  dndSearch.emitUpdate()
}

const deleteColumn = (index: number) => {
  dndColumns.items.value = dndColumns.items.value.filter((_, i) => i !== index)
  dndColumns.emitUpdate()
}

const onSelect = (child: any) => {
  const key = child?.__key as string | undefined
  if (!key) return
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
  else emit('select', key)
}

// 列是纯 props 数据（非树节点），画布内维护本地选中列高亮；
// 点击列时同步选中所属数据表格节点，右侧面板进入该列编辑器。
const activeColumnIndex = ref<number | null>(null)

const isActiveColumn = (idx: number) =>
  activeColumnIndex.value === idx && selectedKey.value === props.dataTableKey

function selectColumn(idx: number) {
  activeColumnIndex.value = idx
  const k = props.dataTableKey
  if (!k) return
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(k)
  else emit('select', k)
  // 标记列编辑态：右侧面板切换到该列编辑器（selectByKey 会先清空，这里再落位）
  selectedColumnIndex.value = idx
}

watch(
  () => [selectedKey.value, selectedColumnIndex.value],
  ([k, colIdx]) => {
    if (k !== props.dataTableKey || colIdx === null) activeColumnIndex.value = null
  },
)

// ─── 内容区列 / 数据解析 ───────────────────────────────────────────────────────
const childColumns = computed(() => dndColumns.items.value)
const resolvedRowKey = computed(() => toRowKey({ data: props.data, rowKey: props.rowKey }, 'id'))
const resolvedPageSize = computed(() =>
  toPageSize({ data: props.data, pageSize: props.pageSize }, 10),
)

const sampleRows = computed<Record<string, unknown>[]>(() => {
  const data = canvasData({ data: props.data })
  // 无数据时按列 key 生成占位行，画布更直观；按列形态生成对应的示意值
  if (data.length === 0 && childColumns.value.length > 0) {
    return [1, 2, 3].map((i) => {
      const row: Record<string, unknown> = { [resolvedRowKey.value]: i }
      for (const c of childColumns.value) {
        if (!c.key) continue
        const kind = columnKind(c.render)
        if (kind === 'switch') row[c.key] = i % 2 === 1
        else if (kind === 'rate') row[c.key] = i
        else if (kind === 'color') row[c.key] = i === 1 ? '#a277ff' : '#7c9ef8'
        else row[c.key] = `${c.title} ${i}`
      }
      return row
    })
  }
  return data
})

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)

const modeText = computed(() =>
  props.remote === true ? t('builder.dataTableRemote') : t('builder.dataTableFixed'),
)

const isSelected = (child: any) =>
  typeof child?.__key === 'string' && child.__key === selectedKey.value

const titleOf = (item: any) => item?.label ?? item?.name ?? ''
</script>

<template>
  <div class="w-full rounded-xl border border-border/50">
    <div class="flex items-center justify-between px-3 py-2 border-b border-border/50">
      <div class="flex items-center gap-2 min-w-0">
        <span v-if="title" class="text-12px font-bold truncate">{{ title }}</span>
        <span
          class="flex items-center gap-1 text-[11px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/40"
        >
          <span class="i-lucide-table-2 h-3.5 w-3.5"></span>
          {{ modeText }}
        </span>
        <span v-if="props.pagination === true" class="text-[11px] text-muted-foreground">
          {{ t('builder.dataTablePaged') }} · {{ resolvedPageSize }}/页
        </span>
      </div>
    </div>

    <!-- 搜索区 -->
    <div class="border-b border-border/50 px-3 py-2">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[11px] font-medium text-muted-foreground">
          {{ t('builder.dataTableSearchZone') }}
        </span>
        <n-dropdown
          trigger="click"
          scrollable
          :menu-props="searchDropdownMenuProps"
          :options="typeOptions"
          @select="(k: string) => addSearchField(k)"
        >
          <n-button text size="tiny">
            <template #icon><span class="i-lucide-plus h-3 w-3"></span></template>
            {{ t('builder.dataTableAddSearchField') }}
          </n-button>
        </n-dropdown>
      </div>

      <div v-if="searchItems.length" class="flex items-center gap-2">
        <div
          :ref="dndSearch.containerRef"
          :class="[
            'flex-1 min-w-0 items-center gap-1.5',
            searchExpanded ? 'flex flex-wrap' : 'flex flex-nowrap overflow-hidden',
          ]"
        >
          <div
            v-for="(item, idx) in dndSearch.items.value"
            :key="(item as any)?.__key || (item as any)?.name || idx"
            data-canvas-item="true"
            :class="[
              'group relative flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs select-none',
              'cursor-grab active:cursor-grabbing',
              isSelected(item)
                ? 'border-solid border-[#a277ff] bg-[#a277ff]/[0.08] text-[#a277ff]'
                : 'border-dashed border-transparent hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]',
            ]"
            @pointerdown.stop="onSelect(item)"
          >
            <span class="i-lucide-search h-3 w-3 text-muted-foreground"></span>
            <span class="pr-2">{{ titleOf(item) }}</span>
            <n-button
              quaternary
              size="tiny"
              round
              :aria-label="t('builder.deleteField')"
              @pointerdown.stop.prevent
              @click.stop="deleteSearchItem(idx)"
              class="!h-[16px] !w-[16px] !text-muted-foreground hover:!text-red-600"
            >
              <template #icon><span class="i-lucide-x h-3 w-3"></span></template>
            </n-button>
          </div>
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          <n-button text size="small">
            <template #icon><span class="i-lucide-search h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableSearch') }}
          </n-button>
          <n-button text size="small">
            <template #icon><span class="i-lucide-rotate-ccw h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableReset') }}
          </n-button>
          <n-button
            v-if="props.searchExpandable"
            text
            size="small"
            class="ml-0.5"
            @click="searchExpanded = !searchExpanded"
          >
            <template #icon>
              <span
                :class="
                  searchExpanded
                    ? 'i-lucide-chevrons-up h-3.5 w-3.5'
                    : 'i-lucide-chevrons-down h-3.5 w-3.5'
                "
              ></span>
            </template>
            {{ searchExpanded ? t('builder.dataTableCollapse') : t('builder.dataTableExpand') }}
          </n-button>
        </div>
      </div>

      <div
        v-else
        class="min-h-[28px] w-full rounded-md border border-dashed border-border/60 flex items-center justify-center text-[11px] text-muted-foreground"
      >
        {{ t('builder.dataTableSearchZoneHint') }}
      </div>
    </div>

    <!-- 内容区 -->
    <div class="p-2">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-medium text-muted-foreground">
          {{ t('builder.dataTableColumns') }}
        </span>
        <n-button text size="tiny" @click="modalOpen = true">
          <template #icon><span class="i-lucide-plus h-3 w-3"></span></template>
          {{ t('builder.dataTableAddColumn') }}
        </n-button>
      </div>
      <div v-if="childColumns.length" class="overflow-x-auto rounded-lg border border-border/50">
        <table class="w-full border-collapse text-left">
          <thead class="bg-muted/40">
            <tr :ref="dndColumns.containerRef">
              <th
                v-for="(col, idx) in dndColumns.items.value"
                :key="col.key"
                data-canvas-item="true"
                class="group relative px-3 py-2 text-xs font-medium text-foreground whitespace-nowrap select-none cursor-grab active:cursor-grabbing border-l border-border/60 first:border-l-0"
                :class="
                  isActiveColumn(idx)
                    ? 'border-solid border-b-2 border-b-[#a277ff] bg-[#a277ff]/[0.08] text-[#a277ff]'
                    : 'hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]'
                "
                :style="{ width: col.width ?? undefined }"
                @pointerdown.stop="selectColumn(idx)"
              >
                <span class="flex items-center gap-1.5 pr-3">
                  <span class="truncate">{{ col.title }}</span>
                  <span v-if="col.render" class="text-[10px] text-muted-foreground">
                    {{ col.render }}
                  </span>
                </span>
                <span
                  class="absolute top-1/2 -translate-y-1/2 right-1 hidden group-hover:inline-flex"
                >
                  <n-button
                    quaternary
                    size="tiny"
                    round
                    :aria-label="t('builder.deleteField')"
                    @pointerdown.stop.prevent
                    @click.stop="deleteColumn(idx)"
                    class="!h-[18px] !w-[18px] !text-muted-foreground hover:!text-red-600"
                  >
                    <template #icon><span class="i-lucide-x h-3 w-3"></span></template>
                  </n-button>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in sampleRows" :key="r" class="border-t border-border/40">
              <td
                v-for="col in childColumns"
                :key="col.key"
                class="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap"
              >
                <DataTableCellRenderer :column="col" :value="row[col.key]" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="min-h-[140px] flex items-center justify-center">
        <n-empty :description="t('builder.dataTableColumnHint')" />
      </div>
    </div>

    <!-- 新增列：弹窗选择字段元素（可搜索） -->
    <n-modal v-model:show="modalOpen" preset="card" class="max-w-[520px]">
      <template #header>
        <span class="text-sm font-semibold">
          {{ t('builder.dataTableAddColumn') }}
        </span>
      </template>
      <div class="space-y-3">
        <n-input
          v-model:value="columnKeyword"
          size="small"
          clearable
          :placeholder="t('builder.dataTableColumnSearch')"
        >
          <template #prefix>
            <span class="i-lucide-search h-3.5 w-3.5 text-muted-foreground"></span>
          </template>
        </n-input>
        <n-scrollbar class="max-h-[48vh]" content-class="pr-1">
          <div v-if="filteredFieldOptions.length" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <n-button
              v-for="item in filteredFieldOptions"
              :key="item.type"
              type="default"
              size="large"
              class="group flex flex-col items-center gap-1.5 rounded-md border border-border/50 bg-card px-2 py-3 text-[11px] text-muted-foreground transition-colors hover:border-[#7c9ef8] hover:bg-[#f0f4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a277ff] focus-visible:ring-offset-2 active:border-[#a277ff] active:bg-[#a277ff]/[0.08] active:text-[#a277ff] dark:hover:bg-[rgba(100,130,255,0.07)]"
              @click="pickColumnField(item.type)"
            >
              <span
                class="flex h-16px mr-4px w-16px items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-[#a277ff]/10 group-hover:text-[#a277ff]"
              >
                <span :class="`${item.icon} h-16px w-16px`"></span>
              </span>
              <span class="truncate w-full text-center font-medium text-foreground">{{
                item.label
              }}</span>
            </n-button>
          </div>
          <n-empty v-else class="py-10" :description="t('builder.dataTableColumnSearchEmpty')" />
        </n-scrollbar>
      </div>
      <template #footer>
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-muted-foreground">
            {{ t('builder.dataTableColumnCount', { count: fieldElementOptions.length }) }}
          </span>
          <n-button size="small" @click="modalOpen = false">
            {{ t('common.cancel') }}
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
