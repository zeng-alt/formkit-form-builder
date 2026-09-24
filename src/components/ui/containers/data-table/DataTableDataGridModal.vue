<script setup lang="ts">
// 固定数据的表格式编辑弹窗（画布「新增」按钮 / 行双击、属性面板「编辑数据」共用）。
// 接口已定：打开时深拷贝 data 为草稿，保存时 emit('save', rows)，由调用方写回节点 props.data；
// 取消不写入。
import { computed, toRaw, watch } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { NButton, NEmpty, NModal } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { columnKind, evaluateColumnExpr, isColumnVisible } from './utils'
import DataTableRowCellInput from './DataTableRowCellInput.vue'
import type { DataTableColumn } from './types'

const props = defineProps<{
  show: boolean
  columns: DataTableColumn[]
  data: Record<string, unknown>[]
  rowKey: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save', rows: Record<string, unknown>[]): void
}>()

const { t } = useFormBuilderI18n()

// 排序用独立 DnD 实例：普通用法（不挂画布 customInsertPlugin），group 名与画布/
// 列列表都不同，避免互相接受拖拽。
const [listRef, rows] = useDragAndDrop<Record<string, unknown>>([], {
  group: 'edits-data-table-grid-rows',
  sortable: true,
  nativeDrag: true,
  draggable: () => true,
  dragHandle: '[data-drag-handle]',
  // 同列列表：桌面鼠标必须走原生 HTML5 拖拽，节点起拖前才置位 draggable
  handleNodePointerup(data) {
    data.targetData.node.el.setAttribute('draggable', 'true')
  },
})

let seq = 0

// 新行初值：优先取来源元素默认值，否则按渲染形态兜底（与预览「新增数据行」initDraft 一致）
function initRow(): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const c of props.columns) {
    if (!c.key) continue
    const el = c.element
    if (el && el.value !== undefined) {
      row[c.key] = el.value
      continue
    }
    const kind = columnKind(el?.type ?? c.render)
    if (kind === 'switch') row[c.key] = false
    else if (kind === 'rate') row[c.key] = 0
    else row[c.key] = ''
  }
  return row
}

// 打开时深拷贝草稿；关闭 / 取消都不写回原 data
watch(
  () => props.show,
  (visible) => {
    if (!visible) return
    rows.value = JSON.parse(JSON.stringify(props.data ?? []))
    seq = 0
  },
  { immediate: true },
)

const modalWidthPx = computed(() => Math.max(640, props.columns.length * 180 + 120))

function addRow() {
  rows.value = [...rows.value, initRow()]
}

function removeRow(idx: number) {
  rows.value = rows.value.filter((_, i) => i !== idx)
}

function updateCell(idx: number, key: string, value: unknown) {
  rows.value = rows.value.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
}

function cellVisible(row: Record<string, unknown>, col: DataTableColumn): boolean {
  return isColumnVisible(col.element, row)
}

function cellState(row: Record<string, unknown>, col: DataTableColumn) {
  return evaluateColumnExpr(col.element, row, row[col.key])
}

function cancel() {
  emit('update:show', false)
}

function save() {
  const rk = props.rowKey
  const nextRows = rows.value.map((row) => {
    // 逐行 toRaw + 展开：drag-and-drop 的 items 是深层响应式代理，直接落库会在
    // 冻结态下读取嵌套属性时炸掉（同画布 use-container-drag-and-drop.ts 的注释）
    const plain = { ...toRaw(row) } as Record<string, unknown>
    for (const c of props.columns) {
      if (!c.key) continue
      const cell = cellState(plain, c)
      if (cell.derived) plain[c.key] = cell.value
    }
    if (rk && !plain[rk]) plain[rk] = `local_${Date.now()}_${seq++}`
    return plain
  })
  emit('save', nextRows)
  emit('update:show', false)
}
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    :style="{ width: `${modalWidthPx}px`, maxWidth: '90vw' }"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <template #header>
      <span class="text-sm font-medium">{{ t('builder.dataTableGrid.title') }}</span>
    </template>
    <template #header-extra>
      <span class="text-[11px] text-muted-foreground">
        {{ t('builder.dataTableGrid.rowsCount', { count: rows.length }) }}
      </span>
    </template>

    <div data-canvas-edit class="space-y-2">
      <div class="flex items-center justify-between">
        <n-button size="small" data-testid="dt-grid-add-row" @click="addRow">
          <template #icon><span class="i-lucide-plus h-3.5 w-3.5"></span></template>
          {{ t('builder.dataTableGrid.addRow') }}
        </n-button>
      </div>

      <n-empty v-if="!rows.length" class="py-8" :description="t('builder.dataTableGrid.empty')">
        <template #extra>
          <n-button size="small" data-testid="dt-grid-add-row-empty" @click="addRow">
            {{ t('builder.dataTableGrid.addRow') }}
          </n-button>
        </template>
      </n-empty>

      <div
        v-else
        class="max-h-[60vh] overflow-auto rounded-md border border-border/50 thin-scrollbar"
      >
        <table class="w-full border-collapse text-left text-xs">
          <thead class="sticky top-0 z-10 bg-muted/60">
            <tr>
              <th class="w-12 px-2 py-1.5 font-medium text-muted-foreground">#</th>
              <th
                v-for="col in props.columns"
                :key="col.key"
                class="min-w-[160px] px-2 py-1.5 font-medium text-foreground whitespace-nowrap border-l border-border/50"
              >
                {{ col.title }}
              </th>
              <th class="w-10 px-2 py-1.5 border-l border-border/50"></th>
            </tr>
          </thead>
          <tbody ref="listRef">
            <tr v-for="(row, idx) in rows" :key="idx" class="border-t border-border/40">
              <td class="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                <span
                  data-drag-handle
                  class="i-lucide-grip-vertical mr-1 inline-block h-3.5 w-3.5 cursor-grab align-middle active:cursor-grabbing"
                ></span>
                {{ idx + 1 }}
              </td>
              <td
                v-for="col in props.columns"
                :key="col.key"
                class="px-2 py-1.5 align-middle border-l border-border/40"
                :class="{ 'opacity-40 pointer-events-none': !cellVisible(row, col) }"
              >
                <DataTableRowCellInput
                  :column="col"
                  :value="cellState(row, col).value"
                  :disabled="cellState(row, col).derived"
                  @update:value="(v) => updateCell(idx, col.key, v)"
                />
              </td>
              <td class="px-2 py-1.5 border-l border-border/40">
                <n-button
                  text
                  size="tiny"
                  type="error"
                  data-testid="dt-grid-delete-row"
                  :aria-label="t('builder.dataTableGrid.deleteRow')"
                  @click="removeRow(idx)"
                >
                  <template #icon><span class="i-lucide-trash-2 h-3.5 w-3.5"></span></template>
                </n-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button size="small" data-testid="dt-grid-cancel" @click="cancel">{{
          t('common.cancel')
        }}</n-button>
        <n-button size="small" type="primary" data-testid="dt-grid-save" @click="save">{{
          t('common.save')
        }}</n-button>
      </div>
    </template>
  </n-modal>
</template>
