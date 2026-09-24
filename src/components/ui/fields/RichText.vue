<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NButton, NInput, NPopover, NTooltip } from 'naive-ui'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'
import { useFormBuilderI18n } from '@/i18n/context'
import { sanitizeRichText } from '@/utils/rich-text-sanitize'
import { RICH_TEXT_TOOLBAR_META } from './rich-text-toolbar'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { t } = useFormBuilderI18n()
const { config, bind, disabled } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

// 只读语义 = 表单/节点级禁用 或 自身配置的只读；两者都不可编辑、隐藏工具栏
const notEditable = computed<boolean>(() => disabled.value || Boolean(config.readonly))

const minHeight = computed<number>(() => {
  const raw = config.minHeight as unknown
  const n = typeof raw === 'string' ? Number(raw) : raw
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 160
})

const maxLength = computed<number | null>(() => {
  const raw = config.maxLength as unknown
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'string' ? Number(raw) : raw
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
})

const enabledToolbar = computed<Set<string>>(() => {
  const raw = config.toolbar as unknown
  if (Array.isArray(raw)) return new Set(raw as string[])
  // 未配置（旧数据/默认）：视为全部开启
  return new Set(Object.keys(RICH_TEXT_TOOLBAR_META))
})
const showsToolbar = (key: string) => enabledToolbar.value.has(key)

const placeholder = computed(() =>
  typeof config.placeholder === 'string' ? config.placeholder : '',
)

const editorEl = ref<HTMLDivElement | null>(null)
const isFocused = ref(false)
const charCount = ref(0)

const value = computed<string>(() => {
  const raw = context._value
  return typeof raw === 'string' ? sanitizeRichText(raw) : ''
})

function updateCharCount() {
  charCount.value = editorEl.value?.textContent?.length ?? 0
}

function syncDom() {
  const el = editorEl.value
  if (!el || isFocused.value) return
  if (el.innerHTML !== value.value) el.innerHTML = value.value
  updateCharCount()
}

onMounted(syncDom)
watch(value, syncDom)

// ─── 光标偏移的记录 / 恢复（按纯文本字符数定位，跨越标签边界也稳定）───────────────
function getCaretOffset(root: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return root.textContent?.length ?? 0
  const range = sel.getRangeAt(0)
  if (!root.contains(range.endContainer)) return root.textContent?.length ?? 0
  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.endContainer, range.endOffset)
  return pre.toString().length
}

function setCaretOffset(root: HTMLElement, offset: number): void {
  const sel = window.getSelection()
  if (!sel) return
  let remaining = offset
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode() as Text | null
  let target: { node: Node; offset: number } | null = null
  while (node) {
    const len = node.textContent?.length ?? 0
    if (remaining <= len) {
      target = { node, offset: remaining }
      break
    }
    remaining -= len
    node = walker.nextNode() as Text | null
  }
  const range = document.createRange()
  if (target) range.setStart(target.node, target.offset)
  else range.selectNodeContents(root)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

function commitFromDom(preserveCaret = true) {
  const el = editorEl.value
  if (!el) return
  const raw = el.innerHTML
  const clean = sanitizeRichText(raw)
  if (clean !== raw) {
    const offset = preserveCaret ? getCaretOffset(el) : 0
    el.innerHTML = clean
    if (preserveCaret) setCaretOffset(el, offset)
  }
  updateCharCount()
  const current = typeof context._value === 'string' ? context._value : ''
  if (clean === current) return
  context.node.input(clean)
  void runEvent('onInput', clean)
  void runEvent('onChange', clean)
}

function handleInput() {
  commitFromDom(true)
}

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function handlePaste(e: ClipboardEvent) {
  if (notEditable.value) return
  e.preventDefault()
  const html = e.clipboardData?.getData('text/html')
  const text = e.clipboardData?.getData('text/plain') ?? ''
  const source = html && html.trim() ? html : escapeText(text).replace(/\r?\n/g, '<br>')
  const clean = sanitizeRichText(source)
  if (typeof document.execCommand === 'function') {
    document.execCommand('insertHTML', false, clean)
  } else if (editorEl.value) {
    editorEl.value.innerHTML += clean
  }
  void nextTick(() => commitFromDom(false))
}

// richText 的可绑定事件只有 onInput/onChange（见 elements/definitions/fields.ts 的
// bindEvents: INPUT_BASIC_EVENTS），焦点/失焦不接受用户绑定代码，这里只处理
// FormKit 自身的校验时机（handlers.blur）与分段规范化。
function handleFocus() {
  isFocused.value = true
  // 统一按 <p> 分段（Chrome 默认可能用 <div>），保证输出落在白名单标签里
  if (typeof document.execCommand === 'function') {
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }
}

function handleBlur(e: FocusEvent) {
  isFocused.value = false
  syncDom()
  context.handlers.blur(e)
}

function exec(cmd: string, arg?: string) {
  if (notEditable.value) return
  editorEl.value?.focus()
  if (typeof document.execCommand === 'function') document.execCommand(cmd, false, arg)
  commitFromDom(true)
}

const linkOpen = ref(false)
const linkDraft = ref('')
function openLink() {
  linkDraft.value = ''
  linkOpen.value = true
}
function confirmLink() {
  const url = linkDraft.value.trim()
  linkOpen.value = false
  if (!url) return
  editorEl.value?.focus()
  const sel = window.getSelection()
  if (typeof document.execCommand === 'function') {
    if (sel && !sel.isCollapsed) {
      document.execCommand('createLink', false, url)
    } else {
      document.execCommand('insertHTML', false, `<a href="${url}">${escapeText(url)}</a>`)
    }
  }
  commitFromDom(true)
}

const charCountClass = computed(() =>
  maxLength.value != null && charCount.value > maxLength.value
    ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground',
)
</script>

<template>
  <div class="rich-text-field w-full">
    <div
      v-if="!notEditable"
      class="mb-1 flex flex-wrap items-center gap-0.5 rounded-md border border-solid border-input bg-muted/40 p-1"
    >
      <n-tooltip v-if="showsToolbar('bold')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('bold')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.bold.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.bold') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('italic')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('italic')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.italic.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.italic') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('underline')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('underline')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.underline.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.underline') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('strike')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('strikeThrough')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.strike.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.strike') }}</n-tooltip
      >
      <span v-if="showsToolbar('heading')" class="mx-0.5 h-4 w-px bg-border"></span>
      <n-tooltip v-if="showsToolbar('heading')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('formatBlock', 'H2')"
            ><template #icon
              ><span class="i-lucide-heading-2 h-3.5 w-3.5"></span></template></n-button></template
        >{{ t('edits.richText.toolbar.headingH2') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('heading')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('formatBlock', 'H3')"
            ><template #icon
              ><span class="i-lucide-heading-3 h-3.5 w-3.5"></span></template></n-button></template
        >{{ t('edits.richText.toolbar.headingH3') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('heading')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('formatBlock', 'P')"
            ><template #icon
              ><span class="i-lucide-pilcrow h-3.5 w-3.5"></span></template></n-button></template
        >{{ t('edits.richText.toolbar.headingNormal') }}</n-tooltip
      >
      <span
        v-if="
          showsToolbar('bulletList') || showsToolbar('orderedList') || showsToolbar('blockquote')
        "
        class="mx-0.5 h-4 w-px bg-border"
      ></span>
      <n-tooltip v-if="showsToolbar('bulletList')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('insertUnorderedList')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.bulletList.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.bulletList') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('orderedList')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('insertOrderedList')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.orderedList.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.orderedList') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('blockquote')"
        ><template #trigger
          ><n-button
            quaternary
            size="tiny"
            @mousedown.prevent
            @click="exec('formatBlock', 'BLOCKQUOTE')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.blockquote.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.blockquote') }}</n-tooltip
      >
      <span v-if="showsToolbar('link')" class="mx-0.5 h-4 w-px bg-border"></span>
      <n-popover
        v-if="showsToolbar('link')"
        v-model:show="linkOpen"
        trigger="manual"
        placement="bottom"
      >
        <template #trigger>
          <n-tooltip
            ><template #trigger
              ><n-button quaternary size="tiny" @mousedown.prevent @click="openLink"
                ><template #icon
                  ><span
                    :class="[RICH_TEXT_TOOLBAR_META.link.icon, 'h-3.5 w-3.5']"
                  ></span></template></n-button></template
            >{{ t('edits.richText.toolbar.link') }}</n-tooltip
          >
        </template>
        <div class="flex items-center gap-1.5">
          <n-input
            v-model:value="linkDraft"
            size="small"
            class="w-52"
            :placeholder="t('edits.richText.linkPlaceholder')"
            @keydown.enter="confirmLink"
          />
          <n-button size="small" type="primary" @mousedown.prevent @click="confirmLink">{{
            t('common.confirm')
          }}</n-button>
        </div>
      </n-popover>
      <span
        v-if="showsToolbar('clear') || showsToolbar('undo') || showsToolbar('redo')"
        class="mx-0.5 h-4 w-px bg-border"
      ></span>
      <n-tooltip v-if="showsToolbar('clear')"
        ><template #trigger
          ><n-button
            quaternary
            size="tiny"
            @mousedown.prevent
            @click="
              () => {
                exec('removeFormat')
                exec('formatBlock', 'P')
              }
            "
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.clear.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.clear') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('undo')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('undo')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.undo.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.undo') }}</n-tooltip
      >
      <n-tooltip v-if="showsToolbar('redo')"
        ><template #trigger
          ><n-button quaternary size="tiny" @mousedown.prevent @click="exec('redo')"
            ><template #icon
              ><span
                :class="[RICH_TEXT_TOOLBAR_META.redo.icon, 'h-3.5 w-3.5']"
              ></span></template></n-button></template
        >{{ t('edits.richText.toolbar.redo') }}</n-tooltip
      >
    </div>

    <div
      ref="editorEl"
      class="rich-text-editor box-border w-full rounded-md border border-solid border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors"
      :class="notEditable ? 'cursor-not-allowed opacity-70' : 'focus:border-[#a277ff]'"
      :contenteditable="!notEditable"
      :data-placeholder="placeholder"
      :style="{ minHeight: `${minHeight}px` }"
      @input="handleInput"
      @paste="handlePaste"
      @focus="handleFocus"
      @blur="handleBlur"
    ></div>

    <div v-if="maxLength != null" class="mt-1 text-right text-[11px]" :class="charCountClass">
      {{ t('edits.richText.charCountWithMax', { count: charCount, max: maxLength }) }}
    </div>
  </div>
</template>

<style scoped>
.rich-text-editor:empty::before {
  content: attr(data-placeholder);
  color: var(--muted-foreground);
}
.rich-text-editor :deep(p) {
  margin: 0 0 0.5em;
}
.rich-text-editor :deep(p:last-child) {
  margin-bottom: 0;
}
.rich-text-editor :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 0.75em;
  border-left: 3px solid var(--border);
  color: var(--muted-foreground);
}
.rich-text-editor :deep(ul),
.rich-text-editor :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.rich-text-editor :deep(a) {
  color: #7c9ef8;
  text-decoration: underline;
}
</style>
