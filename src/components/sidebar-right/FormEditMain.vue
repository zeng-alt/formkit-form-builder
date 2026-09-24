<script setup lang="ts">
import { computed } from 'vue'
import ValidationSection from './validations/ValidationSection.vue'
import { useFormField } from '../../composables/form-fields'
import EditsSection from './edits/EditsSection.vue'
import EditorSection from './edits/common/EditorSection.vue'
import CustomAttrsSection from './edits/common/CustomAttrsSection.vue'
import ExpressionEditor from './edits/ExpressionEditor.vue'
import IfConditionEditor from './edits/IfConditionEditor.vue'
import BindEditor from './edits/BindEditor.vue'
import BatchSelectionPanel from './edits/BatchSelectionPanel.vue'
import { useFormBuilderI18n } from '../../i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { getElementTypeDef } from '@/dsl'
import { getContainerSpec } from '@/elements/container-spec'
import FormEditor from './edits/editors/FormEditor.vue'
import DataTableColumnEditor from './edits/editors/DataTableColumnEditor.vue'

const { hasField, currentFieldType, selectedIsForm, selectedColumn } = useFormField()
const { t } = useFormBuilderI18n()
// D1：多选时右侧面板只显示批量操作，不显示单个元素的属性
const { selectedKeys } = useFormBuilderState()
const isBatchSelection = computed(() => selectedKeys.value.length > 1)

// 不存值的容器（数据表格、按钮组、徽标）没有可校验的值，不显示校验规则
const hasValidation = computed(
  () => getContainerSpec(currentFieldType.value ?? undefined)?.dataShape !== 'none',
)

const isFieldsCategory = computed(() => {
  if (selectedIsForm.value) return false
  if (!currentFieldType.value) return false
  // 直接查注册表分类；目录外的类型（tabsPane / grid / row / column）不是字段
  return getElementTypeDef(currentFieldType.value)?.category === 'field'
})

// 「事件」分组按当前选中元素定义声明的 bindEvents 渲染（见 elements/definitions/*.ts、
// elements/types.ts 的 ElementCatalogEntry.bindEvents）：未声明或空数组则不显示该分组，
// 各编辑器不再各自持有 BindEditor + :events。
const bindEvents = computed<readonly string[]>(() => {
  if (!currentFieldType.value) return []
  return getElementTypeDef(currentFieldType.value)?.bindEvents ?? []
})
const hasEvents = computed(() => bindEvents.value.length > 0)
</script>

<template>
  <div class="p-2">
    <div class="space-y-2 md:space-y-3">
      <BatchSelectionPanel v-if="isBatchSelection" />
      <DataTableColumnEditor v-else-if="selectedColumn" />
      <FormEditor v-else-if="!hasField || selectedIsForm" />
      <template v-else>
        <EditsSection />
        <!-- 逻辑：表达式值 / 条件渲染 -->
        <EditorSection :title="t('edits.sections.logic')">
          <ExpressionEditor v-if="isFieldsCategory" />
          <IfConditionEditor />
        </EditorSection>
        <!-- 事件：按元素定义的 bindEvents 决定是否显示 -->
        <EditorSection v-if="hasEvents" :title="t('edits.sections.events')">
          <BindEditor :events="[...bindEvents]" />
        </EditorSection>
        <!-- 折叠区：自定义属性 / 校验规则，保持原有位置 -->
        <CustomAttrsSection />
        <ValidationSection v-if="hasValidation" />
      </template>
    </div>
  </div>
</template>
