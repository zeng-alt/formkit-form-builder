import type { AxiosInstance } from 'axios'
import { computed, inject, provide, type ComputedRef } from 'vue'

/** 字段事件 / 数据表格远程等组件经此键接收 HTTP 实例（FormBuilder config.http / FormRenderer http） */
const BIND_AXIOS_KEY = 'previewAxios'

// axios 44KB，只有 JS 绑定代码 / 数据表格远程数据真正用到内置 http 时才值得加载；
// 用户自己传入 http 实例（config.http / FormRenderer 的 http prop）的场景完全不需要它。
// 首次真正发起请求时才 import，结果缓存，同一次会话只加载一次。
let axiosModulePromise: Promise<AxiosInstance> | null = null
function loadAxios(): Promise<AxiosInstance> {
  if (!axiosModulePromise) axiosModulePromise = import('axios').then((mod) => mod.default)
  return axiosModulePromise
}

/**
 * 内置 axios 的懒加载占位实例：外观是一个 AxiosInstance，实际访问其方法
 * （get / post / put / delete / request ...）时才会触发 import('axios')，
 * 加载完成前的调用会先等待加载，行为对调用方透明（拿到的仍是一个 Promise）。
 *
 * 局限：只有“调用方法”这种用法能被透明代理；同步读取 `http.defaults` /
 * `http.interceptors` 这类属性拿不到真实值（读到的会是一个函数占位）。目前项目
 * 内的用法（事件绑定代码、数据表格远程数据）都只是 `axios.get(...)` 这种方法
 * 调用，没有这种同步读属性的写法。
 */
function createLazyAxios(): AxiosInstance {
  const bound = new Map<string, (...args: unknown[]) => Promise<unknown>>()
  // 目标本身是可调用的（对齐 axios 实例本身可以 `instance(config)` 直接发请求）
  const target = ((...args: unknown[]) =>
    loadAxios().then((instance) =>
      (instance as unknown as (...a: unknown[]) => unknown)(...args),
    )) as unknown as AxiosInstance
  return new Proxy(target, {
    get(t, prop, receiver) {
      // Vue 响应式探测（__v_isRef 等）与 Promise 探测（then）按“不是 ref / 不是
      // thenable”处理即可，交回原生函数本身的属性（均为 undefined），避免这个
      // 占位对象被误判成响应式对象或 thenable。
      if (typeof prop === 'symbol' || prop === 'then' || prop.startsWith('__v_')) {
        return Reflect.get(t, prop, receiver)
      }
      if (!bound.has(prop)) {
        bound.set(prop, (...args: unknown[]) =>
          loadAxios().then((instance) =>
            (instance as unknown as Record<string, any>)[prop](...args),
          ),
        )
      }
      return bound.get(prop)
    },
  }) as AxiosInstance
}

/** 内置 http 兜底实例：外层没有注入 http 时使用（懒加载，见 createLazyAxios） */
export const builtinHttp: AxiosInstance = createLazyAxios()

/**
 * 提供 JS 绑定代码用的 HTTP 实例给设计画布 / 渲染器子树。
 * 参数为响应式来源（如 computed(() => config.http)）；未传入（undefined）时
 * 回退到外层已注入的实例（如 FormRenderer 嵌在 FormBuilder 内时继承 config.http），
 * 再外层也没有才回退内置 axios（懒加载）。
 */
export function provideBinderHttp(source: ComputedRef<AxiosInstance | undefined>) {
  const parent = inject<ComputedRef<AxiosInstance> | null>(BIND_AXIOS_KEY, null)
  provide(
    BIND_AXIOS_KEY,
    computed(() => source.value ?? parent?.value ?? builtinHttp),
  )
}

/**
 * 读取当前生效的 HTTP 实例：优先 provide 注入（FormBuilder config.http /
 * FormRenderer http prop），否则回退内置 axios（懒加载）。
 */
export function useBinderHttp(): AxiosInstance {
  const injected = inject<ComputedRef<AxiosInstance> | null>(BIND_AXIOS_KEY, null)
  return injected?.value ?? builtinHttp
}
