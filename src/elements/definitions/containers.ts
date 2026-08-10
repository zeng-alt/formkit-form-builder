import type { ElementDefinition } from '../types'
import { getContainerSpec } from '../container-spec'
import type { FormNode } from '../../types/dsl'
import { generateKey } from '../../utils/dnd/schema'

// 纯数据目录：不 import 任何 .vue。容器画布/预览组件绑定在 elements/canvas.ts（按 type 索引）。
// list/inputGroup 归类 container（数据结构），card/tabs 归类 layout（纯布局）。
// 画布组件需要的 listKey/cardKey/modelValue 等内部键由 canvas normalize / toSchema 生成，不入模板。
// container 字段（数据结构规格：dataShape + keyProp + primitive）是容器行为统一驱动源，
// 见 src/elements/container-spec.ts；convert-common / canvas / dnd/commit 据此而非按 kind 硬编码。

// nestedList 预置的内部 group（DSL 形态）：无 name，列表项数据保持扁平（[{...}]），
// 画布/预览与 list 共用同一套容器组件，group 可选中后删除。
const innerGroupTemplate = (): FormNode => ({
  id: generateKey(),
  key: generateKey(),
  category: 'container',
  type: 'group',
  renderAs: 'formkit',
  dataType: 'object',
  children: [],
})
export const containerElements: ElementDefinition[] = [
  {
    // group 与 FormKit 原生 $formkit: 'group' 等价：拖入后产出嵌套 object 数据。
    // primitive group → renderAs:'formkit'（原生 $formkit），画布/预览绑定见 elements/canvas.ts
    type: 'group',
    category: 'container',
    icon: 'i-lucide-group',
    tooltipKey: 'fieldProps.tooltip.group',
    editor: () => import('@/components/sidebar-right/edits/editors/GroupEditor.vue'),
    container: getContainerSpec('group') ?? undefined,
    schema: {
      renderAs: 'formkit',
      nameKey: 'elements.group.name',
      outerClass: 'col-span-12',
      props: {},
      descriptionKey: 'elements.group.description',
    },
  },
  {
    type: 'list',
    category: 'container',
    icon: 'i-lucide-list-tree',
    tooltipKey: 'fieldProps.tooltip.list',
    editor: () => import('@/components/sidebar-right/edits/editors/ListEditor.vue'),
    container: getContainerSpec('list') ?? undefined,
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.list.name',
      labelKey: 'elements.list.label',
      outerClass: 'col-span-12',
      props: { showActions: false, bordered: true },
      descriptionKey: 'elements.list.description',
    },
  },
  {
    // 便捷预置项：nestedList 本质就是 list（同一 type / $cmp），仅比 list 多"拖入即预置
    // 一个内部 group"，用户无需手动拖 group 进列表。presetOf:'list' 让新建节点类型即 list，
    // 本目录项仅用于左侧面板展示（icon / 名称 / 描述）。
    type: 'nestedList',
    category: 'container',
    icon: 'i-lucide-list-plus',
    tooltipKey: 'fieldProps.tooltip.nestedList',
    schema: {
      renderAs: 'cmp',
      presetOf: 'list',
      nameKey: 'elements.nestedList.name',
      labelKey: 'elements.nestedList.label',
      outerClass: 'col-span-12',
      props: { showActions: false, bordered: true },
      descriptionKey: 'elements.nestedList.description',
      // 拖入即预置一个内部 group（输入框形态）：字段拖进 group，列表项产出 [{...}]；
      // group 的 name 不写死，拖入时与普通元素一样由 normalizeInsertValues 生成唯一名
      defaultChildren: () => [innerGroupTemplate()],
    },
  },
  {
    type: 'inputGroup',
    category: 'container',
    icon: 'i-lucide-align-horizontal-justify-start',
    tooltipKey: 'fieldProps.tooltip.inputGroup',
    editor: () => import('@/components/sidebar-right/edits/editors/InputGroupEditor.vue'),
    container: getContainerSpec('inputGroup') ?? undefined,
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.inputGroup.name',
      labelKey: 'elements.inputGroup.label',
      outerClass: 'col-span-12',
      props: {},
      descriptionKey: 'elements.inputGroup.description',
    },
  },
  {
    type: 'buttonGroup',
    category: 'container',
    icon: 'i-lucide-rectangle-horizontal',
    tooltipKey: 'fieldProps.tooltip.buttonGroup',
    editor: () => import('@/components/sidebar-right/edits/editors/ButtonGroupEditor.vue'),
    container: getContainerSpec('buttonGroup') ?? undefined,
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.buttonGroup.name',
      outerClass: 'col-span-12',
      props: {
        size: 'medium',
        vertical: false,
        disabled: false,
      },
      descriptionKey: 'elements.buttonGroup.description',
    },
  },
  {
    type: 'card',
    category: 'layout',
    icon: 'i-lucide-credit-card',
    tooltipKey: 'fieldProps.tooltip.card',
    editor: () => import('@/components/sidebar-right/edits/editors/CardEditor.vue'),
    container: getContainerSpec('card') ?? undefined,
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.card.name',
      labelKey: 'elements.card.label',
      outerClass: 'col-span-12',
      props: {
        size: 'medium',
        bordered: true,
        embedded: false,
        hoverable: false,
      },
      descriptionKey: 'elements.card.description',
    },
  },
  {
    type: 'badge',
    category: 'container',
    icon: 'i-lucide-badge',
    tooltipKey: 'fieldProps.tooltip.badge',
    editor: () => import('@/components/sidebar-right/edits/editors/BadgeEditor.vue'),
    container: getContainerSpec('badge') ?? undefined,
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.badge.name',
      outerClass: 'col-span-12',
      props: {
        value: 0,
        max: 99,
        dot: false,
        show: true,
        showZero: false,
        processing: false,
        type: 'error',
      },
      descriptionKey: 'elements.badge.description',
    },
  },
  {
    type: 'tabs',
    category: 'layout',
    icon: 'i-lucide-panel-top',
    tooltipKey: 'fieldProps.tooltip.tabs',
    editor: () => import('@/components/sidebar-right/edits/editors/TabsEditor.vue'),
    container: getContainerSpec('tabs') ?? undefined,
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.tabs.name',
      labelKey: 'elements.tabs.label',
      outerClass: 'col-span-12',
      props: {},
      descriptionKey: 'elements.tabs.description',
    },
  },
  {
    type: 'dataTable',
    category: 'container',
    icon: 'i-lucide-table-2',
    tooltipKey: 'fieldProps.tooltip.dataTable',
    editor: () => import('@/components/sidebar-right/edits/editors/DataTableEditor.vue'),
    container: getContainerSpec('dataTable') ?? undefined,
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.dataTable.name',
      labelKey: 'elements.dataTable.label',
      outerClass: 'col-span-12',
      props: {
        rowKey: 'id',
        bordered: true,
        size: 'medium',
        pagination: false,
        remote: false,
        pageSize: 10,
      },
      descriptionKey: 'elements.dataTable.description',
    },
  },
]
