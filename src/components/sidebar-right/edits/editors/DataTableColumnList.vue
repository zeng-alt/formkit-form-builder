<script setup lang="ts">
import { ref, toRaw, watch } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { NButton, NEmpty, NPopover } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { eq } from '@/utils/utils'
import {
  columnIcon,
  createColumn,
  duplicateColumn,
} from '@/components/ui/containers/data-table/column-factory'
import DataTableFieldPicker from '@/components/ui/containers/data-table/DataTableFieldPicker.vue'
import type { DataTableColumn } from '@/components/ui/containers/data-table/types'

// 属性面板的数据列列表：拖动排序 / 点选进入列编辑 / 悬停复制或删除。
// 与画布列表是两处独立的 DnD 实例（各自 group），互不干扰；这里不挂画布的
// customInsertPlugin，纯本地排序，结束后把整份 columns 写回节点 props。
const props = defineProps<{
  columns: DataTableColumn[]
  selectedIndex: number | null
}>()

const emit = defineEmits<{
  (e: 'update:columns', value: DataTableColumn[]): void
  (e: 'select', index: number | null): void
}>()

const { t } = useFormBuilderI18n()

const [listRef, items] = useDragAndDrop<DataTableColumn>([...props.columns], {
  group: 'edits-data-table-column-list',
  sortable: true,
  nativeDrag: true,
  draggable: () => true,
  dragHandle: '[data-drag-handle]',
  // 桌面鼠标下库的指针拖拽路径直接跳过（只服务触屏），排序必须走原生 HTML5 拖拽；
  // 节点默认不带 draggable，真正起拖前才置位，避免影响整行的点击选中 / 文本选择
  handleNodePointerup(data) {
    data.targetData.node.el.setAttribute('draggable', 'true')
  },
})

// 外部变更（JSON 高级编辑、undo/redo、列属性编辑器改 key/title 等）同步回本地列表；
// 加同步标记避免把这次同步又当作用户操作重新写回一遍。
let syncingFromProps = false
watch(
  () => props.columns,
  (next) => {
    if (eq(next, items.value)) return
    syncingFromProps = true
    items.value = [...next]
    queueMicrotask(() => {
      syncingFromProps = false
    })
  },
  { deep: true },
)

// items 是深层响应式代理：写回前逐项 toRaw，避免代理进入冻结的表单定义后
// 再次读取嵌套属性时违反 Proxy 不变式（见画布 use-container-drag-and-drop.ts 的同类注释）。
watch(
  items,
  () => {
    if (syncingFromProps) return
    emit(
      'update:columns',
      items.value.map((c) => toRaw(c)),
    )
  },
  { deep: true },
)

const pickerOpen = ref(false)

function addColumn(type: string) {
  const existing = items.value.map((c) => c.key)
  items.value = [...items.value, createColumn(type, t, existing)]
  pickerOpen.value = false
}

function duplicateAt(idx: number) {
  const col = items.value[idx]
  if (!col) return
  const existing = items.value.map((c) => c.key)
  const copy = duplicateColumn(col, existing, t('common.copySuffix'))
  const next = [...items.value]
  next.splice(idx + 1, 0, copy)
  items.value = next
}

function deleteAt(idx: number) {
  items.value = items.value.filter((_, i) => i !== idx)
  if (props.selectedIndex === idx) emit('select', null)
  else if (props.selectedIndex !== null && props.selectedIndex > idx) {
    emit('select', props.selectedIndex - 1)
  }
}
</script>

<template>
  <div class="space-y-1.5">
    <n-empty
      v-if="!items.length"
      class="py-3"
      :description="t('edits.dataTable.columnListEmpty')"
    />
    <div v-else ref="listRef" class="space-y-1">
      <div
        v-for="(col, idx) in items"
        :key="col.key"
        data-testid="dt-column-row"
        class="group flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors"
        :class="
          selectedIndex === idx
            ? 'border-solid border-[#a277ff] bg-[#a277ff]/[0.06] text-[#a277ff]'
            : 'border-transparent hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]'
        "
        @click="emit('select', idx)"
      >
        <span
          data-drag-handle
          class="i-lucide-grip-vertical h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
          @click.stop
        ></span>
        <span
          :class="`${columnIcon(col) ?? 'i-lucide-columns-3'} h-3.5 w-3.5 text-muted-foreground shrink-0`"
        ></span>
        <span class="truncate flex-1 min-w-0 font-medium">{{ col.title || col.key }}</span>
        <span class="font-mono text-[10px] text-muted-foreground shrink-0">{{ col.key }}</span>
        <span
          class="flex items-center gap-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <n-button
            quaternary
            circle
            size="tiny"
            :aria-label="t('common.copySuffix')"
            @click.stop="duplicateAt(idx)"
          >
            <template #icon><span class="i-lucide-copy h-3 w-3"></span></template>
          </n-button>
          <n-button
            quaternary
            circle
            size="tiny"
            type="error"
            :aria-label="t('builder.deleteField')"
            @click.stop="deleteAt(idx)"
          >
            <template #icon><span class="i-lucide-trash-2 h-3 w-3"></span></template>
          </n-button>
        </span>
      </div>
    </div>

    <n-popover
      trigger="click"
      placement="bottom-start"
      :show="pickerOpen"
      @update:show="(v) => (pickerOpen = v)"
    >
      <template #trigger>
        <n-button dashed size="small" data-testid="dt-column-add" class="w-full justify-center">
          <template #icon><span class="i-lucide-plus h-3.5 w-3.5"></span></template>
          {{ t('edits.dataTable.addColumn') }}
        </n-button>
      </template>
      <DataTableFieldPicker @pick="addColumn" />
    </n-popover>
  </div>
</template>
