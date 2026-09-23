import type { ComputedRef } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { ParentConfig } from '@formkit/drag-and-drop'

/**
 * 画布实例的 DnD 上下文。挂在每个 drop-zone parent 的 config 上（见 plugin.ts setup）：
 * 拖放提交走 source 的 handleEnd（可能来自调色板，不属于任何画布），
 * 因此提交/预览必须在运行时从"指针命中的目标 parent"读取所属画布的上下文。
 */
export interface DndContext {
  /** 所属画布实例的 schema 投影（用于 name 去重 / 精确插入定位） */
  formSchema: ComputedRef<FormKitSchemaFormKit[]>
  /** 所属画布实例的 schema 提交漏斗 */
  commitSchemaReconcile: (
    nextSchema: FormKitSchemaFormKit[],
    opts?: { reason?: string; merge?: boolean },
  ) => void
  /** H8：拖入步骤条时把根画布已有内容整体收纳进第一步——这是有意设计，但用户
   *  容易以为内容丢了，commit.ts 在真的发生这次收纳时调用它弹一条提示。
   *  可选：commit.ts 内部工具函数测试等场景不需要提供。 */
  notifyStepsConsolidate?: () => void
  /** L：翻译函数——plugin.ts / commit.ts 等运行在 Vue 组件之外的低层 DnD 逻辑，
   *  借这里透传出去的 t() 格式化插入徽标 / 容器标签 / 拒绝原因文案，不用在
   *  utils/dnd 里重新实现一遍 i18n 查找（也不必关心多设计器实例各自的语言）。
   *  可选：commit.ts 内部工具函数测试等场景不需要提供，缺省时相关文案退化为不显示。 */
  t?: (key: string, params?: Record<string, string | number>) => string
  /** L6：面板拖入的新元素提交后自动选中，右侧属性面板随之显示它 */
  selectByKey?: (key: string) => void
  /** L2：拖拽悬停在本容器上时，左上角标签显示的名称（容器自身标题或类型名）；
   *  不提供则不显示标签（根画布就是这种情况——落点已经很明确，不需要额外提示）。 */
  containerLabel?: () => string
  /** L3：本容器的 accepts 已经拒绝了当前被拖节点时，给出具体原因一句话；
   *  不提供或返回空则只显示通用的「不能放在这里」，不附带原因行。 */
  describeRejection?: () => string | undefined
}

/** customInsertPlugin 在 parent.config 上额外挂的字段：@formkit/drag-and-drop 自己的
 *  ParentConfig 类型不包含 dndContext（应用私有扩展，见 utils/dnd/plugin.ts 的
 *  customInsertPlugin），读取处按这个扩展接口断言，替代裸的 as any。 */
export interface DndParentConfig<T> extends ParentConfig<T> {
  dndContext?: DndContext
}

/** 从任意元素向上找到所属画布根 drop-area（testid 以 drop-area 开头）。 */
export function findRootDropAreaEl(el: HTMLElement | null | undefined): HTMLElement | null {
  let cur: HTMLElement | null = el ?? null
  while (cur && cur !== document.body) {
    const testid = cur.getAttribute('data-testid')
    if (testid && testid.startsWith('drop-area')) return cur
    cur = cur.parentElement
  }
  return null
}

/** 判断元素是否为根 drop-area（用于 plugin setup 里识别根、注册 formSchema 同步）。 */
export function isRootDropArea(el: HTMLElement | null | undefined): boolean {
  const testid = el?.getAttribute('data-testid')
  return !!testid && testid.startsWith('drop-area')
}
