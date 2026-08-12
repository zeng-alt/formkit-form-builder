<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NButton, NInput, NStep, NSteps, NTooltip } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import ContainerChildrenGrid from '../shared/ContainerChildrenGrid.vue'
import { collectSchemaNames, duplicateNode, generateKey } from '@/utils/dnd/schema'

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey, formSchema } = useFormBuilderState()

type StepsPane = {
  __key: string
  name?: string
  label?: string
  description?: string
  children?: FormKitSchemaFormKit[]
  outerClass?: string
  __paneType?: string
}

const props = defineProps<{
  stepsKey?: string
  modelValue: StepsPane[]
  label?: string
  help?: string
  disabled?: boolean
  size?: 'small' | 'medium'
  status?: 'process' | 'finish' | 'error' | 'wait'
  vertical?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: StepsPane[]): void
}>()

const { t } = useFormBuilderI18n()
const canvasCtx = useCanvasSchemaContext()

const panes = computed<StepsPane[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const stepTitle = (pane: StepsPane | undefined, idx: number) => {
  const label = pane?.label
  if (typeof label === 'string' && label.trim()) return label.trim()
  return `Step ${idx + 1}`
}

const activeIndex = ref(0)
watch(
  () => panes.value.length,
  (len) => {
    if (len <= 0) activeIndex.value = 0
    else if (activeIndex.value > len - 1) activeIndex.value = len - 1
  },
  { immediate: true },
)

const updatePanes = (next: StepsPane[]) => {
  const k = props.stepsKey
  if (k && canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(k, next as any)
  else emit('update:modelValue', next)
}

const createStep = (title: string): StepsPane => {
  const key = generateKey()
  // 自动生成稳定 name：作为 pane 内容的 group 数据键，不随 label 编辑变化，避免改标题后旧数据丢失
  return {
    __key: key,
    name: `step_${Math.random().toString(36).slice(2, 8)}`,
    label: title,
    __paneType: 'steps',
    outerClass: 'col-span-12',
    children: [],
  }
}

const bootstrapped = ref(false)
watch(
  () => panes.value.length,
  (len) => {
    if (bootstrapped.value) return
    if (!props.stepsKey) return
    if (!canvasCtx?.updateContainerChildren) return
    if (len > 0) {
      bootstrapped.value = true
      return
    }
    bootstrapped.value = true
    updatePanes([createStep(stepTitle(undefined, 0))])
  },
  { immediate: true },
)

const activePane = computed(() => panes.value[activeIndex.value])
const activePaneKey = computed(() => activePane.value?.__key)
const activeChildren = computed(() => {
  const c = activePane.value?.children
  return Array.isArray(c) ? c : []
})

const paneDnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: activeChildren,
  // 步骤向导内不允许再放入 steps（全局唯一，只能放根）
  accepts: (value) => {
    const v = value as { $cmp?: unknown; $formkit?: unknown } | undefined
    return !(v?.$cmp === 'steps' || v?.$formkit === 'steps')
  },
  onUpdateModelValue: (value) => {
    const k = activePaneKey.value
    if (!k) return
    if (canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(k, value)
  },
})

const currentStatus = computed(() => props.status ?? 'process')
const stepSize = computed<'small' | 'medium'>(() => props.size ?? 'small')

const selectStep = (idx: number) => {
  if (idx < 0 || idx >= panes.value.length) return
  activeIndex.value = idx
  const key = panes.value[idx]?.__key ?? null
  if (key && canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
}

const prevStep = () => selectStep(activeIndex.value - 1)
const nextStep = () => selectStep(activeIndex.value + 1)

const addStep = () => {
  const next = [...panes.value, createStep(stepTitle(undefined, panes.value.length))]
  updatePanes(next)
  activeIndex.value = next.length - 1
}

// 默认保留第一个 step：只剩一个时禁止删除。
const canDelete = computed(() => panes.value.length > 1)

const deleteActiveStep = () => {
  if (!canDelete.value) return
  const next = panes.value.filter((_, i) => i !== activeIndex.value)
  updatePanes(next)
  if (activeIndex.value >= next.length) activeIndex.value = 0
}

const editingIndex = ref<number | null>(null)
const editingTitle = ref('')
const editingDescription = ref('')

const startEdit = (idx: number) => {
  editingIndex.value = idx
  const pane = panes.value[idx]
  editingTitle.value = stepTitle(pane, idx)
  editingDescription.value = typeof pane?.description === 'string' ? pane.description : ''
}

const commitEdit = () => {
  const idx = editingIndex.value
  if (idx === null) return
  const nextTitle = editingTitle.value.trim() || stepTitle(panes.value[idx], idx)
  const next = panes.value.map((p, i) =>
    i === idx ? { ...p, label: nextTitle, description: editingDescription.value.trim() } : p,
  )
  updatePanes(next)
  editingIndex.value = null
}

const onSelectChild = (child: any) => {
  const key = child?.__key as string | undefined
  if (!key) return
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
}

const deleteChild = (index: number) => {
  const next = paneDnd.items.value.filter((_, i) => i !== index)
  paneDnd.items.value = next
  paneDnd.emitUpdate()
}

const duplicateChild = (index: number) => {
  const source = paneDnd.items.value[index]
  if (!source) return
  const names = new Set<string>()
  collectSchemaNames(formSchema.value as any, names)
  const clone = duplicateNode(source, names)
  const next = [...paneDnd.items.value]
  next.splice(index + 1, 0, clone)
  paneDnd.items.value = next
  paneDnd.emitUpdate()
}
</script>

<template>
  <div class="w-full">
    <div v-if="props.label || props.help" class="flex flex-col gap-0.5 px-1 py-2">
      <div v-if="props.label" class="text-xs text-muted-foreground">{{ props.label }}</div>
      <div v-if="props.help" class="text-[11px] text-muted-foreground">{{ props.help }}</div>
    </div>

    <!-- 步骤条：画布顶部，默认选中第一个步骤；双击步骤可编辑标题/描述 -->
    <div class="flex items-center gap-1">
      <n-steps
        class="flex-1 min-w-0"
        :current="activeIndex + 1"
        :status="currentStatus"
        :size="stepSize"
        :vertical="props.vertical"
        @update:current="(v: number) => selectStep(v - 1)"
      >
        <n-step
          v-for="(pane, idx) in panes"
          :key="pane.__key || idx"
          :title="stepTitle(pane, idx)"
          :description="pane.description"
          @dblclick.stop="startEdit(idx)"
        />
      </n-steps>
      <div class="flex items-center gap-0.5 shrink-0">
        <n-tooltip placement="top">
          <template #trigger>
            <n-button quaternary size="small" class="!h-7 !px-2" @click="addStep">
              <template #icon><span class="i-lucide-plus h-4 w-4"></span></template>
            </n-button>
          </template>
          {{ t('builder.addStep') }}
        </n-tooltip>
        <n-tooltip placement="top">
          <template #trigger>
            <n-button
              quaternary
              size="small"
              class="!h-7 !px-2"
              :disabled="!canDelete"
              @click="deleteActiveStep"
            >
              <template #icon><span class="i-lucide-trash-2 h-4 w-4"></span></template>
            </n-button>
          </template>
          {{ t('builder.deleteStep') }}
        </n-tooltip>
      </div>
    </div>

    <!-- 步骤标题 / 描述编辑区：双击步骤进入 -->
    <div
      v-if="editingIndex !== null"
      class="mt-2 rounded-lg border border-dashed border-border/60 p-2 space-y-1.5"
    >
      <div class="flex items-center gap-2">
        <label class="text-xs text-muted-foreground w-16 shrink-0">{{
          t('edits.content.title')
        }}</label>
        <n-input
          size="small"
          :value="editingTitle"
          @update:value="(v: string) => (editingTitle = v)"
          @keydown.enter.prevent="commitEdit"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-muted-foreground w-16 shrink-0">{{
          t('edits.content.description')
        }}</label>
        <n-input
          size="small"
          :value="editingDescription"
          @update:value="(v: string) => (editingDescription = v)"
          @keydown.enter.prevent="commitEdit"
        />
      </div>
      <div class="flex justify-end gap-2">
        <n-button size="tiny" @click="editingIndex = null">
          {{ t('common.cancel') }}
        </n-button>
        <n-button size="tiny" type="primary" @click="commitEdit">
          {{ t('common.save') }}
        </n-button>
      </div>
    </div>

    <!-- 当前步骤内容：唯一可拖入区域（拖拽元素只能落在活动步骤内部） -->
    <div class="mt-2">
      <ContainerChildrenGrid
        :container-ref="paneDnd.containerRef"
        :items="paneDnd.items"
        :selected-key="selectedKey"
        :empty-text="t('builder.listDropHere')"
        :delete-aria-label="t('builder.deleteField')"
        :copy-aria-label="t('builder.duplicateField')"
        :copy-tooltip-text="t('builder.duplicateField')"
        :resize-aria-label="t('builder.resizeFieldWidth')"
        :show-delete-tooltip="true"
        :delete-tooltip-text="t('builder.deleteField')"
        :data-attrs="{ 'data-steps-key': props.stepsKey, 'data-steps-pane-key': activePaneKey }"
        :set-nested-parent-on-root="paneDnd.setNestedParentOnRoot"
        :on-select="onSelectChild"
        :on-delete="deleteChild"
        :on-copy="duplicateChild"
        :on-resize-end="paneDnd.emitUpdate"
      />
    </div>

    <!-- 底部导航按钮：上一步 / 下一步（最后一步为“完成”） -->
    <div class="mt-3 flex items-center justify-between">
      <n-button size="small" :disabled="activeIndex <= 0" @click="prevStep">
        <template #icon><span class="i-lucide-arrow-left h-4 w-4"></span></template>
        {{ t('builder.prevStep') }}
      </n-button>
      <n-button
        size="small"
        type="primary"
        icon-placement="right"
        :disabled="activeIndex >= panes.length - 1"
        @click="nextStep"
      >
        {{ activeIndex >= panes.length - 1 ? t('builder.finish') : t('builder.nextStep') }}
        <template #icon>
          <span
            :class="
              activeIndex >= panes.length - 1
                ? 'i-lucide-check h-4 w-4'
                : 'i-lucide-arrow-right h-4 w-4'
            "
          ></span>
        </template>
      </n-button>
    </div>
  </div>
</template>
