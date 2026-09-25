// @vitest-environment happy-dom
// ═══ W1：内置 axios 懒加载 ══════════════════════════════════════════════════════
// 覆盖点：
// 1. 没有任何代码真正发起请求时，axios 模块不会被 import。
// 2. 外层注入了自定义 http 实例时，走的是自定义实例，完全不触发内置 axios 加载。
// 3. 真正调用内置 http 的方法（get/post 等）时才加载 axios，之后加载结果被缓存，
//    行为对调用方透明（拿到的仍是 Promise）。
import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { provideBinderHttp, useBinderHttp, builtinHttp } from '@/composables/use-bind-http'

// 模块级计数：axios 的动态 import 被真正解析（懒加载触发）多少次。
let axiosLoadCount = 0
const axiosGet = vi.fn(async (url: string) => ({ data: `builtin:${url}` }))
const axiosPost = vi.fn(async (url: string) => ({ data: `builtin-post:${url}` }))

vi.mock('axios', () => {
  axiosLoadCount++
  return {
    default: { get: axiosGet, post: axiosPost, defaults: {} },
  }
})

describe('内置 axios 懒加载（use-bind-http）', () => {
  it('模块加载、组件未发起任何请求时，不会触发 axios 的动态 import', () => {
    expect(builtinHttp).toBeTruthy()
    expect(axiosLoadCount).toBe(0)
  })

  it('注入了自定义 http 实例时，完全走自定义实例，不加载内置 axios', async () => {
    const customGet = vi.fn(async (url: string) => ({ data: `custom:${url}` }))
    const custom = { get: customGet } as any

    let captured: unknown
    const Consumer = defineComponent({
      setup() {
        captured = useBinderHttp()
        return () => null
      },
    })
    const Host = defineComponent({
      setup() {
        provideBinderHttp(computed(() => custom))
        return () => h(Consumer)
      },
    })

    const wrapper = mount(Host)
    expect(captured).toBe(custom)
    const res = await (captured as any).get('/ping')
    expect(res).toEqual({ data: 'custom:/ping' })
    expect(customGet).toHaveBeenCalledWith('/ping')
    expect(axiosLoadCount).toBe(0)
    wrapper.unmount()
  })

  it('没有外层注入时，首次调用内置 http 的方法才会加载 axios，且结果透明可用', async () => {
    expect(axiosLoadCount).toBe(0)

    const res = await builtinHttp.get('/foo')
    expect(res).toEqual({ data: 'builtin:/foo' })
    expect(axiosGet).toHaveBeenCalledWith('/foo')
    expect(axiosLoadCount).toBe(1)

    // 再次调用（含另一个方法）复用同一次加载结果，不会重复 import
    await builtinHttp.post('/bar')
    expect(axiosPost).toHaveBeenCalledWith('/bar')
    expect(axiosLoadCount).toBe(1)
  })
})
