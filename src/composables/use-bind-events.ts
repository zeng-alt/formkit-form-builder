import type { ComputedRef } from 'vue'
import type { FormKitFrameworkContext } from '@formkit/core'
import { runBindCode } from '@/utils/bind-runtime'
import { useBinderHttp } from '@/composables/use-bind-http'
import { useFormDefinition } from '@/composables/form-fields'

/**
 * 字段事件绑定（onClick / onChange / onInput / onFocus / onBlur）。
 *
 * 与 bind-runtime 的 allowedEventKeys 对齐；bind 取 useSchemaAttrs 的 __bind。
 * runEvent 仅在对应 key 存在时才执行用户代码，避免无绑定字段的空跑。
 */
export function useBindEvents(
  context: FormKitFrameworkContext,
  bind: ComputedRef<Record<string, unknown>>,
) {
  const { formId, formVersion } = useFormDefinition()
  const bindAxios = useBinderHttp()

  async function runEvent(key: string, event: unknown) {
    const code = bind.value[key]
    if (typeof code !== 'string' || !code.trim()) return
    await runBindCode(code, event, context, formId.value, formVersion.value, undefined, bindAxios)
  }

  return { runEvent }
}
