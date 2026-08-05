<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState, StateEffect } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { useColorMode, usePreferredDark } from '@vueuse/core'

const props = defineProps<{
  modelValue: string
  height?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const hostRef = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let suppress = false

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
  <div class="w-full">
    <div ref="hostRef" class="w-full" />
  </div>
</template>
