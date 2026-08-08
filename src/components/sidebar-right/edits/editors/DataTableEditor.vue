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
import { NButton, NModal } from 'naive-ui'

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
const bordered = createPropsProp<boolean>('bordered', true)
// 数据操作开关：新增/编辑/删除。固定模式直接操作 data；远程模式开关右侧出现代码编辑入口
const allowAdd = createPropsProp<boolean>('allowAdd', false)
const allowEdit = createPropsProp<boolean>('allowEdit', false)
const allowDelete = createPropsProp<boolean>('allowDelete', false)

const allowFields = { allowAdd, allowEdit, allowDelete }

function allowValue(key: keyof typeof allowFields): boolean {
  return allowFields[key].value
}

function setAllow(key: keyof typeof allowFields, value: boolean) {
  allowFields[key].value = value
}

const dataOperationOptions = [
  {
    key: 'allowAdd',
    codeKey: 'createData',
    labelKey: 'edits.dataTable.allowAdd',
    icon: 'i-lucide-plus',
  },
  {
    key: 'allowEdit',
    codeKey: 'updateData',
    labelKey: 'edits.dataTable.allowEdit',
    icon: 'i-lucide-pencil',
  },
  {
    key: 'allowDelete',
    codeKey: 'deleteData',
    labelKey: 'edits.dataTable.allowDelete',
    icon: 'i-lucide-trash-2',
  },
] as const

// 远程数据操作代码：getData 取数 / createData 新增 / updateData 编辑 / deleteData 删除。
// 开启远程分页后在开关右侧显示图标按钮，点击弹窗编辑，确认后才落库；取消不写入。
const codeFields = {
  getData: createPropsProp<string>('getData', ''),
  createData: createPropsProp<string>('createData', ''),
  updateData: createPropsProp<string>('updateData', ''),
  deleteData: createPropsProp<string>('deleteData', ''),
}

type CodeFieldKey = keyof typeof codeFields

const codeMeta: Record<CodeFieldKey, { labelKey: string; hintKey: string }> = {
  getData: { labelKey: 'edits.dataTable.getData', hintKey: 'edits.dataTable.getDataHint' },
  createData: { labelKey: 'edits.dataTable.createData', hintKey: 'edits.dataTable.createDataHint' },
  updateData: { labelKey: 'edits.dataTable.updateData', hintKey: 'edits.dataTable.updateDataHint' },
  deleteData: { labelKey: 'edits.dataTable.deleteData', hintKey: 'edits.dataTable.deleteDataHint' },
}

const codeOpen = ref(false)
const codeDraft = ref('')
const activeCodeKey = ref<CodeFieldKey>('getData')

const codeLabel = computed(() => t(codeMeta[activeCodeKey.value].labelKey))
const codeHint = computed(() => t(codeMeta[activeCodeKey.value].hintKey))

function codeTitle(key: CodeFieldKey): string {
  return t(codeMeta[key].labelKey)
}

function openCode(key: CodeFieldKey) {
  activeCodeKey.value = key
  codeDraft.value = codeFields[key].value
  codeOpen.value = true
}

function saveCode() {
  codeFields[activeCodeKey.value].value = codeDraft.value
  codeOpen.value = false
}
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

  <!-- 数据来源：固定数据直接录入 / 远程分页编写取数代码 -->
  <div class="flex flex-row gap-2 items-center justify-between py-1">
    <label class="text-xs text-foreground/80 font-medium">
      {{ t('edits.dataTable.remote') }}
    </label>
    <div class="flex items-center gap-1">
      <n-switch size="small" :value="remote" @update:value="(v: boolean) => (remote = v)" />
      <n-button
        v-if="remote"
        text
        type="primary"
        size="tiny"
        :title="codeTitle('getData')"
        @click="openCode('getData')"
      >
        <template #icon><span class="i-lucide-download h-3.5 w-3.5" /></template>
      </n-button>
    </div>
  </div>

  <!-- 数据操作：仅远程分页显示；开关右侧提供对应代码编辑入口 -->
  <template v-if="remote">
    <div
      v-for="op in dataOperationOptions"
      :key="op.key"
      class="flex flex-row gap-2 items-center justify-between py-1"
    >
      <label class="text-xs text-foreground/80 font-medium">{{ t(op.labelKey) }}</label>
      <div class="flex items-center gap-1">
        <n-switch
          size="small"
          :value="allowValue(op.key)"
          @update:value="(v: boolean) => setAllow(op.key, v)"
        />
        <n-button
          text
          type="primary"
          size="tiny"
          :title="codeTitle(op.codeKey)"
          @click="openCode(op.codeKey)"
        >
          <template #icon><span :class="`${op.icon} h-3.5 w-3.5`" /></template>
        </n-button>
      </div>
    </div>
  </template>

  <SwitchInput
    :label="t('edits.dataTable.searchExpandable')"
    :value="searchExpandable"
    @update:value="(v) => (searchExpandable = v)"
  />

  <n-modal v-model:show="codeOpen" preset="card" class="max-w-[860px]">
    <template #header>
      <span class="text-sm font-medium">{{ codeLabel }}</span>
    </template>
    <div class="space-y-2">
      <div class="text-[11px] text-muted-foreground whitespace-pre-wrap">
        {{ codeHint }}
      </div>
      <JsCodeEditor
        v-model:modelValue="codeDraft"
        :height="360"
        :field-names="availableFieldNames"
      />
      <div class="flex justify-end gap-2">
        <n-button size="small" @click="codeOpen = false">
          {{ t('common.cancel') }}
        </n-button>
        <n-button size="small" type="primary" @click="saveCode">
          {{ t('common.save') }}
        </n-button>
      </div>
    </div>
  </n-modal>
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
