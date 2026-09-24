<script setup lang="ts">
// ═══ D1/I1：多选批量操作面板 ═══════════════════════════════════════════════════
// 右侧面板多选时替换单个元素的属性表单：显示「已选 N 个元素」+「批量设置」（列宽/
// 必填/禁用/尺寸）+ 删除 / 包进容器 / 复制，全部调用 D0/I1 命令层，与画布浮动工具条 /
// 右键菜单共用同一份实现。
import { computed } from 'vue'
import { NButton, NInputNumber, NSelect } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import {
  useCanvasCommands,
  isBatchRequiredApplicable,
  isBatchDisabledApplicable,
  isBatchSizeApplicable,
  readBatchRequired,
  readBatchDisabled,
  readBatchSize,
} from '@/builder/composables/use-canvas-commands'
import { findDslNodeByKey } from '@/utils/schema/dsl-tree'
import { getColSpan } from '@/utils/dnd/grid'
import type { FormNode } from '@/types/dsl'

const { t } = useFormBuilderI18n()
const state = useFormBuilderState()
const commands = useCanvasCommands(state)

const keys = computed(() => state.selectedKeys.value)
const canWrap = computed(() => commands.canWrap(keys.value))

const wrapTargets: Array<'card' | 'group' | 'collapse'> = ['card', 'group', 'collapse']

function wrapAs(type: 'card' | 'group' | 'collapse') {
  commands.wrapIn(keys.value, type)
}

// ─── I1：批量设置 ───────────────────────────────────────────────────────────────
// 面板只读 DSL（formDefinition）拿当前值做三态展示，真正的写入一律走
// commands.batchPatch（一次提交、跳过不适用元素的逻辑都在命令层，面板不重复判断）。
// 读 DSL 而不是 formSchema：带条件必填等条件属性的字段，schema 层的 validation
// 已经编译成 FormKit 条件属性对象，不再是单纯的规则数组，读不出"是否有静态 required"。
const selectedNodes = computed<FormNode[]>(() => {
  const root = state.formDefinition.value?.root?.children
  if (!Array.isArray(root)) return []
  return keys.value
    .map((key) => findDslNodeByKey(root, key)?.node)
    .filter((n): n is FormNode => !!n)
})

type TriState<T> = { kind: 'none' } | { kind: 'mixed' } | { kind: 'uniform'; value: T }

function triState<T>(applicable: FormNode[], read: (n: FormNode) => T): TriState<T> {
  if (!applicable.length) return { kind: 'none' }
  const first = read(applicable[0]!)
  return applicable.every((n) => read(n) === first)
    ? { kind: 'uniform', value: first }
    : { kind: 'mixed' }
}

// 列宽：对所有选中元素都生效，没有"不适用"的场景
const colSpanTri = computed(() => triState(selectedNodes.value, getColSpan))
const colSpanValue = computed(() =>
  colSpanTri.value.kind === 'uniform' ? colSpanTri.value.value : null,
)

// 必填：只对支持 required 校验的字段生效
const requiredApplicable = computed(() => selectedNodes.value.filter(isBatchRequiredApplicable))
const requiredTri = computed(() => triState(requiredApplicable.value, readBatchRequired))
const requiredMixed = computed(() => requiredTri.value.kind === 'mixed')
const requiredOn = computed(
  () => requiredTri.value.kind === 'uniform' && requiredTri.value.value === true,
)
const requiredOff = computed(
  () => requiredTri.value.kind === 'uniform' && requiredTri.value.value === false,
)

// 禁用：只对字段类节点生效
const disabledApplicable = computed(() => selectedNodes.value.filter(isBatchDisabledApplicable))
const disabledTri = computed(() => triState(disabledApplicable.value, readBatchDisabled))
const disabledMixed = computed(() => disabledTri.value.kind === 'mixed')
const disabledOn = computed(
  () => disabledTri.value.kind === 'uniform' && disabledTri.value.value === true,
)
const disabledOff = computed(
  () => disabledTri.value.kind === 'uniform' && disabledTri.value.value === false,
)

// 尺寸：只对定义了 props.size 的字段类型生效；"跟随表单"用哨兵值区分于真实尺寸字符串，
// 选中它时提交 patch.size = null（命令层据此删掉 props.size）
const FOLLOW_FORM = '__follow-form__'
const sizeApplicable = computed(() => selectedNodes.value.filter(isBatchSizeApplicable))
const sizeTri = computed(() => triState(sizeApplicable.value, readBatchSize))
const sizeSelectValue = computed(() => {
  const tri = sizeTri.value
  if (tri.kind !== 'uniform') return null
  return tri.value ?? FOLLOW_FORM
})
const sizeOptions = computed(() => [
  { label: 'small', value: 'small' },
  { label: 'medium', value: 'medium' },
  { label: 'large', value: 'large' },
  { label: t('builder.commands.batchSizeFollowForm'), value: FOLLOW_FORM },
])

function applyColSpan(value: number | null) {
  if (value === null) return
  commands.batchPatch(keys.value, { colSpan: value })
}
function applyRequired(value: boolean) {
  commands.batchPatch(keys.value, { required: value })
}
function applyDisabled(value: boolean) {
  commands.batchPatch(keys.value, { disabled: value })
}
function applySize(value: string | null) {
  if (value === null) return
  commands.batchPatch(keys.value, {
    size: value === FOLLOW_FORM ? null : (value as 'small' | 'medium' | 'large'),
  })
}
</script>

<template>
  <div class="flex flex-col gap-3 py-6 px-2 text-center">
    <div
      class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#a277ff]/15 text-[#a277ff]"
    >
      <span class="i-lucide-layers h-5 w-5"></span>
    </div>
    <p class="text-sm font-medium">
      {{ t('builder.commands.batchSelected', { count: keys.length }) }}
    </p>

    <div class="flex flex-col gap-2 px-2">
      <!-- I1：批量设置——列宽 / 必填 / 禁用 / 尺寸 -->
      <div class="flex flex-col gap-2.5 rounded-lg border border-border/60 p-2 text-left">
        <span class="px-1 text-xs text-muted-foreground">{{
          t('builder.commands.batchSettingsTitle')
        }}</span>

        <div class="flex flex-col gap-1 px-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs">{{ t('builder.commands.batchColSpan') }}</span>
            <n-input-number
              size="small"
              class="!w-[108px]"
              :min="2"
              :max="12"
              :step="1"
              :value="colSpanValue"
              :placeholder="t('builder.commands.batchColSpanMixed')"
              @update:value="applyColSpan"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1 px-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs">{{ t('builder.commands.batchRequired') }}</span>
            <div class="flex items-center gap-1">
              <span v-if="requiredMixed" class="text-[11px] text-muted-foreground">{{
                t('builder.commands.batchMixed')
              }}</span>
              <n-button
                size="tiny"
                :type="requiredOn ? 'primary' : 'default'"
                :disabled="!requiredApplicable.length"
                @click="applyRequired(true)"
                >{{ t('builder.commands.batchOn') }}</n-button
              >
              <n-button
                size="tiny"
                :type="requiredOff ? 'primary' : 'default'"
                :disabled="!requiredApplicable.length"
                @click="applyRequired(false)"
                >{{ t('builder.commands.batchOff') }}</n-button
              >
            </div>
          </div>
          <span class="text-[11px] text-muted-foreground">{{
            t('builder.commands.batchApplyScope', { n: requiredApplicable.length, m: keys.length })
          }}</span>
        </div>

        <div class="flex flex-col gap-1 px-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs">{{ t('builder.commands.batchDisabled') }}</span>
            <div class="flex items-center gap-1">
              <span v-if="disabledMixed" class="text-[11px] text-muted-foreground">{{
                t('builder.commands.batchMixed')
              }}</span>
              <n-button
                size="tiny"
                :type="disabledOn ? 'primary' : 'default'"
                :disabled="!disabledApplicable.length"
                @click="applyDisabled(true)"
                >{{ t('builder.commands.batchOn') }}</n-button
              >
              <n-button
                size="tiny"
                :type="disabledOff ? 'primary' : 'default'"
                :disabled="!disabledApplicable.length"
                @click="applyDisabled(false)"
                >{{ t('builder.commands.batchOff') }}</n-button
              >
            </div>
          </div>
          <span class="text-[11px] text-muted-foreground">{{
            t('builder.commands.batchApplyScope', { n: disabledApplicable.length, m: keys.length })
          }}</span>
        </div>

        <div class="flex flex-col gap-1 px-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs">{{ t('builder.commands.batchSize') }}</span>
            <n-select
              size="small"
              class="!w-[128px]"
              :value="sizeSelectValue"
              :options="sizeOptions"
              :disabled="!sizeApplicable.length"
              :placeholder="t('builder.commands.batchMixed')"
              @update:value="applySize"
            />
          </div>
          <span class="text-[11px] text-muted-foreground">{{
            t('builder.commands.batchApplyScope', { n: sizeApplicable.length, m: keys.length })
          }}</span>
        </div>
      </div>

      <n-button size="small" block @click="commands.duplicate(keys)">
        <template #icon><span class="i-lucide-copy-plus h-4 w-4"></span></template>
        {{ t('builder.commands.batchDuplicate') }}
      </n-button>

      <div class="flex flex-col gap-1.5 rounded-lg border border-border/60 p-2 text-left">
        <span class="px-1 text-xs text-muted-foreground">{{
          t('builder.commands.batchWrap')
        }}</span>
        <div class="flex flex-wrap gap-1.5">
          <n-button
            v-for="type in wrapTargets"
            :key="type"
            size="small"
            :disabled="!canWrap"
            @click="wrapAs(type)"
          >
            {{ t('builder.commands.batchWrapAs', { name: t(`elements.${type}.label`) }) }}
          </n-button>
        </div>
      </div>

      <n-button size="small" type="error" block ghost @click="commands.remove(keys)">
        <template #icon><span class="i-lucide-trash-2 h-4 w-4"></span></template>
        {{ t('builder.commands.batchDelete') }}
      </n-button>
    </div>
  </div>
</template>
