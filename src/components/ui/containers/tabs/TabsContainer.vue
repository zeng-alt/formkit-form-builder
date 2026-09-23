<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import {
  NButton,
  NInput,
  NTabPane,
  NTabs,
  NTooltip,
  useNotification,
  type InputInst,
} from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { generateKey } from '@/utils/dnd/schema'
import TabsPaneCanvas from './TabsPaneCanvas.vue'

// 画布 tabs 容器：与运行时 TabsContainerPreview 用同一个 NTabs、同样的默认值
// （type=line / placement=top / size=small / animated=true），closable 也直接交给
// NTabPane——naive-ui 只在 type=card 时渲染关闭按钮，画布与运行时表现一致。
// 在此之上叠加编辑能力：suffix 里的新增按钮（设计态专用，与字段上的删除/复制按钮
// 同类）、双击标题改名、关闭即删除 pane、每个 pane 内各自一份拖放画布。

type TabsPane = {
  __key: string
  /** H1：运行时分组数据键，创建时即固定生成，独立于 label（标题）——避免双击改名
   *  时数据 key 跟着标题变，刷新前后表单数据不一致、同名 pane 还会互相覆盖 */
  name?: string
  label?: string
  children?: FormKitSchemaFormKit[]
  outerClass?: string
}

const props = defineProps<{
  tabsKey?: string
  modelValue: TabsPane[]
  label?: string
  help?: string
  disabled?: boolean
  type?: string
  placement?: string
  size?: string
  animated?: boolean
  closable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: TabsPane[]): void
}>()

const { t } = useFormBuilderI18n()
const canvasCtx = useCanvasSchemaContext()
const notification = useNotification()

const panes = computed<TabsPane[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const updatePanes = (next: TabsPane[]) => {
  const k = props.tabsKey
  // TabsPane 是 pane 占位对象（__key/label/children/outerClass），不是判别式 schema 节点
  // （没有 $formkit/$cmp），canvasCtx.updateContainerChildren 收 FormKitSchemaFormKit[]，
  // 两者形状不同但语义兼容（pane 经 formatContainer 包一层才是完整 schema 节点，
  // 这里传的是内部表示），保留断言
  if (k && canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(k, next as any)
  else emit('update:modelValue', next)
}

const createPane = (label: string): TabsPane => {
  const key = generateKey()
  // 稳定的运行时数据键，与 label 解耦（同 StepsContainer.vue 的 createStep）：
  // 双击改名只改 label，不影响这个 name，表单数据 key 不会因为改标题而丢失/漂移
  const name = `tab_${Math.random().toString(36).slice(2, 8)}`
  return { __key: key, name, label, outerClass: 'col-span-12', children: [] }
}

// 新建 pane 的默认标题避开当前容器内已使用的标题（Tab N，N 从当前数量+1 起递增探测）
const nextDefaultLabel = (prefix: string): string => {
  const used = new Set(
    panes.value.map((p) => (typeof p.label === 'string' ? p.label.trim() : '')).filter(Boolean),
  )
  let n = panes.value.length + 1
  let label = `${prefix} ${n}`
  while (used.has(label)) {
    n++
    label = `${prefix} ${n}`
  }
  return label
}

// 首次拖入且无 pane 时预置一个默认 pane
const bootstrapped = ref(false)
watch(
  () => panes.value.length,
  (len) => {
    if (bootstrapped.value) return
    if (!props.tabsKey) return
    if (!canvasCtx?.updateContainerChildren) return
    bootstrapped.value = true
    if (len === 0) updatePanes([createPane(nextDefaultLabel('Tab'))])
  },
  { immediate: true },
)

// 受控 value = 当前激活 pane 的 __key；panes 变化（新增/删除/undo）时保证落在有效 key 上
const activeKey = ref<string | null>(null)
watch(
  () => panes.value.map((p) => p.__key).join('|'),
  (next) => {
    const keys = next ? next.split('|').filter(Boolean) : []
    if (keys.length === 0) {
      activeKey.value = null
      return
    }
    if (!activeKey.value || !keys.includes(activeKey.value)) activeKey.value = keys[0] ?? null
  },
  { immediate: true },
)

const tabLabel = (pane: TabsPane | undefined, idx: number) => {
  const label = pane?.label
  if (typeof label === 'string' && label.trim()) return label.trim()
  return `Tab ${idx + 1}`
}

// 选中 pane：右侧属性面板显示其标题编辑器
const selectPane = (key: string | null | undefined) => {
  if (key && canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
}

// 任何方式切换标签（点标题、键盘）都同步选中对应 pane
const onUpdateActive = (key: string | number) => {
  activeKey.value = String(key)
  selectPane(activeKey.value)
}

const addTab = () => {
  const pane = createPane(nextDefaultLabel('Tab'))
  updatePanes([...panes.value, pane])
  activeKey.value = pane.__key
  selectPane(pane.__key)
}

// 至少保留 1 个 pane：只剩最后一个时不给关闭（与 steps 的 canDelete 一致）
const paneClosable = computed(() => Boolean(props.closable) && panes.value.length > 1)

const onClosePane = (name: string | number) => {
  const key = String(name)
  if (panes.value.length <= 1) return
  const idx = panes.value.findIndex((p) => p.__key === key)
  if (idx < 0) return
  const next = panes.value.filter((p) => p.__key !== key)
  updatePanes(next)
  if (activeKey.value === key) {
    activeKey.value = next[Math.min(idx, next.length - 1)]?.__key ?? null
    selectPane(activeKey.value)
  }
}

const editingIndex = ref<number | null>(null)
const editingValue = ref('')

// 改名输入框是双击后才动态挂载的：原生 autofocus 只在页面加载时生效，这里挂载后手动聚焦
let editInput: InputInst | null = null
const setEditInput = (el: unknown) => {
  editInput = (el as InputInst | null) ?? null
}

const startEdit = (idx: number) => {
  editingIndex.value = idx
  editingValue.value = tabLabel(panes.value[idx], idx)
  nextTick(() => {
    editInput?.focus()
    editInput?.select()
  })
}

// H1：改名唯一性——标题在同一个 tabs 容器内重复时拒绝这次改名，保留旧标题并提示原因。
// 每个 pane 的运行时数据键（name）创建时已固定、与标题解耦，重复标题本身不会导致
// 数据互相覆盖，这里仍然拦住是为了避免画布上出现两个分不清的同名标签
const isDuplicateLabel = (label: string, selfIdx: number) =>
  panes.value.some((p, i) => i !== selfIdx && tabLabel(p, i) === label)

const commitEdit = () => {
  const idx = editingIndex.value
  if (idx === null) return
  const nextLabel = editingValue.value.trim() || tabLabel(panes.value[idx], idx)
  if (isDuplicateLabel(nextLabel, idx)) {
    notification.warning({ title: t('builder.paneNameDuplicate', { name: nextLabel }) })
    editingIndex.value = null
    return
  }
  const next = panes.value.map((p, i) => (i === idx ? { ...p, label: nextLabel } : p))
  updatePanes(next)
  editingIndex.value = null
}

// 改名输入框的键盘处理：合并为单个 @keydown 按 e.key 分支，而不是在同一个 <n-input>
// 上挂两个 @keydown.xxx 修饰符——Vue 会把同名事件的多个处理器合并成数组传给
// NInput 的 onKeydown prop（类型声明为 Function），导致每次触发都报
// `Invalid prop: type check failed for prop "onKeydown". Expected Function, got Array`。
const onEditKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.stopPropagation()
    e.preventDefault()
    commitEdit()
  } else if (e.key === 'Escape') {
    e.stopPropagation()
    e.preventDefault()
    editingIndex.value = null
  }
}
</script>

<template>
  <div class="w-full">
    <!-- 标题/说明与 TabsContainerPreview 同款样式 -->
    <div v-if="props.label || props.help" class="flex flex-col gap-0.5 mb-2">
      <div v-if="props.label" class="text-sm font-medium">
        {{ props.label }}
      </div>
      <div v-if="props.help" class="text-xs text-muted-foreground">
        {{ props.help }}
      </div>
    </div>
    <!-- 类型断言原因同 TabsContainerPreview.vue：本组件的 string prop 与 naive-ui 更窄的
         字面量联合类型之间，基于类型的 defineProps 无法直接复用 naive-ui 的类型 -->
    <n-tabs
      :value="activeKey ?? undefined"
      :type="(props.type as any) || 'line'"
      :placement="(props.placement as any) || 'top'"
      :size="(props.size as any) || 'small'"
      :animated="props.animated ?? true"
      @update:value="onUpdateActive"
      @close="onClosePane"
    >
      <template #suffix>
        <n-tooltip placement="top">
          <template #trigger>
            <n-button
              quaternary
              size="small"
              class="tabs-add-btn !h-7 !px-2"
              :aria-label="t('builder.addTab')"
              @click="addTab"
            >
              <template #icon
                ><span aria-hidden="true" class="i-lucide-plus h-4 w-4"></span
              ></template>
            </n-button>
          </template>
          {{ t('builder.addTab') }}
        </n-tooltip>
      </template>

      <n-tab-pane
        v-for="(pane, idx) in panes"
        :key="pane.__key || idx"
        :name="pane.__key || String(idx)"
        :closable="paneClosable"
        display-directive="show:lazy"
      >
        <template #tab>
          <n-input
            data-canvas-edit
            v-if="editingIndex === idx"
            :ref="setEditInput"
            size="small"
            class="!w-32"
            :value="editingValue"
            @update:value="(v: string) => (editingValue = v)"
            @click.stop
            @dblclick.stop
            @blur="commitEdit"
            @keydown="onEditKeydown"
          />
          <span v-else class="tabs-tab-label select-none" @dblclick.stop="startEdit(idx)">
            {{ tabLabel(pane, idx) }}
          </span>
        </template>

        <TabsPaneCanvas :pane-key="pane.__key" :children="pane.children" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
