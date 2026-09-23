// ═══ L4：拖动时靠近画布滚动容器边缘自动滚动 ════════════════════════════════════
// 指针靠近可滚动祖先的上/下边缘（EDGE_PX 内）时按距边缘的远近匀速到最快滚动，
// 越靠边越快；离开边缘区域或拖动结束即停。用 setInterval 自驱动（而不是
// requestAnimationFrame）：原生拖拽期间页面是否还按正常节奏出合成帧因浏览器而异，
// 定时器更简单可靠——一旦指针停在边缘区域触发过一次 dragover/pointerover，
// 后续滚动完全由这个定时器自己驱动，不需要拖拽事件持续触发。
const EDGE_PX = 60
const MAX_SPEED_PX = 16
const TICK_MS = 16

let scrollEl: HTMLElement | null = null
let speed = 0
let timerId: ReturnType<typeof setInterval> | null = null

function tick() {
  if (scrollEl && speed !== 0) {
    scrollEl.scrollTop += speed
  }
}

/**
 * 根据指针的视口坐标更新自动滚动状态：找到指针下最近的可滚动祖先，
 * 按距上/下边缘的远近算出滚动速度（越靠边越快，越过边缘区域则停）。
 */
export function updateEdgeAutoScroll(
  clientX: number,
  clientY: number,
  findScrollableAncestor: (el: HTMLElement) => HTMLElement | null,
) {
  const hit = document.elementFromPoint(clientX, clientY)
  const container = hit instanceof HTMLElement ? findScrollableAncestor(hit) : null

  if (!container) {
    stopEdgeAutoScroll()
    return
  }

  const rect = container.getBoundingClientRect()
  const distTop = clientY - rect.top
  const distBottom = rect.bottom - clientY

  let next = 0
  if (distTop >= 0 && distTop < EDGE_PX) next = -MAX_SPEED_PX * (1 - distTop / EDGE_PX)
  else if (distBottom >= 0 && distBottom < EDGE_PX) next = MAX_SPEED_PX * (1 - distBottom / EDGE_PX)

  scrollEl = container
  speed = next

  if (next !== 0 && timerId === null) timerId = setInterval(tick, TICK_MS)
  if (next === 0 && timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

export function stopEdgeAutoScroll() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
  scrollEl = null
  speed = 0
}
