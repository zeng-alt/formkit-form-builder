<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormField } from '../../../../composables/form-fields'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import EditsLayout from '../common/EditsLayout.vue'
import TextInput from '../common/TextInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import NumberInput from '../common/NumberInput.vue'
import JsonTextarea from '../common/JsonTextarea.vue'
import JsCodeEditor from '../common/JsCodeEditor.vue'
import DataTableColumnList from './DataTableColumnList.vue'
import type { DataTableColumn } from '@/components/ui/containers/data-table/types'
import DataTableDataGridModal from '@/components/ui/containers/data-table/DataTableDataGridModal.vue'
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSwitch,
} from 'naive-ui'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { t } = useFormBuilderI18n()
const { createPropsProp, availableFieldNames, selectedField, selectedColumnIndex } = useFormField()
// 选中 token：切换选中元素时重新同步 JSON 草稿
const { selectedIndex, selectedKey } = useFormBuilderState()
const selectionToken = computed(() => selectedKey.value ?? String(selectedIndex.value))

const columns = createPropsProp<DataTableColumn[] | null>('columns', null)
const columnsList = computed(() => columns.value ?? [])

function updateColumns(next: DataTableColumn[]) {
  columns.value = next.length ? next : null
}

function selectColumn(idx: number | null) {
  selectedColumnIndex.value = idx
}

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
const modalWidth = createPropsProp<number | null>('modalWidth', null)
const tableSize = createPropsProp<string>('size', 'medium')
const pagination = createPropsProp<boolean>('pagination', false)
const remote = createPropsProp<boolean>('remote', false)
const searchExpandable = createPropsProp<boolean>('searchExpandable', false)
const bordered = createPropsProp<boolean>('bordered', true)
// 数据操作开关：新增/编辑/删除。固定与远程两种模式都显示；固定模式直接操作 data，
// 远程模式额外在「数据来源」分组里提供对应的代码编辑入口。
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

const allowSwitchOptions = [
  { key: 'allowAdd', labelKey: 'edits.dataTable.allowAdd' },
  { key: 'allowEdit', labelKey: 'edits.dataTable.allowEdit' },
  { key: 'allowDelete', labelKey: 'edits.dataTable.allowDelete' },
] as const

// 远程数据操作代码：getData 取数 / createData 新增 / updateData 编辑 / deleteData 删除。
// 每行显示配置状态，点编辑按钮弹窗改代码，确认后才落库；取消不写入。
const codeFields = {
  getData: createPropsProp<string>('getData', ''),
  createData: createPropsProp<string>('createData', ''),
  updateData: createPropsProp<string>('updateData', ''),
  deleteData: createPropsProp<string>('deleteData', ''),
}

type CodeFieldKey = keyof typeof codeFields

const codeMeta: Record<CodeFieldKey, { labelKey: string; hintKey: string; icon: string }> = {
  getData: {
    labelKey: 'edits.dataTable.getData',
    hintKey: 'edits.dataTable.getDataHint',
    icon: 'i-lucide-download',
  },
  createData: {
    labelKey: 'edits.dataTable.createData',
    hintKey: 'edits.dataTable.createDataHint',
    icon: 'i-lucide-plus',
  },
  updateData: {
    labelKey: 'edits.dataTable.updateData',
    hintKey: 'edits.dataTable.updateDataHint',
    icon: 'i-lucide-pencil',
  },
  deleteData: {
    labelKey: 'edits.dataTable.deleteData',
    hintKey: 'edits.dataTable.deleteDataHint',
    icon: 'i-lucide-trash-2',
  },
}

const codeKeys = Object.keys(codeMeta) as CodeFieldKey[]

const codeOpen = ref(false)
const codeDraft = ref('')
const activeCodeKey = ref<CodeFieldKey>('getData')

const codeLabel = computed(() => t(codeMeta[activeCodeKey.value].labelKey))
const codeHint = computed(() => t(codeMeta[activeCodeKey.value].hintKey))

function openCode(key: CodeFieldKey) {
  activeCodeKey.value = key
  codeDraft.value = codeFields[key].value
  codeOpen.value = true
}

function saveCode() {
  codeFields[activeCodeKey.value].value = codeDraft.value
  codeOpen.value = false
}

// ─── 数据来源：固定数据直接编辑，远程模式仅编写代码 ───────────────────────────────
const dataCount = computed(() => (data.value ?? []).length)
const gridOpen = ref(false)

function saveGrid(rows: Record<string, unknown>[]) {
  data.value = rows.length ? rows : null
}

// 搜索区条件数：表格容器的 children（搜索字段）数量，画布上拖入 / 增删
const searchFieldsCount = computed(() => {
  const children = (selectedField.value as { children?: unknown[] } | undefined)?.children
  return Array.isArray(children) ? children.length : 0
})
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <LabelHelpSection />

  <div class="mt-4 mb-2 pt-3 border-t border-border/50 text-xs font-semibold text-foreground">
    {{ t('edits.dataTable.basicGroup') }}
  </div>
  <TextInput
    :label="t('edits.dataTable.rowKey')"
    :placeholder="t('edits.dataTable.rowKeyPlaceholder')"
    :value="rowKey"
    @update:value="(v) => (rowKey = v)"
  />
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">
      {{ t('edits.dataTable.size') }}
    </label>
    <n-radio-group
      :value="tableSize"
      size="small"
      class="w-full flex"
      @update:value="(v: string) => (tableSize = v)"
    >
      <n-radio-button value="small" class="flex-1 text-center">small</n-radio-button>
      <n-radio-button value="medium" class="flex-1 text-center">medium</n-radio-button>
      <n-radio-button value="large" class="flex-1 text-center">large</n-radio-button>
    </n-radio-group>
  </EditsLayout>
  <SwitchInput
    :label="t('edits.dataTable.bordered')"
    :value="bordered"
    @update:value="(v) => (bordered = v)"
  />
  <NumberInput
    :label="t('edits.dataTable.scrollX')"
    :placeholder="t('edits.dataTable.scrollXPlaceholder')"
    :value="scrollX"
    @update:value="(v: number | null) => (scrollX = v)"
  />
  <NumberInput
    :label="t('edits.dataTable.modalWidth')"
    :placeholder="t('edits.dataTable.modalWidthPlaceholder')"
    :value="modalWidth"
    @update:value="(v: number | null) => (modalWidth = v)"
  />

  <div class="mt-4 mb-2 pt-3 border-t border-border/50 text-xs font-semibold text-foreground">
    {{ t('edits.dataTable.columnsGroup') }}
  </div>
  <DataTableColumnList
    :columns="columnsList"
    :selected-index="selectedColumnIndex"
    @update:columns="updateColumns"
    @select="selectColumn"
  />

  <div class="mt-4 mb-2 pt-3 border-t border-border/50 text-xs font-semibold text-foreground">
    {{ t('edits.dataTable.sourceGroup') }}
  </div>
  <EditsLayout>
    <n-radio-group
      :value="remote ? 'remote' : 'fixed'"
      size="small"
      class="w-full flex"
      @update:value="(v: string) => (remote = v === 'remote')"
    >
      <n-radio-button value="fixed" class="flex-1 text-center">
        {{ t('edits.dataTable.sourceFixed') }}
      </n-radio-button>
      <n-radio-button value="remote" class="flex-1 text-center">
        {{ t('edits.dataTable.sourceRemote') }}
      </n-radio-button>
    </n-radio-group>
  </EditsLayout>

  <template v-if="!remote">
    <div class="flex items-center justify-between py-1">
      <span class="text-xs text-muted-foreground">
        {{ t('edits.dataTable.dataCount', { count: dataCount }) }}
      </span>
      <n-button size="small" @click="gridOpen = true">
        <template #icon><span class="i-lucide-table h-3.5 w-3.5"></span></template>
        {{ t('edits.dataTable.editData') }}
      </n-button>
    </div>
    <DataTableDataGridModal
      v-model:show="gridOpen"
      :columns="columnsList"
      :data="data ?? []"
      :row-key="rowKey"
      @save="saveGrid"
    />
  </template>
  <template v-else>
    <div v-for="key in codeKeys" :key="key" class="flex items-center justify-between py-1 gap-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <span :class="`${codeMeta[key].icon} h-3.5 w-3.5 text-muted-foreground shrink-0`"></span>
        <span class="text-xs text-foreground/80 truncate">{{ t(codeMeta[key].labelKey) }}</span>
        <span
          class="text-[10px] px-1 py-0.5 rounded shrink-0"
          :class="
            codeFields[key].value
              ? 'text-green-600 bg-green-600/10'
              : 'text-muted-foreground bg-muted/40'
          "
        >
          {{
            codeFields[key].value
              ? t('edits.dataTable.codeConfigured')
              : t('edits.dataTable.codeUnconfigured')
          }}
        </span>
      </div>
      <n-button text type="primary" size="tiny" @click="openCode(key)">
        <template #icon><span class="i-lucide-square-pen h-3.5 w-3.5"></span></template>
      </n-button>
    </div>
  </template>

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
        :quick-vars="['form', '$form', 'extra', 'axios']"
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

  <div class="mt-4 mb-2 pt-3 border-t border-border/50 text-xs font-semibold text-foreground">
    {{ t('edits.dataTable.operationsGroup') }}
  </div>
  <div
    v-for="op in allowSwitchOptions"
    :key="op.key"
    class="flex items-center justify-between py-1"
  >
    <label class="text-xs text-foreground/80 font-medium">{{ t(op.labelKey) }}</label>
    <n-switch
      size="small"
      :value="allowValue(op.key)"
      @update:value="(v: boolean) => setAllow(op.key, v)"
    />
  </div>

  <div class="mt-4 mb-2 pt-3 border-t border-border/50 text-xs font-semibold text-foreground">
    {{ t('edits.dataTable.paginationGroup') }}
  </div>
  <SwitchInput
    :label="t('edits.dataTable.pagination')"
    :value="pagination"
    @update:value="(v) => (pagination = v)"
  />
  <NumberInput
    v-if="pagination"
    :label="t('edits.dataTable.pageSize')"
    :placeholder="'10'"
    :value="pageSize"
    @update:value="(v: number | null) => (pageSize = v ?? 10)"
  />

  <div class="mt-4 mb-2 pt-3 border-t border-border/50 text-xs font-semibold text-foreground">
    {{ t('edits.dataTable.searchGroup') }}
  </div>
  <SwitchInput
    :label="t('edits.dataTable.searchExpandable')"
    :value="searchExpandable"
    @update:value="(v) => (searchExpandable = v)"
  />
  <div class="text-[11px] text-muted-foreground">
    {{ t('edits.dataTable.searchFieldsHint', { count: searchFieldsCount }) }}
  </div>

  <n-collapse class="mt-4">
    <n-collapse-item name="advanced">
      <template #header>
        <span class="text-[11px] font-medium text-foreground/80">
          {{ t('edits.dataTable.advancedGroup') }}
        </span>
      </template>
      <template #arrow="{ collapsed }">
        <span
          :class="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
          class="h-3 w-3 text-muted-foreground/70 transition-[transform] duration-150"
        ></span>
      </template>
      <div class="space-y-2 pt-1">
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
      </div>
    </n-collapse-item>
  </n-collapse>
</template>
