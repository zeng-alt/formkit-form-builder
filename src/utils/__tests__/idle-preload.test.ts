// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { preloadModule, schedulePreload } from '@/utils/idle-preload'

afterEach(() => vi.useRealTimers())

describe('schedulePreload', () => {
  it('空闲后执行任务；取消后不再执行', () => {
    vi.useFakeTimers()
    const run = vi.fn()
    schedulePreload(run)
    const skipped = vi.fn()
    const cancel = schedulePreload(skipped)
    cancel()
    vi.runAllTimers()
    expect(run).toHaveBeenCalledTimes(1)
    expect(skipped).not.toHaveBeenCalled()
  })
})

describe('preloadModule', () => {
  it('加载失败时不产生未处理的 rejection', async () => {
    const onUnhandled = vi.fn()
    process.on('unhandledRejection', onUnhandled)
    preloadModule(() => Promise.reject(new Error('boom')))
    await new Promise((r) => setTimeout(r, 0))
    process.off('unhandledRejection', onUnhandled)
    expect(onUnhandled).not.toHaveBeenCalled()
  })
})
