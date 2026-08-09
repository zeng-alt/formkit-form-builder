import type { ElementDefinition } from '../types'
import { getContainerSpec } from '../container-spec'

// 纯数据目录：不 import 任何 .vue。容器画布/预览组件绑定在 elements/canvas.ts（按 type 索引）。
// list/inputGroup 归类 container（数据结构），card/tabs 归类 layout（纯布局）。
// 画布组件需要的 listKey/cardKey/modelValue 等内部键由 canvas normalize / toSchema 生成，不入模板。
// container 字段（数据结构规格：dataShape + keyProp + primitive）是容器行为统一驱动源，
// 见 src/elements/container-spec.ts；convert-common / canvas / dnd/commit 据此而非按 kind 硬编码。

export const containerElements: ElementDefinition[] = [
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
      props: { showActions: false },
      descriptionKey: 'elements.list.description',
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
