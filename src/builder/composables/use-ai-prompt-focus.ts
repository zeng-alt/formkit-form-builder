// ═══ B3：空画布引导「用 AI 生成」入口 → 聚焦顶栏 AI 输入框 ═══════════════════════
// BuilderHeader（持有 AiPrompt 实例）与 BuilderCanvas（持有空画布引导）是 BuilderMain
// 下的两个兄弟分支，互相拿不到对方的组件引用。这里在 BuilderMain 层级 provide 一个
// 可写的"焦点函数"格子：AiPrompt 挂载时把自己的 focus() 注册进去（写），引导卡片
// 点击时调用它（读）。多个 FormBuilder 实例各自 provide 一份，互不干扰。
import { inject, provide, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

type FocusFn = () => void

const AI_PROMPT_FOCUS_KEY: InjectionKey<Ref<FocusFn | null>> = Symbol('aiPromptFocus')

/** 由 BuilderMain 在实例根部调用一次，建立本实例的焦点注册格子。 */
export function provideAiPromptFocusRegistry(): Ref<FocusFn | null> {
  const registry = ref<FocusFn | null>(null)
  provide(AI_PROMPT_FOCUS_KEY, registry)
  return registry
}

/** 子树内读写这个格子；子树外（未 provide）返回 null，调用方按"没有可聚焦的输入框"处理。 */
export function useAiPromptFocusRegistry(): Ref<FocusFn | null> | null {
  return inject(AI_PROMPT_FOCUS_KEY, null)
}
