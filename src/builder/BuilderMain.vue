<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
import { useKeyboardShortcuts } from './composables/use-keyboard-shortcuts'
import { provideAiPromptFocusRegistry } from './composables/use-ai-prompt-focus'
import { provideFormDefinition } from '@/composables/use-form-definition'
import { provideBinderHttp } from '@/composables/use-bind-http'
import BuilderThemeScope from '@/theme/BuilderThemeScope.vue'
import type { FormDefinition } from '@/types/dsl'
import { schedulePreload } from '@/utils/idle-preload'
import {
  collectElementTypes,
  getAllLazyElementTypes,
  preloadElementComponents,
} from '@/elements/component-loader'

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
// 窄只读上下文：画布内的字段事件绑定 / 数据表格预览等只读消费方，走这条与
// FormRenderer 共用的接口，不需要拿到完整 FormBuilderState（undo/redo/选中态）。
provideFormDefinition(formDefinition)

// B3：空画布引导「用 AI 生成」入口聚焦顶栏 AI 输入框，见 use-ai-prompt-focus.ts
provideAiPromptFocusRegistry()

// X：字段/容器按需加载组件预热——当前画布已经在用的类型立即加载（不等空闲，避免
// 切换到这些字段/预览时用户等待），其余全部按需类型放到浏览器空闲时间预加载
// （画布随时可能切到任意类型，见 utils/idle-preload.ts）。
onMounted(() => {
  void preloadElementComponents(collectElementTypes(formDefinition.value))
  const cancelIdlePreload = schedulePreload(() => {
    void preloadElementComponents(getAllLazyElementTypes())
  })
  onUnmounted(cancelIdlePreload)
})

// H5：键盘快捷键——监听挂在设计器根元素上（模板里的 @keydown），不挂 window，
// 保证多个设计器实例互不干扰（keydown 会从任意子孙元素冒泡到这个根节点）。
const { onKeydown } = useKeyboardShortcuts(state)

// ── 配置：prop 优先，否则回落注入（BuilderProvider 提供）──
const injectedCfg = useFormBuilderConfig()
if (props.config) {
  registerElements(props.config.elements)
  provideFormBuilderConfig(props.config)
}
const cfg = (props.config ?? injectedCfg) as FormBuilderConfig

// 画布预览（字段 JS 绑定 / 数据表格远程）使用用户传入的 http（config.http），缺省内置 axios
provideBinderHttp(computed(() => cfg.http))

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

const { t } = provideFormBuilderI18n({
  locale: computed(() => runtimeLocale.locale.value),
  localeFallback: computed(() => runtimeLocale.localeFallback.value),
  messages: computed(() => cfg?.messages as Record<string, any> | undefined),
})

// 全新画布（未传 modelValue）时，用当前语言补齐默认提交按钮的文案：state 创建时
// （上面 provideFormBuilderState()）i18n 上下文还没就绪，画布初始定义里的提交按钮
// 没法带 label，只能留空；这里语言一就绪就立刻补一次，避免用户看到空文案或
// 写死的英文——不推历史（这是初始化补全，不是一次用户编辑）。
if (!props.modelValue) {
  const initialDef = formDefinition.value
  const children = initialDef.root.children
  const submitNode = children.find((n) => n.category === 'static' && n.type === 'submit')
  if (submitNode && !submitNode.label) {
    setFormDefinition(
      {
        ...initialDef,
        root: {
          ...initialDef.root,
          children: children.map((n) =>
            n === submitNode ? { ...n, label: t('elements.submit.label') } : n,
          ),
        },
      },
      { resetHistory: false },
    )
  }
}

// ── v-model 双向同步 ────────────────────────────────────────────────────────
// syncingFromProps：外部 modelValue 变更（预载 / 父级替换）正在落到内部状态，不回吐。
// syncingToProps：内部变更刚吐出，父级回声的 modelValue 直接忽略，避免死循环。
let syncingFromProps = false
let syncingToProps = false

// 外部传入的对象我们不能假设不被外部代码原地修改，预载前深拷贝隔离
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
// 直接 emit def 本身，不再深拷贝：def 是不可变更新产出的定义（开发态已深度冻结），
// 吐给外部的这份视为只读快照——调用方不应原地修改它（改了也改不动 DSL 真源，
// 冻结下会直接抛错），需要另存一份改动请自行拷贝。v-model 使用方式见 README。
watch(
  formDefinition,
  (def) => {
    if (syncingFromProps) return
    syncingToProps = true
    emit('update:modelValue', def)
    nextTick(() => {
      syncingToProps = false
    })
  },
  { deep: false },
)

// H5 键盘快捷键的根元素：keydown 事件从任意子孙元素冒泡上来即可命中，不需要它本身
// 获得焦点——但"点击空白画布区域"这类落在非可聚焦元素上的点击会让浏览器焦点退回
// document.body（这个根元素是 body 的后代，事件不会从 body"下沉"进来），
// 导致点完空白区域后 Ctrl+Z 等快捷键失效。给它一个 tabindex 让它能被 JS 聚焦，
// 在原有的"点击空白区域"处理里顺带聚焦过去，保证后续快捷键仍能命中。
const shortcutRootEl = ref<HTMLElement | null>(null)

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
  state.selectedColumnIndex.value = null
  shortcutRootEl.value?.focus({ preventScroll: true })
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
    <!-- 快捷键的事件挂载层：让 keydown 冒泡有处可接、点击空白区域后能把焦点收回来。
         必须是真实的块级元素——display:contents 的元素没有盒子，浏览器不会让它获得焦点 -->
    <div ref="shortcutRootEl" class="outline-none" tabindex="-1" @keydown="onKeydown">
      <n-layout has-sider class="h-screen w-full">
        <SidebarLeft />
        <n-layout has-sider sider-placement="right" class="flex-1 mb-4">
          <n-layout
            class="relative h-full"
            :native-scrollbar="false"
            @pointerdown.capture="onBuilderBlankPointerDown"
          >
            <div class="p-16px flex flex-1 min-h-0 flex-col">
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
    </div>
  </BuilderThemeScope>
</template>
