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
</script>

<template>
  <NInput
    v-if="canEdit && editing"
    ref="inputRef"
    size="tiny"
    :value="draft"
    :placeholder="value"
    @update:value="(v: string) => (draft = v)"
    @blur="commit"
    @keydown.enter.prevent="commit"
    @keydown.esc.prevent="cancel"
    @keydown.stop
    @pointerdown.stop
  />
  <span
    v-else-if="canEdit"
    class="cursor-text rounded-sm outline-none ring-0 hover:ring-1 hover:ring-[#a277ff]/40 focus:ring-[#a277ff]"
    :title="t('edits.inlineEditHint')"
    @dblclick="startEdit"
  >{{ value }}</span>
  <template v-else>{{ value }}</template>
</template>
