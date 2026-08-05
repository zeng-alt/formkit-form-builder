<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { NLayout, type ConfigProviderProps } from 'naive-ui'
import type { BuilderTheme } from '@/types/theme'
import { changeLocale } from '@formkit/vue'

import SidebarLeft from '../components/sidebar-left/SidebarLeft.vue'
import SidebarRight from '../components/sidebar-right/SidebarRight.vue'
import BuilderCanvas from './canvas/BuilderCanvas.vue'
import BuilderHeader from './BuilderHeader.vue'
import { useFormBuilderConfig, provideFormBuilderConfig } from '../composables/use-config'
import { registerElements } from '../plugin/register-element'
import type { FormBuilderConfig } from '../types/env'
import { provideFormBuilderI18n } from '../i18n/context'
import { provideRuntimeLocale } from '../i18n/runtime-locale'
import { provideFormBuilderState } from '@/state/create-form-builder-state'
import BuilderThemeScope from '@/theme/BuilderThemeScope.vue'
import type { FormDefinition } from '@/types/dsl'

defineSlots<{
  /** 整个顶栏（含默认内容） */
  header?: () => unknown
  /** 顶栏左侧区（清除 / 预览），不传则用默认 */
  'header-left'?: () => unknown
  /** 顶栏中间区（AI 提示），不传则用默认 */
  'header-center'?: () => unknown
  /** 顶栏右侧区（undo/redo / 主题），不传则用默认 */
  'header-right'?: () => unknown
  /** 画布空状态，不传则用默认 NEmpty */
  empty?: () => unknown
  /** 右侧操作列（导入导出 / 语言切换），不传则用默认 */
  toolbar?: () => unknown
}>()

const props = defineProps<
  {
    /** 表单定义：v-model 双向绑定，预载已有表单并实时吐出编辑结果 */
    modelValue?: FormDefinition
    /** 本实例配置；传了则自给（registerElements + provide），不传回落外层 BuilderProvider 注入 */
    config?: FormBuilderConfig
    /** 自定义主题：内部映射到 naive-ui 的 darkTheme / lightTheme；缺省自动跟随系统 */
    theme?: BuilderTheme
  } & Omit<Partial<ConfigProviderProps>, 'theme'>
>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormDefinition): void
}>()

// ── 实例状态：每个 FormBuilder 独立的 formDefinition / 历史 / 选中 / 画布 ──
const state = provideFormBuilderState()
const { formDefinition, setFormDefinition } = state

// ── 配置：prop 优先，否则回落注入（BuilderProvider 提供）──
const injectedCfg = useFormBuilderConfig()
if (props.config) {
  registerElements(props.config.elements)
  provideFormBuilderConfig(props.config)
}
const cfg = (props.config ?? injectedCfg) as FormBuilderConfig

const availableLocales = cfg?.availableLocales ?? ['zh-CN', 'en']
const localeFallback = cfg?.localeFallback ?? 'zh-CN'
const initialLocale = availableLocales.includes(cfg?.locale ?? '') ? cfg!.locale! : localeFallback

const runtimeLocale = provideRuntimeLocale({
  initialLocale,
  availableLocales,
  localeFallback,
})

watch(
  () => runtimeLocale.locale.value,
  (next) => {
    changeLocale(next === 'zh-CN' ? 'zh' : next === 'en' ? 'en' : next)
  },
  { immediate: true },
)

provideFormBuilderI18n({
  locale: computed(() => runtimeLocale.locale.value),
  localeFallback: computed(() => runtimeLocale.localeFallback.value),
  messages: computed(() => cfg?.messages as Record<string, any> | undefined),
})

// ── v-model 双向同步 ────────────────────────────────────────────────────────
// syncingFromProps：外部 modelValue 变更（预载 / 父级替换）正在落到内部状态，不回吐。
// syncingToProps：内部变更刚吐出，父级回声的 modelValue 直接忽略，避免死循环。
let syncingFromProps = false
let syncingToProps = false

const safeClone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

// 外部 → 内部：预载 / 替换表单。resetHistory 重置内部 undo 栈（父级权威）。
watch(
  () => props.modelValue,
  (next) => {
    if (!next) return
    if (syncingToProps) return
    if (next === formDefinition.value) return
    syncingFromProps = true
    setFormDefinition(safeClone(next), { resetHistory: true })
    nextTick(() => {
      syncingFromProps = false
    })
  },
  { immediate: true },
)

// 内部 → 外部：任何编辑 / 拖拽 / undo / redo 后吐出当前表单定义。
watch(
  formDefinition,
  (def) => {
    if (syncingFromProps) return
    syncingToProps = true
    emit('update:modelValue', safeClone(def))
    nextTick(() => {
      syncingToProps = false
    })
  },
  { deep: false },
)

const onBuilderBlankPointerDown = (e: PointerEvent) => {
  const el = e.target as HTMLElement | null
  if (!el) return

  if (el.closest('[data-canvas-item="true"]')) return
  if (
    el.closest(
      'button,a,input,textarea,select,option,[role="button"],[role="switch"],[contenteditable="true"]',
    )
  )
    return
  if (el.closest('.n-button,.n-input,.n-select,.n-switch,.n-dropdown,.n-popover')) return

  state.selectedTarget.value = 'form'
  state.selectedKey.value = null
}
</script>

<template>
  <BuilderThemeScope
    :theme="props.theme"
    :locale="runtimeLocale.naiveLocale.value"
    :date-locale="runtimeLocale.naiveDateLocale.value"
    :theme-overrides="themeOverrides"
    :breakpoints="breakpoints"
    :cls-prefix="clsPrefix"
    :inline-theme-disabled="inlineThemeDisabled"
    :preflight-style-disabled="preflightStyleDisabled"
  >
    <n-layout has-sider class="h-screen w-full">
      <SidebarLeft />
      <n-layout has-sider sider-placement="right" class="flex-1 mb-4">
        <n-layout
          class="relative h-full"
          :native-scrollbar="false"
          @pointerdown.capture="onBuilderBlankPointerDown"
        >
          <div class="p-4 flex flex-1 min-h-0 flex-col">
            <slot name="header">
              <BuilderHeader>
                <template v-if="$slots['header-left']" #left>
                  <slot name="header-left" />
                </template>
                <template v-if="$slots['header-center']" #center>
                  <slot name="header-center" />
                </template>
                <template v-if="$slots['header-right']" #right>
                  <slot name="header-right" />
                </template>
              </BuilderHeader>
            </slot>

            <BuilderCanvas class="flex-1 min-h-0">
              <template v-if="$slots['toolbar']" #toolbar>
                <slot name="toolbar" />
              </template>
              <template v-if="$slots['empty']" #empty>
                <slot name="empty" />
              </template>
            </BuilderCanvas>
          </div>
        </n-layout>
        <SidebarRight />
      </n-layout>
    </n-layout>
  </BuilderThemeScope>
</template>
