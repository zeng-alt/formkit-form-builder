<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NButton, NDropdown, NPopover, NTooltip, type MenuOption } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { createDefaultFormElements, getElementTypeBySchema } from '@/elements'
import { columnIcon, createColumn, duplicateColumn } from './column-factory'
import { buildSampleRows, columnsFromChildren, toPageSize, toRowKey } from './utils'
import DataTableCellRenderer from './DataTableCellRenderer.vue'
import DataTableDataGridModal from './DataTableDataGridModal.vue'
import DataTableFieldPicker from './DataTableFieldPicker.vue'
import DataTableSearchField from './DataTableSearchField.vue'
import type { DataTableColumn } from './types'

// 画布组件：数据表格容器，视觉与运行时（DataTableContainerPreview.vue）对齐，同时保留
// 设计态的选中 / 拖动 / 编辑能力。分区契约（见 types.ts）：
//   搜索区 = 容器 children（拖入的字段即搜索条件），空时显示 drop 提示；
//   内容区 = props.columns（纯列定义），表头「+」格弹出字段选择器新增列，可拖拽排序 /
//   删除 / 调宽；固定模式的行增删改统一走 DataTableDataGridModal。
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
    /** 固定数据模式：是否允许新增 / 编辑 / 删除（两种数据来源模式下都显示对应入口） */
    allowAdd?: boolean
    allowEdit?: boolean
    allowDelete?: boolean
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
const searchExpanded = ref(false)
const showSearchPicker = ref(false)

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
  containerLabel: () => t('elements.dataTable.name'),
})

// 追加一个搜索字段到 children（复用调色板默认字段 schema）
const defaultFieldByType = computed(() => {
  const map = new Map<string, FormKitSchemaFormKit>()
  for (const node of createDefaultFormElements(t)) {
    const type = getElementTypeBySchema(node)
    if (type) map.set(type, node)
  }
  return map
})

function addSearchField(type: string) {
  const source = defaultFieldByType.value.get(type)
  if (!source) return
  const cloned = JSON.parse(JSON.stringify(source)) as FormKitSchemaFormKit
  dndSearch.items.value = [...dndSearch.items.value, cloned]
  dndSearch.emitUpdate()
}

function onPickSearchField(type: string) {
  addSearchField(type)
  showSearchPicker.value = false
}

const deleteSearchItem = (index: number) => {
  dndSearch.items.value = dndSearch.items.value.filter((_, i) => i !== index)
  dndSearch.emitUpdate()
}

// 搜索区渲染实际控件：schema 子节点（children）→ { key, title, element }，按来源元素渲染输入控件
const searchColumns = computed(() => columnsFromChildren(dndSearch.items.value))
// 画布本地搜索值（仅展示/演示用，不入表单数据模型；搜索过滤在预览组件中执行）
const canvasSearchValues = ref<Record<string, unknown>>({})
function onSearchValue(key: string | undefined, v: unknown) {
  if (key) canvasSearchValues.value[key] = v
}
function searchValueAt(idx: number): unknown {
  const col = searchColumns.value[idx]
  return col ? (canvasSearchValues.value[col.key] ?? '') : ''
}

const onSelect = (child: any) => {
  const key = child?.__key as string | undefined
  if (!key) return
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
  else emit('select', key)
}
const isSelected = (child: any) =>
  typeof child?.__key === 'string' && child.__key === selectedKey.value

// ─── 内容区（props.columns）───────────────────────────────────────────────────
const columnItems = computed(() => (Array.isArray(props.columns) ? props.columns : []))
const showColumnPicker = ref(false)

function patchColumns(next: DataTableColumn[]) {
  const k = props.dataTableKey
  if (!k || !canvasCtx?.updateNodePropsByKey) return
  canvasCtx.updateNodePropsByKey(k, { columns: next.length ? next : undefined })
}

const dndColumns = useContainerDragAndDrop<DataTableColumn>({
  modelValue: columnItems,
  onUpdateModelValue: patchColumns,
})

const childColumns = computed(() => dndColumns.items.value)

function addColumn(type: string) {
  const existingKeys = childColumns.value.map((c) => c.key)
  patchColumns([...childColumns.value, createColumn(type, t, existingKeys)])
}

function onPickColumn(type: string) {
  addColumn(type)
  showColumnPicker.value = false
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

// ⋮ 菜单：左移 / 右移（首末列禁用）/ 复制列 / 删除列
function columnMenuOptions(idx: number): MenuOption[] {
  const total = childColumns.value.length
  return [
    { key: 'moveLeft', label: t('builder.dataTableCanvas.columnMoveLeft'), disabled: idx <= 0 },
    {
      key: 'moveRight',
      label: t('builder.dataTableCanvas.columnMoveRight'),
      disabled: idx >= total - 1,
    },
    { key: 'duplicate', label: t('builder.dataTableCanvas.columnDuplicate') },
    { key: 'delete', label: t('builder.dataTableCanvas.columnDelete') },
  ]
}

function onColumnMenuSelect(idx: number, key: string) {
  const cols = childColumns.value
  if (key === 'moveLeft' && idx > 0) {
    const next = [...cols]
    ;[next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!]
    patchColumns(next)
    return
  }
  if (key === 'moveRight' && idx < cols.length - 1) {
    const next = [...cols]
    ;[next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!]
    patchColumns(next)
    return
  }
  if (key === 'duplicate') {
    const existingKeys = cols.map((c) => c.key)
    const dup = duplicateColumn(cols[idx]!, existingKeys, t('common.copySuffix'))
    patchColumns([...cols.slice(0, idx + 1), dup, ...cols.slice(idx + 1)])
    return
  }
  if (key === 'delete') {
    const next = cols.filter((_, i) => i !== idx)
    patchColumns(next)
    if (selectedKey.value === props.dataTableKey && selectedColumnIndex.value !== null) {
      selectedColumnIndex.value = next.length
        ? Math.min(selectedColumnIndex.value, next.length - 1)
        : null
    }
  }
}

// ─── 拖右边缘调列宽：本地实时宽度 + 指针旁气泡，松手才一次性提交 ──────────────────
type ResizeState = { idx: number; startX: number; startWidth: number; width: number }
const resizing = ref<ResizeState | null>(null)
const resizeBubble = ref<{ x: number; y: number; width: number } | null>(null)

function clampWidth(n: number): number {
  return Math.max(60, Math.min(600, Math.round(n)))
}

function thStyle(col: DataTableColumn, idx: number): Record<string, string> {
  if (resizing.value && resizing.value.idx === idx) return { width: `${resizing.value.width}px` }
  if (col.width) return { width: `${col.width}px` }
  return { minWidth: '120px' }
}

function onResizeMove(e: PointerEvent) {
  const state = resizing.value
  if (!state) return
  state.width = clampWidth(state.startWidth + (e.clientX - state.startX))
  resizeBubble.value = { x: e.clientX, y: e.clientY, width: state.width }
}

function stopResizing() {
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', stopResizing)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function onResizeEnd() {
  const state = resizing.value
  stopResizing()
  resizing.value = null
  resizeBubble.value = null
  if (!state) return
  const next = childColumns.value.map((c, i) =>
    i === state.idx ? { ...c, width: state.width } : c,
  )
  patchColumns(next)
}

function onResizeStart(e: PointerEvent, idx: number, col: DataTableColumn) {
  const cell = (e.currentTarget as HTMLElement).parentElement
  const startWidth = col.width ?? clampWidth(cell?.getBoundingClientRect().width ?? 120)
  resizing.value = { idx, startX: e.clientX, startWidth, width: startWidth }
  resizeBubble.value = { x: e.clientX, y: e.clientY, width: startWidth }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

// 双击热区：恢复自动宽度（删除 width，不写 undefined 占位）
function onResizeReset(idx: number) {
  const next = childColumns.value.map((c, i) => {
    if (i !== idx || c.width === undefined) return c
    const rest: DataTableColumn = { ...c }
    delete rest.width
    return rest
  })
  patchColumns(next)
}

onBeforeUnmount(() => {
  if (resizing.value) stopResizing()
})

// ─── 内容区列 / 数据解析 ───────────────────────────────────────────────────────
const resolvedRowKey = computed(() => toRowKey({ data: props.data, rowKey: props.rowKey }, 'id'))
const resolvedPageSize = computed(() =>
  toPageSize({ data: props.data, pageSize: props.pageSize }, 10),
)

// ─── 固定数据行增删改：统一走 DataTableDataGridModal，
//     画布内只负责打开弹窗与落盘 ─────────────────────────────────────────────
const dataRows = computed(() => (Array.isArray(props.data) ? props.data : []))
// 固定数据且有真实数据时渲染真实行；否则（无数据 / 远程模式）渲染占位示例数据
const hasRealData = computed(() => !props.remote && dataRows.value.length > 0)
const isSampleMode = computed(() => !hasRealData.value)
const sampleRows = computed(() => buildSampleRows(childColumns.value, 3))
const displayRows = computed(() =>
  hasRealData.value ? dataRows.value.slice(0, 5) : sampleRows.value,
)
const showActions = computed(() => props.allowEdit === true || props.allowDelete === true)

const dataGridOpen = ref(false)
function openDataGrid() {
  dataGridOpen.value = true
}

function patchData(next: Record<string, unknown>[]) {
  const k = props.dataTableKey
  if (!k || !canvasCtx?.updateNodePropsByKey) return
  canvasCtx.updateNodePropsByKey(k, { data: next.length ? next : undefined })
}

function deleteRow(idx: number) {
  patchData(dataRows.value.filter((_, i) => i !== idx))
}

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)

const modeText = computed(() =>
  props.remote === true ? t('builder.dataTableRemote') : t('builder.dataTableFixed'),
)

// 底栏左侧标签：示例/远程数据说明，或真实数据超过展示行数时的总数提示
const bottomLabel = computed(() => {
  if (props.remote === true) return t('builder.dataTableCanvas.remoteDataLabel')
  if (isSampleMode.value) return t('builder.dataTableCanvas.sampleDataLabel')
  if (dataRows.value.length > 5)
    return t('builder.dataTableCanvas.totalCount', { count: dataRows.value.length })
  return ''
})
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 bg-card group/dt">
    <!-- 顶栏：标题 + 数据来源标签（+ 分页信息）；右侧新增按钮 -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-border/50">
      <div class="flex items-center gap-2 min-w-0">
        <span v-if="title" class="text-[13px] font-bold truncate">{{ title }}</span>
        <span
          class="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted/40"
        >
          <span class="i-lucide-table-2 h-3.5 w-3.5"></span>
          {{ modeText }}
          <template v-if="props.pagination === true">
            · {{ t('builder.dataTableCanvas.perPage', { count: resolvedPageSize }) }}
          </template>
        </span>
      </div>
      <div v-if="props.allowAdd === true" class="shrink-0">
        <n-tooltip v-if="props.remote === true" trigger="hover">
          <template #trigger>
            <n-button size="small" type="primary" disabled>
              <template #icon><span class="i-lucide-plus h-3.5 w-3.5"></span></template>
              {{ t('builder.dataTableAdd') }}
            </n-button>
          </template>
          {{ t('builder.dataTableCanvas.remoteAddTooltip') }}
        </n-tooltip>
        <n-button v-else size="small" type="primary" @click="openDataGrid">
          <template #icon><span class="i-lucide-plus h-3.5 w-3.5"></span></template>
          {{ t('builder.dataTableAdd') }}
        </n-button>
      </div>
    </div>

    <!-- 搜索区（容器 children）：拖入字段即搜索条件 -->
    <div class="border-b border-border/50 px-3 py-2">
      <div v-if="searchItems.length" class="flex items-start gap-2">
        <div
          :ref="dndSearch.containerRef"
          :class="[
            'flex-1 min-w-0 items-center gap-2',
            searchExpanded
              ? 'flex flex-wrap'
              : 'flex flex-nowrap overflow-x-auto thin-scrollbar pb-1',
          ]"
        >
          <div
            v-for="(item, idx) in dndSearch.items.value"
            :key="item?.__key || item?.name || idx"
            data-canvas-item="true"
            :class="[
              'group/sf relative flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-grab active:cursor-grabbing',
              isSelected(item)
                ? 'border-solid border-[#a277ff] bg-[#a277ff]/[0.08] text-[#a277ff]'
                : 'border-dashed border-transparent hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]',
            ]"
            @pointerdown.stop="onSelect(item)"
          >
            <span class="whitespace-nowrap text-[11px] text-muted-foreground">{{
              searchColumns[idx]?.title
            }}</span>
            <span data-canvas-edit @pointerdown.stop>
              <DataTableSearchField
                :column="searchColumns[idx]"
                :value="searchValueAt(idx)"
                @update:value="(v) => onSearchValue(searchColumns[idx]?.key, v)"
              />
            </span>
            <n-button
              quaternary
              size="tiny"
              round
              :aria-label="t('builder.deleteField')"
              @pointerdown.stop.prevent
              @click.stop="deleteSearchItem(idx)"
              class="absolute -top-1.5 -right-1.5 shrink-0 !h-[16px] !w-[16px] rounded-full !bg-card !border !border-border/60 opacity-0 transition-opacity group-hover/sf:opacity-100 !text-muted-foreground hover:!text-red-600"
            >
              <template #icon><span class="i-lucide-x h-3 w-3"></span></template>
            </n-button>
          </div>

          <!-- 表格（本组件整体）悬停时才显示的「+ 条件」幽灵按钮，追加在条件末尾 -->
          <n-popover
            trigger="click"
            placement="bottom-start"
            :show="showSearchPicker"
            @update:show="(v) => (showSearchPicker = v)"
          >
            <template #trigger>
              <button
                type="button"
                class="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover/dt:opacity-100 hover:text-[#a277ff] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)] border-0 bg-transparent cursor-pointer"
              >
                <span class="i-lucide-plus h-3 w-3"></span>
                {{ t('builder.dataTableCanvas.addConditionShort') }}
              </button>
            </template>
            <DataTableFieldPicker @pick="onPickSearchField" />
          </n-popover>
        </div>

        <!-- 与运行时一致：重置（默认）在前、搜索（主按钮）在后；画布上仅展示 -->
        <div class="flex items-center gap-1 shrink-0">
          <n-button size="small">
            <template #icon><span class="i-lucide-rotate-ccw h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableReset') }}
          </n-button>
          <n-button type="primary" size="small">
            <template #icon><span class="i-lucide-search h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableSearch') }}
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
        class="min-h-[28px] w-full rounded-md border border-dashed border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
      >
        <span>{{ t('builder.dataTableCanvas.searchDragHint') }}</span>
        <n-popover
          trigger="click"
          placement="bottom"
          :show="showSearchPicker"
          @update:show="(v) => (showSearchPicker = v)"
        >
          <template #trigger>
            <button
              type="button"
              class="flex items-center gap-1 text-[#a277ff] hover:underline border-0 bg-transparent p-0 cursor-pointer"
            >
              <span class="i-lucide-plus h-3 w-3"></span>
              {{ t('builder.dataTableCanvas.addSearchCondition') }}
            </button>
          </template>
          <DataTableFieldPicker @pick="onPickSearchField" />
        </n-popover>
      </div>
    </div>

    <!-- 内容区：表头（列）+ 内容（真实/示例数据）-->
    <div class="p-2">
      <div
        v-if="childColumns.length"
        class="overflow-x-auto rounded-lg border border-border/50 thin-scrollbar"
      >
        <table class="w-full border-collapse text-left">
          <thead>
            <tr :ref="dndColumns.containerRef">
              <th
                v-for="(col, idx) in dndColumns.items.value"
                :key="col.key"
                data-canvas-item="true"
                class="group/th relative h-9 select-none cursor-grab active:cursor-grabbing border-l border-border/60 first:border-l-0 text-xs font-medium"
                :class="
                  isActiveColumn(idx)
                    ? 'bg-[#a277ff]/[0.06] text-[#a277ff] border-b-2 border-b-[#a277ff]'
                    : 'bg-muted/40 hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]'
                "
                :style="thStyle(col, idx)"
                @pointerdown.stop="selectColumn(idx)"
              >
                <div class="flex items-center gap-1.5 px-2.5 h-full">
                  <span
                    class="i-lucide-grip-vertical h-3 w-3 shrink-0 text-muted-foreground opacity-0 pointer-events-none group-hover/th:opacity-100"
                  ></span>
                  <span
                    v-if="columnIcon(col)"
                    :class="`${columnIcon(col)} h-3.5 w-3.5 shrink-0 text-muted-foreground`"
                  ></span>
                  <span class="truncate flex-1">{{ col.title }}</span>
                  <n-dropdown
                    :options="columnMenuOptions(idx)"
                    trigger="click"
                    @select="(k: string) => onColumnMenuSelect(idx, k)"
                  >
                    <button
                      type="button"
                      class="shrink-0 flex h-[18px] w-[18px] items-center justify-center rounded opacity-0 group-hover/th:opacity-100 text-muted-foreground hover:text-[#a277ff] hover:bg-[#a277ff]/10 border-0 bg-transparent p-0 cursor-pointer"
                      data-testid="data-table-column-menu-trigger"
                      @pointerdown.stop
                      @click.stop
                    >
                      <span class="i-lucide-more-vertical h-3.5 w-3.5"></span>
                    </button>
                  </n-dropdown>
                </div>
                <!-- 拖右边缘调列宽热区 -->
                <span
                  class="group/rz absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize"
                  data-testid="data-table-column-resize"
                  @pointerdown.stop.prevent="onResizeStart($event, idx, col)"
                  @dblclick.stop.prevent="onResizeReset(idx)"
                >
                  <!-- 悬停热区或正在调这一列时显示紫色竖线 -->
                  <span
                    :class="[
                      'absolute inset-y-0 right-0 w-0.5 group-hover/rz:bg-[#a277ff]',
                      resizing?.idx === idx ? 'bg-[#a277ff]' : 'bg-transparent',
                    ]"
                  ></span>
                </span>
              </th>
              <!-- 非数据子元素：新增列，必须放在所有列 th 之后，不带 data-canvas-item -->
              <th class="w-11 px-0 text-center bg-muted/40">
                <n-popover
                  trigger="click"
                  placement="bottom-end"
                  :show="showColumnPicker"
                  @update:show="(v) => (showColumnPicker = v)"
                >
                  <template #trigger>
                    <button
                      type="button"
                      class="h-9 w-11 flex items-center justify-center text-muted-foreground hover:text-[#a277ff] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)] border-0 bg-transparent p-0 cursor-pointer"
                      :aria-label="t('builder.dataTableAddColumn')"
                      data-testid="data-table-add-column-btn"
                    >
                      <span class="i-lucide-plus h-4 w-4"></span>
                    </button>
                  </template>
                  <DataTableFieldPicker @pick="onPickColumn" />
                </n-popover>
              </th>
              <th
                v-if="showActions"
                class="px-3 h-9 text-xs font-medium text-foreground whitespace-nowrap border-l border-border/60 bg-muted/40"
              >
                {{ t('builder.dataTableActions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, r) in displayRows"
              :key="r"
              class="border-t border-border/40"
              @dblclick="!isSampleMode && openDataGrid()"
            >
              <td
                v-for="(col, idx) in childColumns"
                :key="col.key"
                class="px-2.5 py-2 text-xs whitespace-nowrap"
                :class="[
                  isSampleMode ? 'opacity-60' : 'text-muted-foreground',
                  isActiveColumn(idx) ? 'bg-[#a277ff]/[0.06]' : '',
                ]"
              >
                <DataTableCellRenderer :column="col" :value="row[col.key]" />
              </td>
              <td v-if="showActions" class="px-3 py-2 text-xs whitespace-nowrap">
                <div
                  class="flex items-center gap-2.5"
                  :class="isSampleMode ? 'opacity-40 pointer-events-none' : ''"
                >
                  <n-button
                    v-if="props.allowEdit === true"
                    text
                    size="tiny"
                    type="primary"
                    :aria-label="t('builder.dataTableEditRowTitle')"
                    @click.stop="openDataGrid"
                  >
                    <template #icon><span class="i-lucide-pencil h-3.5 w-3.5"></span></template>
                  </n-button>
                  <n-button
                    v-if="props.allowDelete === true"
                    text
                    size="tiny"
                    type="error"
                    :aria-label="t('builder.dataTableDeleteRowTitle')"
                    @click.stop="deleteRow(r)"
                  >
                    <template #icon><span class="i-lucide-trash-2 h-3.5 w-3.5"></span></template>
                  </n-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-else
        class="min-h-[100px] flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"
      >
        <span>{{ t('builder.dataTableCanvas.noColumns') }}</span>
        <span>·</span>
        <n-popover
          trigger="click"
          placement="bottom"
          :show="showColumnPicker"
          @update:show="(v) => (showColumnPicker = v)"
        >
          <template #trigger>
            <button
              type="button"
              class="flex items-center gap-1 text-[#a277ff] hover:underline border-0 bg-transparent p-0 cursor-pointer"
              data-testid="data-table-add-column-btn"
            >
              <span class="i-lucide-plus h-3 w-3"></span>
              {{ t('builder.dataTableCanvas.addFirstColumn') }}
            </button>
          </template>
          <DataTableFieldPicker @pick="onPickColumn" />
        </n-popover>
      </div>

      <!-- 底栏：左侧数据来源说明，右侧（分页开启时）静态分页展示 -->
      <div
        v-if="childColumns.length"
        class="flex items-center justify-between px-1 pt-2 text-[11px] text-muted-foreground"
      >
        <span>{{ bottomLabel }}</span>
        <span v-if="props.pagination === true" class="flex items-center gap-1.5">
          <!-- 远程 / 示例数据没有真实总数，只展示页码与每页条数 -->
          <template v-if="hasRealData">
            {{ t('builder.dataTableCanvas.totalCount', { count: dataRows.length }) }}
          </template>
          <span class="i-lucide-chevron-left h-3 w-3"></span>
          <span>1 2 3</span>
          <span class="i-lucide-chevron-right h-3 w-3"></span>
          {{ t('builder.dataTableCanvas.pageSizeSuffix', { count: resolvedPageSize }) }}
        </span>
      </div>
    </div>

    <!-- 固定数据的表格式编辑弹窗：新增 / 编辑均打开同一弹窗 -->
    <DataTableDataGridModal
      :show="dataGridOpen"
      :columns="childColumns"
      :data="dataRows"
      :row-key="resolvedRowKey"
      @update:show="(v) => (dataGridOpen = v)"
      @save="patchData"
    />

    <!-- 调列宽度气泡：跟随指针，仅拖动时显示 -->
    <Teleport to="body">
      <div
        v-if="resizeBubble"
        class="fixed z-[9999] pointer-events-none rounded bg-[#a277ff] px-1.5 py-0.5 text-[11px] font-medium text-white shadow"
        :style="{ left: `${resizeBubble.x + 12}px`, top: `${resizeBubble.y - 24}px` }"
      >
        {{ resizeBubble.width }}px
      </div>
    </Teleport>
  </div>
</template>
