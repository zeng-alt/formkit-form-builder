import type { ElementDefinition } from '../types'

// 纯数据目录：不 import 任何 .vue。容器画布/预览组件绑定在 elements/canvas.ts（按 type 索引）。
// list/inputGroup 归类 container（数据结构），card/tabs 归类 layout（纯布局）。
// 画布组件需要的 listKey/cardKey/modelValue 等内部键由 canvas normalize / toSchema 生成，不入模板。

export const containerElements: ElementDefinition[] = [
  {
    type: 'list',
    category: 'container',
    icon: 'i-lucide-list-tree',
    tooltipKey: 'fieldProps.tooltip.list',
    editor: () => import('@/components/sidebar-right/edits/editors/GroupEditor.vue'),
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
    type: 'card',
    category: 'layout',
    icon: 'i-lucide-credit-card',
    tooltipKey: 'fieldProps.tooltip.card',
    editor: () => import('@/components/sidebar-right/edits/editors/CardEditor.vue'),
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
    type: 'tabs',
    category: 'layout',
    icon: 'i-lucide-panel-top',
    tooltipKey: 'fieldProps.tooltip.tabs',
    editor: () => import('@/components/sidebar-right/edits/editors/TabsEditor.vue'),
    schema: {
      renderAs: 'cmp',
      nameKey: 'elements.tabs.name',
      labelKey: 'elements.tabs.label',
      outerClass: 'col-span-12',
      props: {},
      descriptionKey: 'elements.tabs.description',
    },
  },
]
