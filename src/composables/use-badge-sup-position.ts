import { nextTick, onScopeDispose, ref, watch, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'

// 徽标角标定位：n-badge 默认把角标放在自身（整行）右上角，而徽标容器是 12 列网格、
// 子元素只占自己的 col-span 宽度。这里计算唯一子元素的右边缘相对徽标根的位置，
// 通过 --badge-sup-left 把角标 left 对齐到子元素右上角（而非容器外沿）。

// 沿 offsetParent 链累加 offsetLeft，得到 el 相对 ancestor 的布局左偏移。
// offsetLeft/offsetWidth 返回布局值，不受 CSS transform 影响 —— modal 的 fade-in-scale
// 入场动画期间 getBoundingClientRect 会返回缩放后的视觉值，而布局坐标始终准确。
function layoutLeftRelativeTo(el: HTMLElement, ancestor: HTMLElement): number | null {
  let node: HTMLElement | null = el
  let left = 0
  while (node && node !== ancestor) {
    left += node.offsetLeft
    node = node.offsetParent as HTMLElement | null
  }
  return node === ancestor ? left : null
}

export function useBadgeSupPosition(opts: {
  /** 徽标根元素（n-badge 外层的宽度参考容器） */
  badgeRef: Ref<HTMLElement | null>
  /** 从 badge 根内查找角标要挂靠的元素（画布 li / 预览 formkit-outer） */
  childSelector: string
  /** 是否启用测量（无子元素时角标不显示） */
  enabled: Ref<boolean>
  /** 子元素内容变化时触发重测（items 深度变化） */
  refreshTrigger?: Ref<unknown>
}) {
  const supLeft = ref<string | undefined>(undefined)
  const childRef = ref<HTMLElement | null>(null)

  const measure = () => {
    const badge = opts.badgeRef.value
    if (!badge || !opts.enabled.value) {
      supLeft.value = undefined
      return
    }
    // 每次重新查询，避免 FormKit 重建字段后 childRef 指向已卸载的旧节点
    const child = badge.querySelector<HTMLElement>(opts.childSelector)
    if (!child) {
      childRef.value = null
      supLeft.value = undefined
      return
    }
    if (childRef.value !== child) childRef.value = child

    let left: number
    const layoutLeft = layoutLeftRelativeTo(child, badge)
    if (layoutLeft !== null) {
      // 布局坐标：transform 无关，modal 缩放动画中也能测准
      left = layoutLeft + child.offsetWidth
    } else {
      // 兜底：视觉坐标（transform 动画中短暂不准，随后由重测修正）
      const badgeRect = badge.getBoundingClientRect()
      const childRect = child.getBoundingClientRect()
      left = childRect.right - badgeRect.left
    }
    supLeft.value = Number.isFinite(left) && left > 0 ? `${left}px` : undefined
  }

  const refresh = () => nextTick(measure)

  // 徽标 / 子元素尺寸变化（窗口缩放、col-span 调整、子元素增删）时重新测量
  useResizeObserver(opts.badgeRef, measure)
  useResizeObserver(childRef, measure)

  // 弹窗入场动画期间布局可能在多个帧后才稳定（transform 不触发 ResizeObserver），
  // 启用后跑一段有界 rAF 重测：连续几帧取值一致即认为稳定（或到 2s 上限）。
  let rafHandle = 0
  const stopBurst = () => cancelAnimationFrame(rafHandle)
  const startBurst = () => {
    stopBurst()
    let frame = 0
    let stable = 0
    let last: string | undefined
    const loop = () => {
      if (stable >= 5 || frame++ > 120) return
      measure()
      if (supLeft.value === last) stable++
      else {
        stable = 0
        last = supLeft.value
      }
      rafHandle = requestAnimationFrame(loop)
    }
    rafHandle = requestAnimationFrame(loop)
  }

  watch(
    [opts.badgeRef, opts.enabled],
    ([badge, on]) => {
      if (badge && on) startBurst()
      else if (!on) supLeft.value = undefined
    },
    { immediate: true },
  )

  watch(
    () => [opts.enabled.value, opts.refreshTrigger?.value] as const,
    refresh,
    { deep: true },
  )

  onScopeDispose(stopBurst)

  return { supLeft, refresh }
}
