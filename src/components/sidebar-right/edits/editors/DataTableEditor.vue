<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import NumberInput from '../common/NumberInput.vue'
import JsonTextarea from '../common/JsonTextarea.vue'
import JsCodeEditor from '../common/JsCodeEditor.vue'
import type { DataTableColumn } from '@/components/ui/containers/data-table/types'

const { t } = useFormBuilderI18n()
const { createPropsProp, availableFieldNames } = useFormField()
// 选中 token：切换选中元素时重新同步 JSON 草稿
const { selectedIndex, selectedKey } = useFormBuilderState()
const selectionToken = computed(() => selectedKey.value ?? String(selectedIndex.value))

const columns = createPropsProp<DataTableColumn[] | null>('columns', null)
const columnsDraft = ref('')
const columnsError = ref('')
const columnsModel = computed({
  get: () => columnsDraft.value,
  set: (s: string) => {
    columnsDraft.value = s
    if (!s.trim()) {
      columns.value = null
      columnsError.value = ''
      return
    }
    try {
      const parsed = JSON.parse(s)
      if (!Array.isArray(parsed)) {
        columnsError.value = t('edits.dataTable.columnsError')
        return
      }
      columns.value = parsed.length ? (parsed as DataTableColumn[]) : null
      columnsError.value = ''
    } catch {
      columnsError.value = t('edits.dataTable.columnsError')
    }
  },
})

const data = createPropsProp<Record<string, unknown>[] | null>('data', null)
const dataDraft = ref('')
const dataError = ref('')
const dataModel = computed({
  get: () => dataDraft.value,
  set: (s: string) => {
    dataDraft.value = s
    if (!s.trim()) {
      data.value = null
      dataError.value = ''
      return
    }
    try {
      const parsed = JSON.parse(s)
      if (!Array.isArray(parsed)) {
        dataError.value = t('edits.dataTable.dataError')
        return
      }
      data.value = parsed.length ? (parsed as Record<string, unknown>[]) : null
      dataError.value = ''
    } catch {
      dataError.value = t('edits.dataTable.dataError')
    }
  },
})

watch(
  selectionToken,
  () => {
    columnsDraft.value = JSON.stringify(columns.value ?? [], null, 2)
    dataDraft.value = JSON.stringify(data.value ?? [], null, 2)
    columnsError.value = ''
    dataError.value = ''
  },
  { immediate: true },
)

const rowKey = createPropsProp<string>('rowKey', 'id')
const pageSize = createPropsProp<number>('pageSize', 10)
const scrollX = createPropsProp<number | null>('scrollX', null)
const tableSize = createPropsProp<string>('size', 'medium')
const pagination = createPropsProp<boolean>('pagination', false)
const remote = createPropsProp<boolean>('remote', false)
const searchExpandable = createPropsProp<boolean>('searchExpandable', false)
const getData = createPropsProp<string>('getData', '')
const bordered = createPropsProp<boolean>('bordered', true)
</script>

<template>
  <LabelHelpSection />

  <TextInput
    :label="t('edits.dataTable.rowKey')"
    :placeholder="t('edits.dataTable.rowKeyPlaceholder')"
    :value="rowKey"
    @update:value="(v) => (rowKey = v)"
  />

  <JsonTextarea
    :label="t('edits.dataTable.columns')"
    :placeholder="t('edits.dataTable.columnsPlaceholder')"
    :value="columnsModel"
    :error="columnsError"
    @update:value="(v) => (columnsModel = v)"
  />

  <JsonTextarea
    v-if="!remote"
    :label="t('edits.dataTable.data')"
    :placeholder="t('edits.dataTable.dataPlaceholder')"
    :value="dataModel"
    :error="dataError"
    @update:value="(v) => (dataModel = v)"
  />

  <SelectInput
    :label="t('edits.dataTable.size')"
    :value="tableSize"
    :options="[
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
      { label: 'large', value: 'large' },
    ]"
    @update:value="(v) => (tableSize = v)"
  />

  <SwitchInput
    :label="t('edits.dataTable.pagination')"
    :value="pagination"
    @update:value="(v) => (pagination = v)"
  />
  <SwitchInput
    :label="t('edits.dataTable.remote')"
    :value="remote"
    @update:value="(v) => (remote = v)"
  />
  <SwitchInput
    :label="t('edits.dataTable.searchExpandable')"
    :value="searchExpandable"
    @update:value="(v) => (searchExpandable = v)"
  />
  <div v-if="remote" class="space-y-1">
    <div class="text-[11px] font-medium text-muted-foreground">
      {{ t('edits.dataTable.getData') }}
    </div>
    <div class="text-[11px] text-muted-foreground">
      {{ t('edits.dataTable.getDataHint') }}
    </div>
    <JsCodeEditor v-model:modelValue="getData" :height="220" :field-names="availableFieldNames" />
  </div>
  <SwitchInput
    :label="t('edits.dataTable.bordered')"
    :value="bordered"
    @update:value="(v) => (bordered = v)"
  />

  <NumberInput
    :label="t('edits.dataTable.pageSize')"
    :placeholder="'10'"
    :value="pageSize"
    @update:value="(v: number | null) => (pageSize = v ?? 10)"
  />

  <NumberInput
    :label="t('edits.dataTable.scrollX')"
    :placeholder="t('edits.dataTable.scrollXPlaceholder')"
    :value="scrollX"
    @update:value="(v: number | null) => (scrollX = v)"
  />
</template>
