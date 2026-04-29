<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

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

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      javascript({ typescript: false, jsx: false }),
      oneDark,
      EditorView.updateListener.of((u) => {
        if (!u.docChanged) return
        if (suppress) return
        emit('update:modelValue', u.state.doc.toString())
      }),
      EditorView.theme({
        '&': {
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(120, 120, 120, 0.25)',
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
    ],
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

