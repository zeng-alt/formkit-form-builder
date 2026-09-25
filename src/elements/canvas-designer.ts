// ═══ 设计器专属：画布容器组件绑定 ════════════════════════════════════════════════
// 只应被 builder/containers/index.ts（画布 schema 库的唯一取用点）引入。这十个容器
// 组件经 use-container-drag-and-drop.ts 依赖 @formkit/drag-and-drop（画布拖拽），
// 渲染入口不需要画布交互——不能让它们经由 elements/canvas.ts 的静态 import 混进渲染
// 入口的产物，所以单独拆到这个文件，与 canvas.ts 里"预览版"组件的静态 import 分开。
import ListContainer from '@/components/ui/containers/list/ListContainer.vue'
import CardContainer from '@/components/ui/containers/card/CardContainer.vue'
import InputGroupContainer from '@/components/ui/containers/input-group/InputGroupContainer.vue'
import ButtonGroupContainer from '@/components/ui/containers/button-group/ButtonGroupContainer.vue'
import BadgeContainer from '@/components/ui/containers/badge/BadgeContainer.vue'
import TabsContainer from '@/components/ui/containers/tabs/TabsContainer.vue'
import StepsContainer from '@/components/ui/containers/steps/StepsContainer.vue'
import GroupContainer from '@/components/ui/containers/group/GroupContainer.vue'
import DataTableContainer from '@/components/ui/containers/data-table/DataTableContainer.vue'
import CollapseContainer from '@/components/ui/containers/collapse/CollapseContainer.vue'
import { registerCanvasContainerComponents } from './canvas'

registerCanvasContainerComponents({
  list: ListContainer,
  card: CardContainer,
  inputGroup: InputGroupContainer,
  buttonGroup: ButtonGroupContainer,
  badge: BadgeContainer,
  tabs: TabsContainer,
  steps: StepsContainer,
  group: GroupContainer,
  dataTable: DataTableContainer,
  collapse: CollapseContainer,
})
