// ═══ L6：放下后的高亮闪烁 ════════════════════════════════════════════════════
// 记录"刚被放下/移动"的节点 __key → 一个自增计数器；CanvasGridItem 按自己的
// itemKey 读这张表当 dropFlash prop，计数变化时重新挂载一个纯装饰的覆盖层重放
// 一次 canvas-item-select-pop 动画（和选中态复用同一套关键帧，但不占用 selected
// 本身的状态——移动一个未选中的元素、或移动一个已选中但选中态本身没变化的元素，
// 都需要能重新触发一次这个视觉反馈）。
// 用 reactive 而不是普通 Map：CanvasGridItem 直接读某个 key 的值当 prop，
// 需要 Vue 能追踪到这张表某个 key 的写入。
import { reactive } from 'vue'

export const dropFlashState: Record<string, number> = reactive({})

/** 提交完成后调用：把这批节点的 key 各自的计数 +1，触发它们各自的一次闪烁 */
export function triggerDropFlash(keys: Array<string | undefined | null>) {
  for (const key of keys) {
    if (typeof key !== 'string' || !key) continue
    dropFlashState[key] = (dropFlashState[key] ?? 0) + 1
  }
}
