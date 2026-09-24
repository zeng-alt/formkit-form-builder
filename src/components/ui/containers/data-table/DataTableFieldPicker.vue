<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { NEmpty, NInput, NScrollbar } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { fieldTypeOptions } from './column-factory'

// 字段类型选择面板（搜索框 + 图标网格）：新增列 / 新增搜索条件共用。
// 只负责内容，外层弹出方式（NPopover / NDropdown / 内联）由调用方决定。
const emit = defineEmits<{ (e: 'pick', type: string): void }>()

const { t } = useFormBuilderI18n()
const keyword = ref('')
const inputRef = ref<{ focus: () => void } | null>(null)

const options = computed(() => fieldTypeOptions(t))
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return options.value
  return options.value.filter(
    (o) => o.label.toLowerCase().includes(kw) || o.type.toLowerCase().includes(kw),
  )
})

function pick(type: string) {
  emit('pick', type)
  keyword.value = ''
}

// Enter 直接选中过滤结果的第一项
function onEnter() {
  const first = filtered.value[0]
  if (first) pick(first.type)
}

onMounted(() => nextTick(() => inputRef.value?.focus()))
</script>

<template>
  <div class="w-[320px] space-y-2" data-canvas-edit>
    <n-input
      ref="inputRef"
      v-model:value="keyword"
      size="small"
      clearable
      :placeholder="t('builder.dataTableFieldPicker.search')"
      @keydown.enter.prevent="onEnter"
    >
      <template #prefix>
        <span class="i-lucide-search h-3.5 w-3.5 text-muted-foreground"></span>
      </template>
    </n-input>
    <n-scrollbar class="max-h-[280px]" content-class="pr-1">
      <div v-if="filtered.length" class="grid grid-cols-3 gap-1.5">
        <button
          v-for="item in filtered"
          :key="item.type"
          type="button"
          class="flex flex-col items-center gap-1 rounded-md border border-transparent bg-transparent cursor-pointer px-1 py-2 text-[11px] text-foreground transition-colors hover:border-[#7c9ef8] hover:bg-[#f0f4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a277ff] dark:hover:bg-[rgba(100,130,255,0.07)]"
          :data-field-type="item.type"
          @click="pick(item.type)"
        >
          <span :class="`${item.icon} h-4 w-4 text-muted-foreground`"></span>
          <span class="w-full truncate text-center">{{ item.label }}</span>
        </button>
      </div>
      <n-empty v-else class="py-6" :description="t('builder.dataTableFieldPicker.empty')" />
    </n-scrollbar>
  </div>
</template>
