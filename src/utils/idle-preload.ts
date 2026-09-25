// ═══ 空闲时预加载 ════════════════════════════════════════════════════════════════
// 部分懒加载 chunk（如内嵌 CodeMirror 的表达式/JS 代码编辑器）体积较大，直接等用户
// 点开才拉取会让第一次打开明显卡一下。用浏览器空闲时间提前发起 import()，命中缓存后
// 真正点开时不再有网络等待；不支持 requestIdleCallback 的环境（如部分 WebView）
// 退回 setTimeout，效果类似但没有"真的空闲再执行"的调度优先级。

type IdleWindow = {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

/** 在浏览器空闲时执行一次任务；调用方自己决定何时触发（通常是设计器挂载后）。
 *  返回取消函数：调用方卸载时应取消，避免组件已销毁（或测试环境已拆除）后才发起 import()。 */
export function schedulePreload(task: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const w = window as IdleWindow
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(task, { timeout: 2000 })
    return () => w.cancelIdleCallback?.(id)
  }
  const timer = setTimeout(task, 300)
  return () => clearTimeout(timer)
}

/** 预加载一个懒加载模块：失败时静默忽略——预加载只是优化，真正打开时还会再 import 一次 */
export function preloadModule(loader: () => Promise<unknown>): void {
  loader().catch(() => {})
}
