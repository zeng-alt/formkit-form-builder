<script setup lang="ts">
import { computed } from 'vue'
import { NLayoutSider, NScrollbar } from 'naive-ui'
import FormEditMain from './FormEditMain.vue'
import { createFieldProps } from '@/elements'
import { useFormField } from '../../composables/form-fields'
import { useFormBuilderI18n } from '../../i18n/context'

const { currentFieldType, selectedIsForm, formName, selectedColumn } = useFormField()
const { t } = useFormBuilderI18n()
const fieldProps = computed(() => createFieldProps(t))
const currentProp = computed(() =>
  fieldProps.value.find((prop) => prop.name === currentFieldType.value),
)

const columnTitle = computed(() => {
  const col = selectedColumn.value?.column
  return col?.title?.trim() || col?.key || ''
})

const headerTitle = computed(() => {
  if (selectedColumn.value) return t('edits.dataTable.column')
  if (selectedIsForm.value) return t('formSettings.title')
  return currentProp.value?.tooltip ?? ''
})

const headerSubtitle = computed(() => {
  if (selectedColumn.value) return columnTitle.value
  if (selectedIsForm.value) return formName.value
  return currentFieldType.value ?? ''
})

const headerIcon = computed(() => {
  if (selectedColumn.value) return 'i-lucide-columns-3'
  if (selectedIsForm.value) return 'i-lucide-panel-top'
  return currentProp.value?.icon ?? ''
})
</script>

<template>
  <n-layout-sider
    bordered
    :width="300"
    :collapsed-width="0"
    show-trigger="bar"
    collapse-mode="width"
    :native-scrollbar="false"
    content-style="display: flex; flex-direction: column; height: 100%;"
    class="sidebar-sider"
  >
    <div class="p-3 border-b">
      <div class="flex items-center gap-3">
        <div class="h-8 w-8 rounded-md flex items-center justify-center shrink-0">
          <span :class="`${headerIcon} h-8 w-8`"></span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium text-foreground truncate">
            {{ headerTitle }}
          </div>
          <div class="text-[11px] text-muted-foreground truncate">
            {{ headerSubtitle }}
          </div>
        </div>
      </div>
    </div>
    <n-scrollbar class="flex-1 sidebar-scrollbar">
      <FormEditMain />
    </n-scrollbar>
  </n-layout-sider>
</template>
