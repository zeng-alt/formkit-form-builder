<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { NModal, NButton, NSpace, NPopover } from 'naive-ui'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, hoverTooltip } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { linter } from '@codemirror/lint'
import { useColorMode, usePreferredDark } from '@vueuse/core'
import { exprHoverTooltipSource, setExprFieldNames, type ExprFieldInfo } from '@/utils/expr-completions'
import { exprLintSource, setExprLintFieldNames } from '@/utils/expr-lint'
import { useFormBuilderI18n } from '@/i18n/context'

interface CompletionOption {
  label: string
  apply: string
  type: string
  detail?: string
}

const GET_DOT_MEMBERS = [
  { label: 'value', apply: 'value', detail: 'unknown' },
  { label: 'name', apply: 'name', detail: 'string' },
  { label: 'id', apply: 'id', detail: 'string' },
  { label: 'type', apply: 'type', detail: 'string' },
  { label: 'props', apply: 'props', detail: 'Record<string, unknown>' },
  { label: 'context', apply: 'context', detail: 'FormKitContext' },
  { label: 'isValid', apply: 'isValid', detail: 'boolean' },
  { label: 'isDirty', apply: 'isDirty', detail: 'boolean' },
  { label: 'isComplete', apply: 'isComplete', detail: 'boolean' },
  { label: 'errors', apply: 'errors', detail: 'string[]' },
]

const props = defineProps<{
  show: boolean
  modelValue: string
  fieldNames?: ExprFieldInfo[]
  title?: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:modelValue': [value: string]
  save: [value: string]
}>()

const { t } = useFormBuilderI18n()

const colorMode = useColorMode()
const preferredDark = usePreferredDark()
const isDark = computed(
  () => colorMode.value === 'dark' || (colorMode.value === 'auto' && preferredDark.value),
)

const hostRef = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null
let suppress = false

const completionOpen = ref(false)
const completionOptions = ref<CompletionOption[]>([])
const completionPos = ref({ x: 0, y: 0 })
const completionSelected = ref(0)
const completionType = ref<'dot' | 'var'>('var')
let completionFrom = 0

function findDollarContext(doc: { sliceString: (from: number, to: number) => string }, cursor: number): number {
  for (let i = cursor - 1; i >= 0; i--) {
    const c = doc.sliceString(i, i + 1)
    if (c === '$') return i
    if (!/[\w:.()]/.test(c)) return -1
  }
  return -1
}

function updateCompletions(view: EditorView) {
  const cursor = view.state.selection.main.head
  const doc = view.state.doc

  const afterDot = /\.\s*(\w*)$/.exec(doc.sliceString(0, cursor))
  if (afterDot) {
    const beforeDot = doc.sliceString(0, afterDot.index)
    if (/\$get\(.*\)$/.test(beforeDot)) {
      const partial = afterDot[1] ?? ''
      const options = GET_DOT_MEMBERS.filter((m) => m.label.startsWith(partial)).map((m) => ({
        label: m.label,
        apply: m.apply,
        type: 'property',
        detail: m.detail,
      }))
      if (options.length) {
        completionType.value = 'dot'
        completionOpen.value = true
        completionOptions.value = options
        completionSelected.value = 0
        completionFrom = doc.length - afterDot[0].length + 1
        const coords = view.coordsAtPos(cursor)
        if (coords) completionPos.value = { x: coords.left, y: coords.bottom + 4 }
        return
      }
    }
  }

  const dollarPos = findDollarContext(doc, cursor)
  if (dollarPos < 0) {
    completionOpen.value = false
    return
  }

  const prefix = doc.sliceString(dollarPos + 1, cursor)
  const options: CompletionOption[] = []

  if ('slots'.startsWith(prefix) || prefix.length === 0)
    options.push({ label: 'slots', type: 'variable', apply: '$slots' })

  for (const field of props.fieldNames ?? []) {
    if (!field.name.toLowerCase().startsWith(prefix.toLowerCase())) continue
    options.push({
      label: field.name,
      detail: field.label,
      type: 'variable',
      apply: `$${field.name}`,
    })
  }

  if (options.length === 0) {
    completionOpen.value = false
    return
  }

  completionType.value = 'var'
  completionOptions.value = options
  completionSelected.value = 0
  completionFrom = dollarPos
  const coords = view.coordsAtPos(cursor)
  if (coords) completionPos.value = { x: coords.left, y: coords.bottom + 4 }
  completionOpen.value = true
}

function selectCompletion(index: number) {
  if (!editorView) return
  const opt = completionOptions.value[index]
  if (!opt) return
  suppress = true
  editorView.dispatch({
    changes: {
      from: completionFrom,
      to: editorView.state.selection.main.head,
      insert: opt.apply,
    },
  })
  const parenIdx = opt.apply.indexOf('($1)')
  if (parenIdx >= 0) {
    const newCursor = completionFrom + parenIdx + 1
    editorView.dispatch({ selection: { anchor: newCursor } })
  } else {
    const quoteIdx = opt.apply.indexOf("('')")
    if (quoteIdx >= 0) {
      editorView.dispatch({ selection: { anchor: completionFrom + quoteIdx + 2 } })
    }
  }
  queueMicrotask(() => { suppress = false })
  completionOpen.value = false
}

function handleKeydownOnCompletions(e: KeyboardEvent) {
  if (!completionOpen.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    e.stopPropagation()
    completionSelected.value = Math.min(completionSelected.value + 1, completionOptions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    completionSelected.value = Math.max(completionSelected.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    selectCompletion(completionSelected.value)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    completionOpen.value = false
  }
}

function buildExtensions() {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    javascript({ typescript: false, jsx: false }),
    hoverTooltip(exprHoverTooltipSource),
    linter(exprLintSource),
    ...(isDark.value ? [oneDark] : []),
    EditorView.updateListener.of((u) => {
      if (!u.docChanged) return
      if (suppress) return
      updateCompletions(u.view)
      emit('update:modelValue', u.state.doc.toString())
    }),
    EditorView.theme({
      '&': {
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        color: 'var(--foreground)',
      },
      '.cm-content': {
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '13px',
        lineHeight: '1.6',
      },
      '.cm-scroller': {
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
    }),
  ]
}

function syncToEditor(text: string) {
  if (!editorView) return
  const current = editorView.state.doc.toString()
  if (current === text) return
  suppress = true
  editorView.dispatch({
    changes: { from: 0, to: current.length, insert: text ?? '' },
  })
  queueMicrotask(() => { suppress = false })
}

watch(
  () => props.show,
  async (val) => {
    if (val) {
      await nextTick()
      if (!hostRef.value) return
      if (!editorView) {
        editorView = new EditorView({
          state: EditorState.create({
            doc: props.modelValue ?? '',
            extensions: buildExtensions(),
          }),
          parent: hostRef.value,
        })
        editorView.dom.style.height = '240px'
        editorView.dom.addEventListener('keydown', handleKeydownOnCompletions, true)
      }
      syncToEditor(props.modelValue)
      editorView.focus()
    }
  },
)

watch(
  () => props.fieldNames,
  (names) => {
    const n = names ?? []
    setExprFieldNames(n)
    setExprLintFieldNames(n)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  editorView?.dom.removeEventListener('keydown', handleKeydownOnCompletions, true)
  editorView?.destroy()
  editorView = null
})

function handleClose() {
  editorView?.dom.removeEventListener('keydown', handleKeydownOnCompletions, true)
  editorView?.destroy()
  editorView = null
  emit('update:show', false)
}

function handleSave() {
  if (!editorView) return
  emit('save', editorView.state.doc.toString())
}
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="false"
    @update:show="(v: boolean) => { if (!v) handleClose() }"
  >
    <div class="bg-card rounded-xl shadow-xl p-5 border border-border/60" style="width: 560px; margin: auto;">
      <div class="text-sm font-medium text-foreground mb-4">
        {{ title || t('expression.useExpressionValue') }}
      </div>
      <div ref="hostRef" class="w-full mb-4" />
      <n-popover
        :show="completionOpen"
        :x="completionPos.x"
        :y="completionPos.y"
        trigger="manual"
        placement="bottom-start"
        :width="240"
        :show-arrow="false"
        :to="false"
        raw
      >
        <div class="max-h-48 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50">
          <div
            v-for="(opt, i) in completionOptions"
            :key="i"
            class="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[12px] leading-tight"
            :class="i === completionSelected ? 'bg-blue-500/20 text-blue-400' : 'text-foreground/80 hover:bg-muted/60'"
            @mousedown.prevent="selectCompletion(i)"
          >
            <span class="text-[11px] opacity-50 w-12 shrink-0 text-right">{{ opt.type }}</span>
            <span class="font-mono font-medium">{{ opt.label }}</span>
            <span v-if="opt.detail" class="ml-auto truncate text-[11px] opacity-50">{{ opt.detail }}</span>
          </div>
        </div>
      </n-popover>
      <n-space justify="end">
        <n-button size="small" @click="handleClose">{{ t('common.cancel') }}</n-button>
        <n-button size="small" type="primary" @click="handleSave">{{ t('common.confirm') }}</n-button>
      </n-space>
    </div>
  </n-modal>
</template>
