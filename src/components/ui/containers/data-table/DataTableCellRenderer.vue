<script setup lang="ts">
import { computed } from 'vue'
import { NRate, NSwitch, NTag } from 'naive-ui'
import { columnKind } from './utils'
import type { DataTableColumn } from './types'

// 画布 / 预览单元格只读渲染：按列来源元素类型展示值（switch/rate/color/tag/text）。
const props = defineProps<{
  column: DataTableColumn
  value: unknown
}>()

const kind = computed(() => columnKind(props.column.render))

const boolValue = computed(
  () => props.value === true || props.value === 'true' || props.value === 1 || props.value === '1',
)

const rateValue = computed(() => {
  const n = Number(props.value)
  return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0
})
</script>

<template>
  <span v-if="kind === 'switch'">
    <n-switch size="small" :value="boolValue" disabled />
  </span>
  <span v-else-if="kind === 'rate'">
    <n-rate size="small" :value="rateValue" readonly />
  </span>
  <span v-else-if="kind === 'color'" class="inline-flex items-center gap-1.5 align-middle">
    <span
      class="inline-block h-3.5 w-3.5 rounded border border-border/50"
      :style="{ backgroundColor: String(props.value ?? '') }"
    ></span>
    <span>{{ props.value ?? '' }}</span>
  </span>
  <span v-else-if="kind === 'tag'">
    <n-tag size="small" :bordered="false">{{ props.value ?? '' }}</n-tag>
  </span>
  <span v-else>{{ props.value ?? '' }}</span>
</template>
