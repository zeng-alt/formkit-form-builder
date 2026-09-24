<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../i18n/context'
import { getFieldEditorComponent } from '@/elements'
import { getElementTypeDef } from '@/dsl'
import EditorSection from './common/EditorSection.vue'
import NameInput from './common/NameInput.vue'
import StaticContentSection from './common/StaticContentSection.vue'
import ColSpanSection from './common/ColSpanSection.vue'
import RowSpanSection from './common/RowSpanSection.vue'
import LabelHelpSection from './common/LabelHelpSection.vue'

const { hasField, currentFieldType, selectedIsForm } = useFormField()
const { t } = useFormBuilderI18n()

const isStatic = computed(() => {
  if (!currentFieldType.value) return false
  return getElementTypeDef(currentFieldType.value)?.category === 'static'
})

const editorComponent = computed(() => {
  return getFieldEditorComponent(currentFieldType.value)
})

// 「基础」分组统一由这里渲染（名称 / 列数 / 标签帮助），各编辑器不再各自重复：
// 标签/帮助只在该类型确有 label 语义时显示——有专属编辑器（.editor）、非静态元素、
// 非纯数据结构容器（group/buttonGroup 没有可见的标题）。tabsPane 的名称/标题在
// NameInput 里已有专门的两栏 UI，这里不重复渲染（tabsPane 无独立编辑器，
// editorComponent 为空，天然被下面的判断挡掉）。
const hasLabelHelp = computed(() => {
  if (!currentFieldType.value) return false
  const category = getElementTypeDef(currentFieldType.value)?.category
  if (category === 'static') return false
  if (currentFieldType.value === 'group' || currentFieldType.value === 'buttonGroup') return false
  return Boolean(editorComponent.value)
})

// 占用行数（RowSpanSection）目前只有图片字段用到，跟着列数一起放进「基础」分组
const hasRowSpan = computed(() => currentFieldType.value === 'naiveImage')
</script>

<template>
  <div v-if="!hasField" class="flex p-2 h-full text-[11px] md:text-xs text-muted-foreground">
    {{ t('common.selectFieldToEdit') }}
  </div>
  <!-- 外层 FormEditMain 已有 p-2，这里不再加内边距，保证与校验规则等分组左右对齐 -->
  <div v-else class="space-y-2 md:space-y-3">
    <EditorSection :title="t('edits.sections.basic')">
      <NameInput />
      <ColSpanSection v-if="!selectedIsForm" />
      <RowSpanSection v-if="hasRowSpan" />
      <LabelHelpSection v-if="hasLabelHelp" />
    </EditorSection>
    <StaticContentSection v-if="isStatic" />
    <component :is="editorComponent" v-if="editorComponent" />
  </div>
</template>
