<script setup lang="ts">
// ═══ E2：顶栏「历史」面板——列表内容 ═════════════════════════════════════════════
// 只负责渲染 + 点击跳转，弹出方式（NPopover）由 BuilderHeader.vue 决定；显示时
// 把当前步滚动到可见位置（show 由外层的弹出显隐态传入，同一实例反复开合也能生效）。
import { computed, nextTick, ref, watch } from 'vue'
import { NEmpty, NScrollbar } from 'naive-ui'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
import { historyReasonI18nKey } from './history-reasons'

// 面板最多展示最近 50 条（历史栈本身最多保留 100 条，见 schema-history.ts 的
// MAX_HISTORY），避免弹出面板一次性渲染过长列表。
const MAX_VISIBLE = 50

const props = defineProps<{
  /** 弹出面板是否处于显示状态：由 true 变化时把当前步滚动到可见位置。 */
  show?: boolean
}>()

const state = useFormBuilderState()
const { t } = useFormBuilderI18n()

const scrollRootRef = ref<HTMLElement | null>(null)

function relativeTime(at: number): string {
  const diffMs = Date.now() - at
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < minute) return t('history.justNow')
  if (diffMs < hour) return t('history.minutesAgo', { n: Math.max(1, Math.floor(diffMs / minute)) })
  if (diffMs < day) return t('history.hoursAgo', { n: Math.floor(diffMs / hour) })
  return t('history.daysAgo', { n: Math.floor(diffMs / day) })
}

const rows = computed(() => {
  const entries = state.historyEntries.value
  const currentIndex = state.currentHistoryIndex.value
  const start = Math.max(0, entries.length - MAX_VISIBLE)
  // 最新的一步放在最上面；打开表单时的那条（栈底、没有 reason）显示为「初始状态」
  const list = entries.slice(start).map((entry, i) => {
    const index = start + i
    const isInitial = index === 0 && !entry.reason
    return {
      index,
      label: isInitial
        ? t('history.reasons.initial')
        : t(`history.reasons.${historyReasonI18nKey(entry.reason)}`),
      time: relativeTime(entry.at),
      isCurrent: index === currentIndex,
      isFuture: index > currentIndex,
    }
  })
  return list.reverse()
})

function onPick(index: number) {
  state.jumpTo(index)
}

watch(
  () => props.show,
  async (visible) => {
    if (!visible) return
    await nextTick()
    scrollRootRef.value
      ?.querySelector('[data-history-current="true"]')
      ?.scrollIntoView({ block: 'center' })
  },
)
</script>

<template>
  <div ref="scrollRootRef" class="w-72 max-w-[80vw] py-1">
    <n-empty v-if="rows.length === 0" :description="t('history.empty')" class="py-4" />
    <n-scrollbar v-else style="max-height: 320px">
      <ul class="list-none m-0 p-0 flex flex-col gap-0.5 pr-2">
        <li v-for="row in rows" :key="row.index">
          <button
            type="button"
            :data-history-current="row.isCurrent ? 'true' : undefined"
            class="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer transition-colors duration-150"
            :class="[
              row.isCurrent
                ? 'bg-[#a277ff]/15 text-[#a277ff]'
                : 'hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]',
              row.isFuture && !row.isCurrent ? 'opacity-50' : '',
            ]"
            @click="onPick(row.index)"
          >
            <span class="text-[13px] truncate">{{ row.label }}</span>
            <span class="flex items-center gap-1.5 shrink-0">
              <span
                v-if="row.isCurrent"
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-[#a277ff] text-white"
                >{{ t('history.current') }}</span
              >
              <span class="text-[11px] text-muted-foreground">{{ row.time }}</span>
            </span>
          </button>
        </li>
      </ul>
    </n-scrollbar>
  </div>
</template>
