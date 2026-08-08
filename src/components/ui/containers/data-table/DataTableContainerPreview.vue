<script setup lang="ts">
import { computed, h, inject, ref, watch, type Ref } from 'vue'
import { NButton, NDataTable, NInput, NModal } from 'naive-ui'
import { runBindCode } from '@/utils/bind-runtime'
import { useFormDefinition } from '@/composables/form-fields'
import { useFormBuilderI18n } from '@/i18n/context'
import {
  columnsFromChildren,
  columnKind,
  normalizeRemoteResult,
  toColspan,
  toData,
  toRowKey,
  toPageSize,
} from './utils'
import DataTableCellRenderer from './DataTableCellRenderer.vue'
import DataTableRowCellInput from './DataTableRowCellInput.vue'
import type { DataTableColumn } from './types'

// 预览组件：运行时（FormSchemaRenderer）以 $cmp: dataTable 渲染。
// 结构：搜索区（容器 children 字段 → 输入框 + 搜索/重置）+ 内容区（表格，props.columns）。
// 数据通道：
//   - 固定数据（默认）：data 本地数组，pagination=true 时前端分页；
//   - 远程数据：remote=true 时执行节点 props.getData 里的 JS 代码拉取（runBindCode
//     执行，参数见 bindHint + page/pageSize/search，form 为当前表单数据）。

const props = withDefaults(
  defineProps<{
    nodeKey?: string
    dataTableKey?: string
    name?: string
    label?: string
    modelValue?: unknown[]
    columns?: DataTableColumn[]
    data?: Record<string, unknown>[]
    rowKey?: string
    bordered?: boolean
    size?: 'small' | 'medium' | 'large'
    scrollX?: number
    pagination?: boolean
    pageSize?: number
    remote?: boolean
    searchExpandable?: boolean
    // 远程获取数据的 JS 代码（设计侧编辑器编写，runBindCode 执行）
    getData?: string
  }>(),
  {
    modelValue: () => [],
    columns: () => [],
    data: () => [],
  },
)

const { t } = useFormBuilderI18n()
const { formId, formVersion } = useFormDefinition()
// 当前表单数据（FormSchemaRenderer 注入的响应式对象；未注入则用空对象）
const injectedFormData = inject<Ref<Record<string, unknown>> | null>('previewFormData', null)

const getDataCode = computed(() => {
  const code = props.getData
  return typeof code === 'string' && code.trim() ? code.trim() : ''
})
const useRemote = computed(() => props.remote === true && !!getDataCode.value)

// 分区契约（见 types.ts）：搜索区 = children（modelValue），列区 = props.columns。
// 搜索字段（name/label → key/title）渲染为输入框 + 搜索/重置
const searchFields = computed(() => columnsFromChildren((props.modelValue as any[]) ?? []))
const columns = computed<DataTableColumn[]>(() =>
  Array.isArray(props.columns) ? props.columns : [],
)
// n-data-table 的列 render 必须是函数；我们的 render 是字段类型字符串（设计态配置），
// 直接透传会让 naive-ui 调用字符串报错（Cell.mjs: render(row, index)）。
// 这里剥离 render/renderProps/element，换用函数 render 按列来源元素类型只读渲染单元格。
const tableColumns = computed(() =>
  columns.value.map((col) => {
    const naiveCol: any = { ...col }
    delete naiveCol.render
    delete naiveCol.renderProps
    delete naiveCol.element
    naiveCol.render = (row: Record<string, unknown>) =>
      h(DataTableCellRenderer, { column: col, value: row[col.key] })
    return naiveCol
  }),
)
const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const rowKey = computed(() => toRowKey({ data: props.data, rowKey: props.rowKey }, 'id'))
const pageSizeDefault = computed(() =>
  toPageSize({ data: props.data, pageSize: props.pageSize }, 10),
)

// ─── 搜索区：按搜索字段录入条件，搜索/重置过滤 ────────────────────────────────
const searchValues = ref<Record<string, string>>({})
const searchExpanded = ref(false)
watch(
  () => searchFields.value.map((f) => f.key).join('|'),
  () => {
    const next: Record<string, string> = {}
    for (const f of searchFields.value) next[f.key] = searchValues.value[f.key] ?? ''
    searchValues.value = next
  },
  { immediate: true },
)

const matchesSearch = (row: Record<string, unknown>) => {
  const entries = Object.entries(searchValues.value).filter(
    ([, v]) => String(v ?? '').trim() !== '',
  )
  if (entries.length === 0) return true
  return entries.every(([key, val]) =>
    String(row[key] ?? '')
      .toLowerCase()
      .includes(String(val).toLowerCase()),
  )
}

// ─── 固定数据：n-data-table 本地分页 ────────────────────────────────────────────
const localRows = ref<Record<string, unknown>[]>([])
const fixedBase = computed(() => [...toData({ data: props.data }), ...localRows.value])
const localPagination = computed(() =>
  props.pagination === true ? { pageSize: pageSizeDefault.value } : false,
)

// ─── 远程分页：动态拉取 ────────────────────────────────────────────────────────
const loading = ref(false)
const remoteRows = ref<Record<string, unknown>[]>([])
const remoteTotal = ref(0)
const pageRef = ref(1)

const remotePagination = computed(() =>
  props.remote === true
    ? {
        page: pageRef.value,
        pageSize: pageSizeDefault.value,
        itemCount: remoteTotal.value,
      }
    : false,
)

const displayRows = computed(() => {
  const base = useRemote.value ? remoteRows.value : fixedBase.value
  return base.filter(matchesSearch)
})

async function fetchRemote() {
  if (!useRemote.value) return
  loading.value = true
  try {
    const form = injectedFormData?.value ?? {}
    const res = await runBindCode(
      getDataCode.value,
      undefined,
      { form },
      formId.value,
      formVersion.value,
      { page: pageRef.value, pageSize: pageSizeDefault.value, search: { ...searchValues.value } },
    )
    const { rows, total } = normalizeRemoteResult(res)
    remoteTotal.value = total
    remoteRows.value = rows
  } catch (e) {
    console.error('[dataTable] fetchRemote failed', e)
    remoteRows.value = []
    remoteTotal.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  () => [useRemote.value, pageRef.value, pageSizeDefault.value],
  () => {
    if (useRemote.value) fetchRemote()
  },
  { immediate: true },
)

function onPageChange(page: number) {
  pageRef.value = page
}

function applySearch() {
  if (useRemote.value) {
    pageRef.value = 1
    fetchRemote()
  }
}

function resetSearch() {
  for (const k of Object.keys(searchValues.value)) searchValues.value[k] = ''
  if (useRemote.value) {
    pageRef.value = 1
    fetchRemote()
  }
}

function refreshData() {
  if (useRemote.value) {
    pageRef.value = 1
    fetchRemote()
  } else {
    localRows.value = []
  }
}

// ─── 新增数据行（弹窗按列录入，控件按列来源元素类型渲染）────────────────────────
const addOpen = ref(false)
const draftRow = ref<Record<string, unknown>>({})
let localSeq = 0

function openAdd() {
  const init: Record<string, unknown> = {}
  for (const c of columns.value) {
    if (!c.key) continue
    const el = c.element
    // 优先取来源元素 DSL 的默认值；无值再按元素类型走兜底形态
    if (el && el.value !== undefined) {
      init[c.key] = el.value
      continue
    }
    const kind = columnKind(el?.type ?? c.render)
    if (kind === 'switch') init[c.key] = false
    else if (kind === 'rate') init[c.key] = 0
    else init[c.key] = ''
  }
  draftRow.value = init
  addOpen.value = true
}

function saveAdd() {
  const row: Record<string, unknown> = { ...draftRow.value }
  const rk = rowKey.value
  if (rk && !row[rk]) row[rk] = `local_${Date.now()}_${localSeq++}`
  localRows.value = [...localRows.value, row]
  addOpen.value = false
}
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 pt-2">
    <div v-if="title" class="px-3 pt-2 pb-1 text-12px font-bold">{{ title }}</div>

    <!-- 搜索区：有搜索字段才显示 -->
    <div v-if="searchFields.length" class="border-b border-border/50 px-3 py-2">
      <div class="flex items-center gap-2">
        <div
          :class="[
            'flex-1 min-w-0 items-center gap-2',
            searchExpanded ? 'flex flex-wrap' : 'flex flex-nowrap overflow-hidden',
          ]"
        >
          <div v-for="sf in searchFields" :key="sf.key" class="flex items-center gap-1.5 shrink-0">
            <span class="text-[11px] text-muted-foreground">{{ sf.title }}</span>
            <n-input
              :value="searchValues[sf.key] ?? ''"
              size="small"
              clearable
              :placeholder="sf.title"
              class="!w-40"
              @update:value="(v) => (searchValues[sf.key] = v)"
            />
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <n-button size="small" @click="applySearch">
            <template #icon><span class="i-lucide-search h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableSearch') }}
          </n-button>
          <n-button type="primary" size="small" @click="resetSearch">
            <template #icon><span class="i-lucide-rotate-ccw h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableReset') }}
          </n-button>
          <n-button
            v-if="props.searchExpandable"
            text
            size="small"
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
    </div>

    <!-- 内容区工具栏 -->
    <div class="flex items-center px-3 py-2 border-b border-border/50">
      <div class="ml-auto flex items-center gap-1">
        <n-button text size="small" @click="openAdd">
          <template #icon><span class="i-lucide-plus h-3.5 w-3.5"></span></template>
          {{ t('builder.dataTableAdd') }}
        </n-button>
        <n-button text size="small" :loading="loading" @click="refreshData">
          <template #icon><span class="i-lucide-refresh-cw h-3.5 w-3.5"></span></template>
          {{ t('builder.dataTableRefresh') }}
        </n-button>
      </div>
    </div>

    <div class="p-2">
      <n-data-table
        :columns="tableColumns as any"
        :data="displayRows as any"
        :row-key="(row: any) => row[rowKey]"
        :bordered="props.bordered !== false"
        :size="(props.size ?? 'medium') as any"
        :scroll-x="props.scrollX"
        :loading="loading"
        :pagination="useRemote ? remotePagination : localPagination"
        :remote="useRemote"
        @update:page="onPageChange"
      />
    </div>

    <n-modal v-model:show="addOpen" preset="card" class="max-w-[520px]">
      <template #header>
        <span class="text-sm font-medium">{{ t('builder.dataTableAddRowTitle') }}</span>
      </template>
      <div class="grid grid-cols-12 gap-x-3 gap-y-3">
        <div v-for="col in columns" :key="col.key" :class="`col-span-${toColspan(col)}`">
          <div class="mb-1 text-xs text-muted-foreground">{{ col.title }}</div>
          <div class="min-w-0">
            <DataTableRowCellInput
              :column="col"
              :value="draftRow[col.key]"
              @update:value="(v) => (draftRow[col.key] = v)"
            />
          </div>
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <n-button size="small" @click="addOpen = false">{{ t('common.cancel') }}</n-button>
        <n-button size="small" type="primary" @click="saveAdd">{{ t('common.save') }}</n-button>
      </div>
    </n-modal>
  </div>
</template>
