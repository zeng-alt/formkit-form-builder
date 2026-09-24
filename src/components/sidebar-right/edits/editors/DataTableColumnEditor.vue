<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NButton, NRadioButton, NRadioGroup } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import { getElementDefinition, getElementDefinitions, getFieldEditorComponent } from '@/elements'
import { getElementTypeDef } from '@/dsl'
import { uniqueColumnKey } from '@/components/ui/containers/data-table/column-factory'
import type { FieldNode } from '@/types/dsl'
import type { DataTableColumn } from '@/components/ui/containers/data-table/types'
import TextInput from '../common/TextInput.vue'
import NumberInput from '../common/NumberInput.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import JsonTextarea from '../common/JsonTextarea.vue'
import NameInput from '../common/NameInput.vue'
import ExpressionEditor from '../ExpressionEditor.vue'
import IfConditionEditor from '../IfConditionEditor.vue'
import ValidationSection from '../../validations/ValidationSection.vue'

// 数据表格列编辑器：编辑选中列（props.columns 中的一项）。
// 列非树节点，经 useFormField 的 selectedColumn / setColumnProp 读写所属表格节点；
// 「元素属性」模式复用该字段类型自身的编辑器（setElementEditTarget 覆盖编辑目标）。
const { t } = useFormBuilderI18n()
const {
  selectedColumn,
  selectedTableField,
  selectedColumnIndex,
  createColumnProp,
  setColumnProp,
  setElementEditTarget,
} = useFormField()

// 顶部导航：返回表格 / 上一列 / 下一列（首末列禁用）
const columnCount = computed(() => {
  const cols = selectedTableField.value?.props?.columns
  return Array.isArray(cols) ? cols.length : 0
})
const columnIndex = computed(() => selectedColumn.value?.index ?? 0)

function backToTable() {
  selectedColumnIndex.value = null
}
function goPrevColumn() {
  if (columnIndex.value > 0) selectedColumnIndex.value = columnIndex.value - 1
}
function goNextColumn() {
  if (columnIndex.value < columnCount.value - 1) selectedColumnIndex.value = columnIndex.value + 1
}

const colKey = createColumnProp<string>('key', '')
const colTitle = createColumnProp<string>('title', '')
const colWidth = createColumnProp<number | null>('width', null)
const colAlign = createColumnProp<string>('align', 'left')
const colEllipsis = createColumnProp<boolean>('ellipsis', false)
const colSortable = createColumnProp<boolean>('sortable', false)
const colRender = createColumnProp<string>('render', '')
const colColspan = createColumnProp<number | null>('colspan', null)

// 单元格渲染：引用字段元素类型，空 = 纯文本
const renderOptions = computed(() => [
  { label: t('edits.dataTable.columnRenderPlaceholder'), value: '' },
  ...getElementDefinitions()
    .filter((d) => d.category === 'field')
    .map((d) => ({ label: t(d.tooltipKey ?? ''), value: d.type })),
])

const alignOptions = computed(() => [
  { label: 'left', value: 'left' },
  { label: 'center', value: 'center' },
  { label: 'right', value: 'right' },
])

// colspan：空 = 整行，其余 1-12；下拉框以字符串承载，空串映射为 null
const colspanOptions = computed(() => [
  { label: t('edits.dataTable.columnColspanFull'), value: '' },
  ...Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) })),
])

const colColspanSelect = computed<string>({
  get: () => (colColspan.value == null ? '' : String(colColspan.value)),
  set: (v: string) => {
    colColspan.value = v ? Number(v) : null
  },
})

// 手改字段名（key）时去重：与所属表格其余列 key 冲突就自动加后缀，避免两列同名
// 导致数据行读取/写入互相覆盖（uniqueColumnKey 同新增/复制列共用同一去重规则）
function setColumnKey(v: string) {
  const trimmed = v.trim()
  if (!trimmed) {
    colKey.value = v
    return
  }
  const cols = selectedTableField.value?.props?.columns
  const existing = Array.isArray(cols)
    ? (cols as DataTableColumn[])
        .filter((_, i) => i !== selectedColumn.value?.index)
        .map((c) => c.key)
    : []
  colKey.value = uniqueColumnKey(trimmed, existing)
}

// ─── 来源元素：新增列时保存的字段元素 DSL 节点，编辑面板展示其信息（同新增列弹窗）───
const columnElement = computed(() => selectedColumn.value?.column?.element)
const elementType = computed(() => {
  const el = columnElement.value
  return el?.type ?? colRender.value ?? ''
})
const elementDef = computed(() => getElementDefinition(elementType.value))
const elementInfoLabel = computed(() => {
  const el = columnElement.value
  if (typeof el?.label === 'string' && el.label.trim()) return el.label
  return elementDef.value?.tooltipKey ? t(elementDef.value.tooltipKey) : elementType.value || ''
})
const elementIcon = computed(() => elementDef.value?.icon ?? '')

// 编辑模式：'column'（列属性）| 'element'（来源元素属性）
const editMode = ref<'column' | 'element'>('column')

// 元素属性编辑器：复用该字段类型自身的编辑器组件
const elementEditorComponent = computed(() =>
  editMode.value === 'element' ? getFieldEditorComponent(elementType.value) : null,
)

// 列元素必为字段类（新增列时仅字段可渲染单元格），表达式值面板与普通字段编辑一致
const isElementField = computed(
  () => elementDef.value?.category === 'field' && !!columnElement.value,
)

// 编辑目标：列元素就是 DSL 节点，只要当前列有 element 就设为编辑目标（列属性 / 元素属性
// 两种模式都设置，不只是「元素属性」模式）——底部 ValidationSection 读写 selectedField，
// 靠这个目标才能落到 columns[i].element.validation；列属性的读写走 createColumnProp/
// setColumnProp，基于 selectedTableField，不受这个目标影响，两者互不干扰。
// 依赖列元素本身（而非 editMode）：切换单元格渲染类型（changeRender）会替换 element，
// 这里跟着重新指向新元素，避免残留旧目标。
watch(
  () => selectedColumn.value?.column?.element,
  (el) => {
    if (!el) {
      setElementEditTarget(null)
      return
    }
    setElementEditTarget(el, (node) => setColumnProp('element', node))
  },
  { immediate: true },
)

onBeforeUnmount(() => setElementEditTarget(null))

// 切换单元格渲染类型时同步来源元素（name/label 沿用列 key/title）
function changeRender(type: string) {
  colRender.value = type
  const typeDef = type ? getElementTypeDef(type) : undefined
  setColumnProp(
    'element',
    typeDef
      ? ({
          ...typeDef.defaults(),
          name: colKey.value,
          label: colTitle.value,
        } as FieldNode)
      : undefined,
  )
}

// renderProps 是对象，编辑器用 JSON 文本承载
const colRenderPropsJSON = computed<string>({
  get: () => {
    const raw = selectedColumn.value?.column?.renderProps
    if (!raw || (typeof raw === 'object' && Object.keys(raw).length === 0)) return ''
    return JSON.stringify(raw, null, 2)
  },
  set: (s: string) => {
    const next = s.trim()
    if (!next) {
      setColumnProp('renderProps', undefined)
      return
    }
    try {
      setColumnProp('renderProps', JSON.parse(next))
    } catch {
      // 非法 JSON 不写入，保持原值
    }
  },
})
</script>

<template>
  <!-- 顶部导航：返回表格 / 列标题 / 上一列-下一列 -->
  <div class="flex items-center justify-between gap-2 mb-2">
    <button
      type="button"
      data-testid="dt-column-editor-back"
      class="flex items-center gap-1 shrink-0 text-xs text-muted-foreground hover:text-[#a277ff] border-0 bg-transparent p-0 cursor-pointer"
      @click="backToTable"
    >
      <span class="i-lucide-arrow-left h-3.5 w-3.5"></span>
      {{ t('edits.dataTable.columnEditorBack') }}
    </button>
    <span class="flex-1 min-w-0 truncate text-center text-xs font-medium">
      {{ t('edits.dataTable.columnEditorTitle', { title: colTitle || colKey || '' }) }}
    </span>
    <div class="flex items-center gap-1 shrink-0">
      <n-button
        quaternary
        circle
        size="tiny"
        data-testid="dt-column-editor-prev"
        :disabled="columnIndex <= 0"
        :aria-label="t('edits.dataTable.columnEditorPrev')"
        @click="goPrevColumn"
      >
        <template #icon><span class="i-lucide-chevron-left h-3.5 w-3.5"></span></template>
      </n-button>
      <span class="text-[11px] text-muted-foreground tabular-nums">
        {{
          t('edits.dataTable.columnEditorIndex', { current: columnIndex + 1, total: columnCount })
        }}
      </span>
      <n-button
        quaternary
        circle
        size="tiny"
        data-testid="dt-column-editor-next"
        :disabled="columnIndex >= columnCount - 1"
        :aria-label="t('edits.dataTable.columnEditorNext')"
        @click="goNextColumn"
      >
        <template #icon><span class="i-lucide-chevron-right h-3.5 w-3.5"></span></template>
      </n-button>
    </div>
  </div>

  <!-- 列 / 元素 属性模式切换 -->
  <n-radio-group v-model:value="editMode" size="small" class="w-full">
    <n-radio-button value="column" class="w-1/2">
      <span class="w-full text-center">
        {{ t('edits.dataTable.columnTab') }}
      </span>
    </n-radio-button>
    <n-radio-button value="element" class="w-1/2">
      <span class="w-full text-center">
        {{ t('edits.dataTable.elementTab') }}
      </span>
    </n-radio-button>
  </n-radio-group>

  <!-- 来源元素信息（新增列时保存的字段元素） -->
  <div class="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-2 py-1.5">
    <span class="text-[11px] font-medium text-muted-foreground shrink-0">
      {{ t('edits.dataTable.columnElement') }}
    </span>
    <span :class="`${elementIcon} h-3.5 w-3.5 text-muted-foreground shrink-0`"></span>
    <span class="text-xs font-medium truncate min-w-0">{{ elementInfoLabel }}</span>
    <span class="text-[10px] text-muted-foreground truncate shrink-0">{{ elementType }}</span>
  </div>

  <!-- 元素属性：复用该字段类型自身的编辑器 -->
  <template v-if="editMode === 'element'">
    <div
      v-if="!columnElement"
      class="rounded-md border border-dashed border-border/60 px-2 py-2 text-[11px] text-muted-foreground"
    >
      {{ t('edits.dataTable.elementNone') }}
    </div>
    <template v-else>
      <NameInput />
      <component :is="elementEditorComponent" v-if="elementEditorComponent" />
      <ExpressionEditor v-if="isElementField" />
      <IfConditionEditor />
    </template>
  </template>

  <!-- 列属性 -->
  <template v-else>
    <TextInput
      :label="t('edits.dataTable.columnKey')"
      :placeholder="t('edits.dataTable.columnKeyPlaceholder')"
      :value="colKey"
      @update:value="setColumnKey"
    />

    <TextInput
      :label="t('edits.dataTable.columnTitle')"
      :placeholder="t('edits.dataTable.columnTitlePlaceholder')"
      :value="colTitle"
      @update:value="(v) => (colTitle = v)"
    />

    <NumberInput
      :label="t('edits.dataTable.columnWidth')"
      :placeholder="t('edits.dataTable.columnWidthPlaceholder')"
      :value="colWidth"
      @update:value="(v) => (colWidth = v)"
    />

    <SelectInput
      :label="t('edits.dataTable.columnColspan')"
      :value="colColspanSelect"
      :options="colspanOptions"
      @update:value="(v) => (colColspanSelect = v)"
    />

    <SelectInput
      :label="t('edits.dataTable.columnAlign')"
      :value="colAlign"
      :options="alignOptions"
      @update:value="(v) => (colAlign = v)"
    />

    <SwitchInput
      :label="t('edits.dataTable.columnEllipsis')"
      :value="colEllipsis"
      @update:value="(v) => (colEllipsis = v)"
    />

    <SwitchInput
      :label="t('edits.dataTable.columnSortable')"
      :value="colSortable"
      @update:value="(v) => (colSortable = v)"
    />

    <SelectInput
      :label="t('edits.dataTable.columnRender')"
      :value="colRender"
      :options="renderOptions"
      @update:value="(v) => changeRender(v)"
    />

    <JsonTextarea
      :label="t('edits.dataTable.columnRenderProps')"
      :placeholder="t('edits.dataTable.columnRenderPropsPlaceholder')"
      :value="colRenderPropsJSON"
      @update:value="(v) => (colRenderPropsJSON = v)"
    />
  </template>

  <!-- 校验规则：两种模式都显示（复用编辑目标，落到 columns[i].element.validation），
       列没有来源元素时不显示 -->
  <ValidationSection v-if="columnElement" />
</template>
