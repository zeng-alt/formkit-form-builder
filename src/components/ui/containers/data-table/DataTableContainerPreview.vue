<script setup lang="ts">
import { computed, defineComponent, h, inject, ref, watch, type Ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NScrollbar,
  NMessageProvider,
  useMessage,
  type MessageApi,
} from 'naive-ui'
import { runBindCode } from '@/utils/bind-runtime'
import { useBinderHttp } from '@/composables/use-bind-http'
import { useFormDefinition } from '@/composables/form-fields'
import { useFormBuilderI18n } from '@/i18n/context'
import {
  columnsFromChildren,
  columnKind,
  evaluateColumnExpr,
  isColumnVisible,
  normalizeRemoteResult,
  toColspan,
  toData,
  toRowKey,
  toPageSize,
} from './utils'
import DataTableCellRenderer from './DataTableCellRenderer.vue'
import DataTableRowCellInput from './DataTableRowCellInput.vue'
import DataTableSearchField from './DataTableSearchField.vue'
import type { DataTableColumn } from './types'

// 根节点是 n-message-provider（Fragment 渲染，无法继承属性）；DSL 透传的 id 等
// 非 props 属性走 attrs 会触发 Vue 警告，这里显式关闭继承（这些 attrs 本无用途）。
defineOptions({ inheritAttrs: false })

// 预览组件：运行时（FormSchemaRenderer）以 $cmp: dataTable 渲染。
// 结构：搜索区（容器 children 字段 → 输入框 + 搜索/重置）+ 内容区（表格，props.columns）。
// 数据通道：
//   - 固定数据（默认）：data 本地数组，pagination=true 时前端分页；
//   - 远程数据：remote=true 时执行节点 props.getData 里的 JS 代码拉取（runBindCode
//     执行，参数见 bindHint + page/pageSize/search，form 为当前表单数据）。

// 消息宿主：远程新增/编辑/删除的成功与失败提示（n-message）。
// NMessageProvider 渲染为 Fragment + Teleport（不产生包裹节点），useMessage 需在子组件内调用。
const MessageHost = defineComponent({
  setup(_, { expose }) {
    const message = useMessage()
    expose({ message })
    return () => null
  },
})
const messageHost = ref<{ message: MessageApi } | null>(null)
const message = computed(() => messageHost.value?.message)

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
    modalWidth?: number
    pagination?: boolean
    pageSize?: number
    remote?: boolean
    searchExpandable?: boolean
    // 远程获取数据的 JS 代码（设计侧编辑器编写，runBindCode 执行）
    getData?: string
    /** 远程新增数据的 JS 代码（runBindCode 执行，参数：row · form · axios） */
    createData?: string
    /** 远程编辑数据的 JS 代码（runBindCode 执行，参数：row · form · axios） */
    updateData?: string
    /** 远程删除数据的 JS 代码（runBindCode 执行，参数：row · form · axios） */
    deleteData?: string
    /** 固定数据模式：是否允许新增 / 编辑 / 删除（直接操作 data） */
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

const { t } = useFormBuilderI18n()
const { formId, formVersion } = useFormDefinition()
// 当前表单数据（FormSchemaRenderer 注入的响应式对象；未注入则用空对象）
const injectedFormData = inject<Ref<Record<string, unknown>> | null>('previewFormData', null)
const bindAxios = useBinderHttp()

const getDataCode = computed(() => {
  const code = props.getData
  return typeof code === 'string' && code.trim() ? code.trim() : ''
})
const createDataCode = computed(() => {
  const code = props.createData
  return typeof code === 'string' && code.trim() ? code.trim() : ''
})
const updateDataCode = computed(() => {
  const code = props.updateData
  return typeof code === 'string' && code.trim() ? code.trim() : ''
})
const deleteDataCode = computed(() => {
  const code = props.deleteData
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
const tableColumns = computed(() => {
  const cols: any[] = columns.value.map((col) => {
    const naiveCol: any = { ...col }
    delete naiveCol.render
    delete naiveCol.renderProps
    delete naiveCol.element
    naiveCol.render = (row: Record<string, unknown>) =>
      h(DataTableCellRenderer, { column: col, value: row[col.key] })
    return naiveCol
  })
  // 固定数据模式：按开关追加「操作」列（编辑/删除直接改 data）；
  // 远程模式：allowEdit / allowDelete 为真同样追加，编辑走 updateData、删除走 deleteData（runBindCode 执行后刷新当前页）
  if (props.allowEdit === true || props.allowDelete === true) {
    cols.push({
      key: 'actions',
      title: t('builder.dataTableActions'),
      width: 96,
      render: (row: Record<string, unknown>) =>
        h('div', { class: 'flex items-center gap-1' }, [
          props.allowEdit === true
            ? h(
                NButton,
                { size: 'tiny', text: true, type: 'primary', onClick: () => openEdit(row) },
                { icon: () => h('span', { class: 'i-lucide-pencil h-3.5 w-3.5' }) },
              )
            : null,
          props.allowDelete === true
            ? h(
                NButton,
                {
                  size: 'tiny',
                  text: true,
                  type: 'error',
                  style: 'margin-left: 12px;',
                  onClick: () => deleteRow(row),
                },
                { icon: () => h('span', { class: 'i-lucide-trash-2 h-3.5 w-3.5' }) },
              )
            : null,
        ]),
    })
  }
  return cols
})
const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const rowKey = computed(() => toRowKey({ data: props.data, rowKey: props.rowKey }, 'id'))
const pageSizeDefault = computed(() =>
  toPageSize({ data: props.data, pageSize: props.pageSize }, 10),
)
// 新增/编辑弹窗宽度：缺省 520px；配置后固定宽度并限制最大 90vw，高度始终随内容自适应
const addModalWidth = computed(() => {
  const w = Number(props.modalWidth)
  return Number.isFinite(w) && w > 0 ? w : 520
})

// ─── 搜索区：按搜索字段录入条件，搜索/重置过滤 ────────────────────────────────
// 值类型放宽为 unknown：搜索控件按来源元素渲染，select/switch 等值未必是字符串
const searchValues = ref<Record<string, unknown>>({})
const searchExpanded = ref(false)
watch(
  () => searchFields.value.map((f) => f.key).join('|'),
  () => {
    const next: Record<string, unknown> = {}
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

// ─── 固定数据：工作副本 + n-data-table 本地分页 ──────────────────────────────────
// 新增/编辑/删除直接操作 dataRows（props.data 的可变副本）；props.data 外部变化时重新同步
const dataRows = ref<Record<string, unknown>[]>([])
watch(
  () => props.data,
  (next) => {
    dataRows.value = toData({ data: next }).map((r) => ({ ...r }))
  },
  { immediate: true, deep: true },
)
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
  const base = useRemote.value ? remoteRows.value : dataRows.value
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
      bindAxios,
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
    dataRows.value = toData({ data: props.data }).map((r) => ({ ...r }))
  }
}

// ─── 新增 / 编辑数据行（弹窗按列录入，控件按列来源元素类型渲染）──────────────────
// 固定数据模式：新增/编辑直接写 dataRows；远程模式走 createData / updateData 代码。
// editTarget 保存原行引用：固定模式用于定位 dataRows 索引，远程模式作为 row 传参。
const addOpen = ref(false)
const editTarget = ref<Record<string, unknown> | null>(null)
const draftRow = ref<Record<string, unknown>>({})
let localSeq = 0

const rowModalTitle = computed(() =>
  editTarget.value !== null
    ? t('builder.dataTableEditRowTitle')
    : t('builder.dataTableAddRowTitle'),
)

function initDraft() {
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
  return init
}

function openAdd() {
  editTarget.value = null
  draftRow.value = initDraft()
  addOpen.value = true
}

function openEdit(row: Record<string, unknown>) {
  editTarget.value = row
  draftRow.value = { ...row }
  addOpen.value = true
}

// 新增弹窗单元格：表达式值（expr）派生 + 条件渲染（visibleIf）隐藏，随 draftRow 响应式更新
const draftCells = computed(() => {
  const row = draftRow.value
  const out: Record<string, { visible: boolean; value: unknown; derived: boolean }> = {}
  for (const c of columns.value) {
    if (!c.key) continue
    out[c.key] = {
      visible: isColumnVisible(c.element, row),
      ...evaluateColumnExpr(c.element, row, row[c.key]),
    }
  }
  return out
})

async function saveAdd() {
  const row: Record<string, unknown> = { ...draftRow.value }
  // 表达式驱动列：落库取派生计算值（与表单运行时 expr 语义一致）
  for (const c of columns.value) {
    const cell = c.key ? draftCells.value[c.key] : undefined
    if (cell?.derived) row[c.key] = cell.value
  }
  // 远程模式：走 createData / updateData 代码，成功后刷新当前页
  if (useRemote.value) {
    await saveRemoteRow(row)
    return
  }
  if (editTarget.value !== null) {
    const idx = dataRows.value.indexOf(editTarget.value)
    if (idx >= 0) {
      dataRows.value = dataRows.value.map((r, i) => (i === idx ? row : r))
    }
  } else {
    const rk = rowKey.value
    if (rk && !row[rk]) row[rk] = `local_${Date.now()}_${localSeq++}`
    dataRows.value = [...dataRows.value, row]
  }
  editTarget.value = null
  addOpen.value = false
}

// 远程新增 / 编辑：执行 createData / updateData JS 代码（runBindCode 注入 row），成功后刷新
async function saveRemoteRow(row: Record<string, unknown>) {
  const isEdit = editTarget.value !== null
  const code = isEdit ? updateDataCode.value : createDataCode.value
  if (!code) {
    console.warn(isEdit ? '[dataTable] updateData 代码缺失' : '[dataTable] createData 代码缺失')
    return
  }
  const form = injectedFormData?.value ?? {}
  try {
    await runBindCode(
      code,
      undefined,
      { form },
      formId.value,
      formVersion.value,
      { row },
      bindAxios,
    )
    editTarget.value = null
    addOpen.value = false
    await fetchRemote()
    message.value?.success(t('builder.dataTableSaveSuccess'))
  } catch (e) {
    console.error(isEdit ? '[dataTable] updateData 失败' : '[dataTable] createData 失败', e)
    message.value?.error(t('builder.dataTableSaveError'))
  }
}

async function deleteRow(row: Record<string, unknown>) {
  // 远程模式：执行 deleteData 代码后刷新当前页
  if (useRemote.value) {
    const code = deleteDataCode.value
    if (!code) {
      console.warn('[dataTable] deleteData 代码缺失')
      return
    }
    const form = injectedFormData?.value ?? {}
    try {
      await runBindCode(
        code,
        undefined,
        { form },
        formId.value,
        formVersion.value,
        { row },
        bindAxios,
      )
      await fetchRemote()
      message.value?.success(t('builder.dataTableDeleteSuccess'))
    } catch (e) {
      console.error('[dataTable] deleteData 失败', e)
      message.value?.error(t('builder.dataTableDeleteError'))
    }
    return
  }
  dataRows.value = dataRows.value.filter((r) => r !== row)
}
</script>

<template>
  <n-message-provider>
    <MessageHost ref="messageHost" />
    <n-card size="small" class="rounded-xl border border-border/50" :title="title || undefined">
      <template #header-extra>
        <div class="flex items-center gap-1">
          <n-button
            type="primary"
            v-if="props.allowAdd === true"
            text
            size="small"
            @click="openAdd"
          >
            <template #icon><span class="i-lucide-plus h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableAdd') }}
          </n-button>
          <n-button text size="small" :loading="loading" @click="refreshData">
            <template #icon><span class="i-lucide-refresh-cw h-3.5 w-3.5"></span></template>
            {{ t('builder.dataTableRefresh') }}
          </n-button>
        </div>
      </template>

      <!-- 搜索区：有搜索字段才显示 -->
      <div v-if="searchFields.length" class="mb-3">
        <!-- items-start：滚动条底部为横向滚动条留白（content pb），顶对齐保证输入框与操作按钮同一条线 -->
        <div class="flex items-start gap-2">
          <!-- 一行模式：n-scrollbar 主题化横向滚动（x-scrollable，内容 fit-content），字段保持原始宽度；展开模式换行 -->
          <n-scrollbar
            :x-scrollable="!searchExpanded"
            class="flex-1 min-w-0"
            :content-class="
              searchExpanded
                ? 'flex flex-wrap items-center gap-2'
                : 'flex items-center gap-2 pb-2.5'
            "
          >
            <div
              v-for="sf in searchFields"
              :key="sf.key"
              class="flex items-center gap-1.5 shrink-0"
            >
              <span class="whitespace-nowrap text-xs text-neutral-700 dark:text-zinc-300">{{
                sf.title
              }}</span>
              <DataTableSearchField
                :column="sf"
                :value="searchValues[sf.key] ?? ''"
                @update:value="(v) => (searchValues[sf.key] = v)"
              />
            </div>
          </n-scrollbar>
          <div class="flex items-center gap-1 shrink-0">
            <n-button size="small" @click="resetSearch">
              <template #icon><span class="i-lucide-rotate-ccw h-3.5 w-3.5"></span></template>
              {{ t('builder.dataTableReset') }}
            </n-button>
            <n-button type="primary" size="small" @click="applySearch">
              <template #icon><span class="i-lucide-search h-3.5 w-3.5"></span></template>
              {{ t('builder.dataTableSearch') }}
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

      <n-modal
        v-model:show="addOpen"
        preset="card"
        :style="{ width: `${addModalWidth}px`, maxWidth: '90vw' }"
      >
        <template #header>
          <span class="text-sm font-medium">{{ rowModalTitle }}</span>
        </template>
        <div class="grid grid-cols-12 gap-x-3 gap-y-3">
          <template v-for="col in columns" :key="col.key">
            <div
              v-if="col.key && draftCells[col.key]?.visible"
              :class="`col-span-${toColspan(col)}`"
            >
              <div class="mb-1 text-xs text-muted-foreground">{{ col.title }}</div>
              <div class="min-w-0">
                <DataTableRowCellInput
                  :column="col"
                  :value="draftCells[col.key]?.value"
                  :disabled="Boolean(draftCells[col.key]?.derived)"
                  @update:value="(v) => (draftRow[col.key] = v)"
                />
              </div>
            </div>
          </template>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <n-button size="small" @click="addOpen = false">{{ t('common.cancel') }}</n-button>
          <n-button size="small" type="primary" @click="saveAdd">{{ t('common.save') }}</n-button>
        </div>
      </n-modal>
    </n-card>
  </n-message-provider>
</template>
