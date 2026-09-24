<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import EditorSection from '../common/EditorSection.vue'
import SwitchInput from '../common/SwitchInput.vue'

// 任务 C 的约定：不放 BindEditor / LabelHelpSection / NameInput。「标题」就是节点顶层
// label（与 card 同一语义），跟 card 一样交给外层「基础」分组统一渲染，这里只保留
// collapse 自己的「外观」「行为」配置项。
const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const bordered = createPropsProp<boolean>('bordered', true)
const defaultExpanded = createPropsProp<boolean>('defaultExpanded', true)
const disableCollapse = createPropsProp<boolean>('disableCollapse', false)
</script>

<template>
  <EditorSection :title="t('edits.sections.appearance')">
    <SwitchInput
      :label="t('edits.props.bordered')"
      :value="bordered"
      @update:value="(v) => (bordered = v)"
    />
  </EditorSection>

  <EditorSection :title="t('edits.sections.behavior')">
    <SwitchInput
      :label="t('edits.collapse.defaultExpandedLabel')"
      :value="defaultExpanded"
      @update:value="(v) => (defaultExpanded = v)"
    />
    <SwitchInput
      :label="t('edits.collapse.disableCollapseLabel')"
      :value="disableCollapse"
      @update:value="(v) => (disableCollapse = v)"
    />
  </EditorSection>
</template>
