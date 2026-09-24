<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NSwitch, NButton, NInput } from 'naive-ui'
import { useFormField } from '../../../composables/form-fields'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '../../../i18n/context'
import ExprEditModal from './common/ExprEditModal.vue'
import { isUnparsedExpr, parseExprString } from '@/dsl'

const { selectedIndex, selectedKey, elementEditTarget } = useFormBuilderState()
const { availableFields, useExpressionValue, valueExpression, fieldValue, fieldName } =
  useFormField()
const { t } = useFormBuilderI18n()

// 表达式编辑器不提示字段自身（自引用会死循环）
const completionFields = computed(() =>
  availableFields.value.filter((f) => f.name !== fieldName.value),
)

const isExpression = ref(false)
const expressionDraft = ref('')
const modalOpen = ref(false)

// 选中 token：数据表格列元素等非树节点编辑时随 elementEditTarget 变化（切换列需重新同步）
const selectionToken = computed(
  () => elementEditTarget.value ?? selectedKey.value ?? String(selectedIndex.value),
)

watch(
  selectionToken,
  () => {
    const legacy = fieldValue.value.trim()
    if (!useExpressionValue.value && !valueExpression.value && legacy.startsWith('$')) {
      useExpressionValue.value = true
      valueExpression.value = legacy
      fieldValue.value = ''
    }
    isExpression.value = Boolean(useExpressionValue.value)
    expressionDraft.value = valueExpression.value
  },
  { immediate: true },
)

watch(valueExpression, (v) => {
  if (!isExpression.value) return
  if (expressionDraft.value !== v) expressionDraft.value = v
})

const handleSwitchChange = (val: boolean) => {
  isExpression.value = val
  if (val) {
    useExpressionValue.value = true
    if (!valueExpression.value) valueExpression.value = '$'
    expressionDraft.value = valueExpression.value
  } else {
    useExpressionValue.value = false
    valueExpression.value = ''
    expressionDraft.value = ''
    if (fieldValue.value.trim().startsWith('$')) fieldValue.value = ''
  }
}

function openModal() {
  modalOpen.value = true
}

function handleSave(value: string) {
  expressionDraft.value = value
  valueExpression.value = value
  modalOpen.value = false
}

// 内置语法解析不了的表达式运行时算不出结果（静默失败），在面板上直接提示
const unparsed = computed(() => {
  const text = expressionDraft.value.trim()
  return text !== '' && text !== '$' && isUnparsedExpr(parseExprString(text))
})
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex flex-row gap-2 items-center justify-between py-1">
      <label class="text-xs text-foreground/80 font-medium">{{
        t('expression.useExpressionValue')
      }}</label>
      <n-switch size="small" :value="isExpression" @update:value="handleSwitchChange" />
    </div>

    <div v-if="isExpression" class="flex items-center gap-2">
      <n-input
        :value="expressionDraft"
        readonly
        size="small"
        class="flex-1"
        :placeholder="t('expression.placeholder')"
      />
      <n-button size="tiny" @click="openModal">
        <span class="i-lucide-pencil h-3.5 w-3.5" />
      </n-button>
    </div>
    <div
      v-if="isExpression && unparsed"
      class="text-[11px] leading-snug text-red-500 dark:text-red-400"
    >
      {{ t('expression.parseError') }}
    </div>

    <ExprEditModal
      :show="modalOpen"
      :model-value="expressionDraft"
      :field-names="completionFields"
      :title="t('expression.useExpressionValue')"
      @update:show="(v) => (modalOpen = v)"
      @save="handleSave"
    />
  </div>
</template>
