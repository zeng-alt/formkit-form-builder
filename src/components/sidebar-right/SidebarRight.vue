<script setup lang="ts">
import { computed } from 'vue'
import { NLayoutSider, NScrollbar } from 'naive-ui'
import FormEditMain from './FormEditMain.vue'
import { createFieldProps } from '@/elements'
import { useFormField } from '../../composables/form-fields'
import { useFormBuilderI18n } from '../../i18n/context'

const { currentFieldType, selectedIsForm, formName } = useFormField()
const { t } = useFormBuilderI18n()
const fieldProps = computed(() => createFieldProps(t))
const currentProp = computed(() =>
  fieldProps.value.find((prop) => prop.name === currentFieldType.value),
)

const headerTitle = computed(() => {
  if (selectedIsForm.value) return t('formSettings.title')
  return currentProp.value?.tooltip ?? ''
})

const headerSubtitle = computed(() => {
  if (selectedIsForm.value) return formName.value
  return currentFieldType.value ?? ''
})

const headerIcon = computed(() => {

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
        <div class="h-11 w-11 rounded-md bg-ring/20 flex items-center justify-center shrink-0">
          <span :class="`${headerIcon} h-8 w-8 text-green-700 dark:text-white/70`"></span>
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
