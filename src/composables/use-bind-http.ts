import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { computed, inject, provide, type ComputedRef } from 'vue'

/** 字段事件 / 数据表格远程等组件经此键接收 HTTP 实例（FormBuilder config.http / FormRenderer http） */
export const BIND_AXIOS_KEY = 'previewAxios'

/**
 * 提供 JS 绑定代码用的 HTTP 实例给设计画布 / 渲染器子树。
 * 参数为响应式来源（如 computed(() => config.http)）；未传入（undefined）时
 * 回退到外层已注入的实例（如 FormRenderer 嵌在 FormBuilder 内时继承 config.http），
 * 再外层也没有才回退内置 axios。
 */
export function provideBinderHttp(source: ComputedRef<AxiosInstance | undefined>) {
  const parent = inject<ComputedRef<AxiosInstance> | null>(BIND_AXIOS_KEY, null)
  provide(
    BIND_AXIOS_KEY,
    computed(() => source.value ?? parent?.value ?? axios),
  )
}

/**
 * 读取当前生效的 HTTP 实例：优先 provide 注入（FormBuilder config.http /
 * FormRenderer http prop），否则回退模块内置 axios。
 */
export function useBinderHttp(): AxiosInstance {
  const injected = inject<ComputedRef<AxiosInstance> | null>(BIND_AXIOS_KEY, null)
  return injected?.value ?? axios
}
