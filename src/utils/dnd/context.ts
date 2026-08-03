import type { ComputedRef } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'

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
}

/** 从任意元素向上找到所属画布根 drop-area（testid 以 drop-area 开头）。 */
export function findRootDropAreaEl(
  el: HTMLElement | null | undefined,
): HTMLElement | null {
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
