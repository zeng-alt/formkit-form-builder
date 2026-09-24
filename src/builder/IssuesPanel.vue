<script setup lang="ts">
// ═══ H2：顶栏「体检」面板——列表内容 ═══════════════════════════════════════════════
// 只负责渲染 lintDefinition 的结果 + 点击定位，弹出方式（NPopover）由
// BuilderHeader.vue 决定；issues 由外层算好传入（避免弹出/收起时重复跑一遍 lint）。
import { computed } from 'vue'
import { NEmpty, NScrollbar } from 'naive-ui'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
import { findDslNodeByKey } from '@/utils/schema/dsl-tree'
import { scrollCanvasItemIntoView } from '@/utils/canvas-locate'
import { triggerDropFlash } from '@/utils/dnd/drop-flash'
import type { Issue, IssueSeverity } from '@/dsl/lint'
import type { FormNode } from '@/types/dsl'

const props = defineProps<{
  issues: Issue[]
}>()

const state = useFormBuilderState()
const { t } = useFormBuilderI18n()

const SEVERITY_ORDER: IssueSeverity[] = ['error', 'warning', 'info']
const SEVERITY_ICON: Record<IssueSeverity, string> = {
  error: 'i-lucide-circle-x',
  warning: 'i-lucide-triangle-alert',
  info: 'i-lucide-info',
}
const SEVERITY_ICON_CLASS: Record<IssueSeverity, string> = {
  error: 'text-red-500 dark:text-red-400',
  warning: 'text-amber-500 dark:text-amber-400',
  info: 'text-muted-foreground',
}
const GROUP_TITLE_KEY: Record<IssueSeverity, string> = {
  error: 'issues.groupError',
  warning: 'issues.groupWarning',
  info: 'issues.groupInfo',
}

function findNode(key: string): FormNode | null {
  const root = state.formDefinition.value?.root?.children
  if (!Array.isArray(root)) return null
  return findDslNodeByKey(root, key)?.node ?? null
}

/** 问题所在元素的展示名称：普通节点取 label/name/type；数据表格列问题额外拼上列标题，
 *  与所属表格名称一起显示（列本身不是树节点，没有独立的画布身份）。 */
function locationLabel(issue: Issue): string {
  if (!issue.nodeKey) return ''
  const node = findNode(issue.nodeKey)
  const nodeName = node ? node.label || node.name || node.type : issue.nodeKey
  if (issue.columnIndex === undefined || issue.columnIndex === null) return nodeName
  const cols = (node as { props?: { columns?: unknown[] } } | null)?.props?.columns
  const col = Array.isArray(cols)
    ? (cols[issue.columnIndex] as { title?: string; key?: string; element?: FormNode } | undefined)
    : undefined
  const columnName =
    col?.title || col?.element?.label || col?.element?.name || col?.key || String(issue.columnIndex)
  return t('issues.columnLocation', { table: nodeName, column: columnName })
}

const rows = computed(() =>
  props.issues.map((issue) => ({
    issue,
    message: t(`issues.codes.${issue.code}`, issue.params),
    location: locationLabel(issue),
  })),
)

const grouped = computed(() =>
  SEVERITY_ORDER.map((severity) => ({
    severity,
    title: t(GROUP_TITLE_KEY[severity]),
    rows: rows.value.filter((r) => r.issue.severity === severity),
  })).filter((g) => g.rows.length > 0),
)

/** 点击某条问题：选中所在元素、画布滚动到它并闪一下；面板本身不在这里关闭，
 *  留给外层 NPopover 的 trigger 状态控制，方便连续查看多条问题。 */
function locate(issue: Issue) {
  if (!issue.nodeKey) return
  state.selectedTarget.value = 'field'
  state.selectedKey.value = issue.nodeKey
  state.selectedColumnIndex.value = issue.columnIndex ?? null
  scrollCanvasItemIntoView(issue.nodeKey)
  triggerDropFlash([issue.nodeKey])
}
</script>

<template>
  <div class="w-80 max-w-[85vw] py-1">
    <n-empty v-if="issues.length === 0" :description="t('issues.empty')" class="py-4" />
    <n-scrollbar v-else style="max-height: 360px">
      <div class="flex flex-col gap-1.5 pr-2 pb-1">
        <div v-for="group in grouped" :key="group.severity">
          <div class="px-2 pt-1 pb-0.5 text-[11px] font-medium text-muted-foreground">
            {{ group.title }}（{{ group.rows.length }}）
          </div>
          <ul class="list-none m-0 p-0 flex flex-col gap-0.5">
            <li v-for="(row, i) in group.rows" :key="`${group.severity}-${i}`">
              <button
                type="button"
                :disabled="!row.issue.nodeKey"
                class="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-inherit [font-family:inherit] border-0 bg-transparent cursor-pointer transition-colors duration-150 hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                @click="locate(row.issue)"
              >
                <span
                  :class="[
                    SEVERITY_ICON[row.issue.severity],
                    SEVERITY_ICON_CLASS[row.issue.severity],
                    'shrink-0 mt-0.5 h-[14px] w-[14px]',
                  ]"
                ></span>
                <span class="flex flex-col min-w-0 gap-0.5">
                  <span class="text-[13px] leading-tight">{{ row.message }}</span>
                  <span v-if="row.location" class="text-[11px] text-muted-foreground truncate">{{
                    row.location
                  }}</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>
