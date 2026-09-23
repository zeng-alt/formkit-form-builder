<script setup lang="ts">
import { computed, ref } from 'vue'
import { NInput } from 'naive-ui'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { useFormBuilderI18n } from '@/i18n/context'

// 画布内联编辑：静态文本元素（h1 / text / p / divider ...）双击直接改内容。
// 仅在构建器画布中启用（canvas 上下文存在 + 节点带 __key）；预览/独立渲染时退化为纯文本。
const props = defineProps<{
  context: any
  /** 写入 node.props 的 key（text / title / content / value / options） */
  propKey: string
  value: string
  /** 数组编辑（如 ul/ol 的 options 单项）：指定下标，提交时替换数组对应项 */
  propIndex?: number
}>()

const canvasCtx = useCanvasSchemaContext()
const { t } = useFormBuilderI18n()
const editing = ref(false)
const draft = ref('')
const inputRef = ref<{ focus: () => void } | null>(null)

const editKey = computed<string | null>(() => {
  const raw = props.context?.node?.props?.__key
  return typeof raw === 'string' && raw ? raw : null
})
const canEdit = computed(() => Boolean(canvasCtx?.updateNodePropsByKey && editKey.value))

function startEdit() {
  if (!canEdit.value) return
  editing.value = true
  draft.value = props.value
  requestAnimationFrame(() => inputRef.value?.focus())
}

function cancel() {
  editing.value = false
  draft.value = ''
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const text = draft.value.trim()
  if (text === props.value) return
  if (!canvasCtx?.updateNodePropsByKey || !editKey.value) return
  if (props.propIndex !== undefined) {
    const raw = props.context?.node?.props?.[props.propKey]
    const arr = Array.isArray(raw)
      ? raw.slice()
      : Array.isArray(props.context?.options)
        ? props.context.options.slice()
        : []
    if (arr[props.propIndex] !== undefined) {
      arr[props.propIndex] = text
      canvasCtx.updateNodePropsByKey(editKey.value, { [props.propKey]: arr })
    }
  } else if (text) {
    canvasCtx.updateNodePropsByKey(editKey.value, { [props.propKey]: text })
  }
}

// 合并为单个 @keydown 按 e.key 分支：同一个 <NInput> 上挂多个 @keydown.xxx 修饰符会被
// Vue 合并成数组传给它的 onKeydown prop（类型声明为 Function），触发
// `Invalid prop: type check failed for prop "onKeydown". Expected Function, got Array`
// 警告（同 TabsContainer.vue 的改名输入框）。
function onKeydown(e: KeyboardEvent) {
  e.stopPropagation()
  if (e.key === 'Enter') {
    e.preventDefault()
    commit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}
</script>

<template>
  <NInput
    v-if="canEdit && editing"
    ref="inputRef"
    data-canvas-edit
    size="tiny"
    :value="draft"
    :placeholder="value"
    @update:value="(v: string) => (draft = v)"
    @blur="commit"
    @keydown="onKeydown"
    @pointerdown.stop
  />
  <span
    v-else-if="canEdit"
    class="cursor-text rounded-sm outline-none ring-0 hover:ring-1 hover:ring-[#a277ff]/40 focus:ring-[#a277ff]"
    :title="t('edits.inlineEditHint')"
    @dblclick="startEdit"
    >{{ value }}</span
  >
  <template v-else>{{ value }}</template>
</template>
