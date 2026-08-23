<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState, StateEffect } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  hoverTooltip,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion } from '@codemirror/autocomplete'
import { linter } from '@codemirror/lint'
import { useColorMode, usePreferredDark } from '@vueuse/core'
import {
  bindRuntimeCompletionsSource,
  bindRuntimeHoverTooltipSource,
  setFormFieldNames,
} from '@/utils/bind-runtime-completions'
import { jsLintSource } from '@/utils/bind-runtime-lint'
import { useFormBuilderI18n } from '@/i18n/context'

const props = defineProps<{
  modelValue: string
  height?: number
  /** 表单字段名列表，用于 form.xxx 智能补全 */
  fieldNames?: string[]
  /** 内容区上方的快捷插入变量名列表；缺省不显示快捷栏 */
  quickVars?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const hostRef = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let suppress = false

const { t } = useFormBuilderI18n()
const quickVarsLabel = computed(() => t('builder.quickInsert'))

/** 在光标处插入变量名（快捷栏点击） */
function insertAtCursor(name: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: name },
    selection: { anchor: from + name.length },
  })
  view.focus()
}

const colorMode = useColorMode()
const preferredDark = usePreferredDark()
// 与全局主题同源：ThemeSwitcher / theme prop 切换时编辑器随动
const isDark = computed(
  () => colorMode.value === 'dark' || (colorMode.value === 'auto' && preferredDark.value),
)

const extensions = computed(() => [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  javascript({ typescript: false, jsx: false }),
  autocompletion(),
  javascriptLanguage.data.of({ autocomplete: bindRuntimeCompletionsSource }),
  hoverTooltip(bindRuntimeHoverTooltipSource),
  linter(jsLintSource),
  // 深色模式用 oneDark；浅色模式用 CodeMirror 默认浅色语法高亮
  ...(isDark.value ? [oneDark] : []),
  EditorView.updateListener.of((u) => {
    if (!u.docChanged) return
    if (suppress) return
    emit('update:modelValue', u.state.doc.toString())
  }),
  EditorView.theme({
    '&': {
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--card)',
      color: 'var(--foreground)',
    },
    '.cm-content': {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '12px',
      lineHeight: '1.55',
    },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  }),
])

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: extensions.value,
  })
}

onMounted(() => {
  if (!hostRef.value) return
  view = new EditorView({
    state: createState(props.modelValue ?? ''),
    parent: hostRef.value,
  })
  const h = Math.max(160, Math.min(720, Math.round(props.height ?? 280)))
  view.dom.style.height = `${h}px`
})

// 同步表单字段名到补全引擎
watch(
  () => props.fieldNames,
  (names) => setFormFieldNames(names ?? []),
  { immediate: true },
)

// 主题切换时重配扩展（oneDark 是否启用 / 边框背景随 CSS 变量自动适配）
watch(isDark, () => {
  view?.dispatch({ effects: StateEffect.reconfigure.of(extensions.value) })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

watch(
  () => props.modelValue,
  (next) => {
    if (!view) return
    const current = view.state.doc.toString()
    if (current === next) return
    suppress = true
    view.dispatch({
      changes: { from: 0, to: current.length, insert: next ?? '' },
    })
    queueMicrotask(() => {
      suppress = false
    })
  },
)
</script>

<template>
  <div class="w-full space-y-1.5">
    <div
      v-if="quickVars && quickVars.length"
      class="flex flex-wrap items-center gap-1 px-0.5"
    >
      <span class="text-[10px] text-muted-foreground mr-0.5 shrink-0">
        {{ quickVarsLabel }}
      </span>
      <button
        v-for="name in quickVars"
        :key="name"
        type="button"
        class="px-1.5 py-0.5 rounded border border-border/50 bg-muted/40 text-[11px] font-mono text-foreground/80 transition-colors hover:bg-muted hover:text-foreground cursor-pointer select-none"
        @mousedown.prevent="insertAtCursor(name)"
      >
        {{ name }}
      </button>
    </div>
    <div ref="hostRef" class="w-full" />
  </div>
</template>
