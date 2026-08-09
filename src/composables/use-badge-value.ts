import { computed, inject, type ComputedRef, type Ref } from 'vue'
import { compileExpr } from '@/expression/evaluator'

// 徽标值解析：支持字面量（文本 / 数字）与表达式。
// 表达式为含 $ 的字符串（如 "$count" / "$count + 1"），运行时用注入的表单数据求值
//（FormSchemaRenderer 提供 previewFormData）；未注入（画布态）或求值失败时回退原文。
export function useBadgeValue(rawValue: ComputedRef<string | number | undefined>) {
  const previewFormData = inject<Ref<Record<string, unknown>> | null>('previewFormData', null)

  const badgeValue = computed<string | number>(() => {
    const v = rawValue.value
    if (typeof v === 'string' && v.includes('$')) {
      try {
        const data = previewFormData?.value ?? {}
        const result = compileExpr(v).evaluate(data)
        // 表达式引用的字段未填时可能得到 undefined / NaN，回退为原文（画布态也走这里）
        if (
          result !== undefined &&
          result !== null &&
          result !== '' &&
          !(typeof result === 'number' && Number.isNaN(result))
        ) {
          return result as string | number
        }
      } catch {
        // 表达式无效时回退原文
      }
      return v
    }
    return v === undefined || v === null ? '' : v
  })

  return { badgeValue }
}
