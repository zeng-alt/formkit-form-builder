<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NInput, NSwitch } from 'naive-ui'
import { useFormBuilderI18n } from '../../../i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormField } from '../../../composables/form-fields'
import ExprEditModal from './common/ExprEditModal.vue'
import { isUnparsedExpr, parseExprString } from '@/dsl'

// 泛化：目标键决定读写哪个条件表达式（visibleIf/requiredIf/disabledIf/readonlyIf），
// 内部开关 + 只读输入框 + 铅笔打开 ExprEditModal、解析失败提示这套交互四个键完全复用；
// 标题走 i18n key（不传则用条件渲染的默认标题，向后兼容原先零 props 的用法）。
const props = withDefaults(
  defineProps<{
    targetKey?: 'visibleIf' | 'requiredIf' | 'disabledIf' | 'readonlyIf'
    titleKey?: string
  }>(),
  { targetKey: 'visibleIf' },
)

const { selectedIndex, selectedKey, elementEditTarget } = useFormBuilderState()
const {
  availableFields,
  ifExpression,
  requiredIfExpression,
  disabledIfExpression,
  readonlyIfExpression,
} = useFormField()
const { t } = useFormBuilderI18n()

const expressionByKey = {
  visibleIf: ifExpression,
  requiredIf: requiredIfExpression,
  disabledIf: disabledIfExpression,
  readonlyIf: readonlyIfExpression,
} as const
// 按 targetKey 委托读写目标计算属性：get/set 都转发到对应的那一个，targetKey
// 本身在同一个实例的生命周期内不会变（每种目标各自一个 <IfConditionEditor> 实例）
const targetExpression = computed<string>({
  get: () => expressionByKey[props.targetKey].value,
  set: (value: string) => {
    expressionByKey[props.targetKey].value = value
  },
})

const titleText = computed(() => t(props.titleKey ?? 'condition.useIf'))

const enabled = ref(false)
const draft = ref('')
const modalOpen = ref(false)

// 选中 token：数据表格列元素等非树节点编辑时随 elementEditTarget 变化（切换列需重新同步）
const selectionToken = computed(
  () => elementEditTarget.value ?? selectedKey.value ?? String(selectedIndex.value),
)

watch(
  selectionToken,
  () => {
    enabled.value = Boolean(targetExpression.value)
    draft.value = targetExpression.value
  },
  { immediate: true },
)

watch(targetExpression, (v) => {
  if (!enabled.value) return
  if (draft.value !== v) draft.value = v
})

const handleSwitchChange = (val: boolean) => {
  enabled.value = val
  if (!val) {
    targetExpression.value = ''
    draft.value = ''
  }
}

function openModal() {
  modalOpen.value = true
}

function handleSave(value: string) {
  draft.value = value
  targetExpression.value = value
  modalOpen.value = false
}

// 内置语法解析不了的条件会原样交给 FormKit 求值：可能是 FormKit 自己的写法，也可能写错了，给个提醒
const unparsed = computed(() => {
  const text = draft.value.trim()
  return text !== '' && text !== '$' && isUnparsedExpr(parseExprString(text))
})
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex flex-row gap-2 items-center justify-between py-1">
      <label class="text-xs text-foreground/80 font-medium">{{ titleText }}</label>
      <n-switch size="small" :value="enabled" @update:value="handleSwitchChange" />
    </div>

    <div v-if="enabled" class="flex items-center gap-2">
      <n-input
        :value="draft"
        readonly
        size="small"
        class="flex-1"
        :placeholder="t('condition.placeholder')"
      />
      <n-button size="tiny" @click="openModal">
        <span class="i-lucide-pencil h-3.5 w-3.5" />
      </n-button>
    </div>
    <div
      v-if="enabled && unparsed"
      class="text-[11px] leading-snug text-amber-600 dark:text-amber-400"
    >
      {{ t('condition.parseWarning') }}
    </div>

    <ExprEditModal
      :show="modalOpen"
      :model-value="draft"
      :field-names="availableFields"
      :title="titleText"
      @update:show="(v) => (modalOpen = v)"
      @save="handleSave"
    />
  </div>
</template>
