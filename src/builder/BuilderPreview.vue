<template>
  <n-modal
    v-model:show="isOpen"
    preset="card"
    :class="[
      'max-h-[90vh] flex flex-col overflow-hidden',
      resolvedView === 'desktop' ? 'sm:max-w-[800px]' : '',
      resolvedView === 'tablet' ? 'sm:max-w-[768px]' : '',
      resolvedView === 'mobile' ? 'sm:max-w-[375px]' : '',
    ]"
    :content-style="{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    }"
    :title="resolvedTitle"
    size="small"
  >
    <template #header-extra>
      <div class="text-[11px] text-muted-foreground">
        {{ resolvedDescription }}
      </div>
    </template>
    <n-scrollbar style="max-height: 600px">
      <div class="py-4 px-3">
        <FormSchemaRenderer
          ref="rendererRef"
          :schema="schemaSnapshot"
          v-model="data"
          :actions="props.actions"
          :form-class="props.formClass"
          :form-name="formName"
          :label-position="formLabelPosition"
          :label-width="formLabelWidth"
          :interactive-containers="props.interactiveContainers"
          :disabled="props.disabled"
          @submit="handleSubmit"
        />
        <div
          v-if="props.showDataPanel"
          class="mt-4 p-3 bg-muted/30 rounded border border-border/50"
        >
          <h3 class="text-[11px] font-medium mb-2 text-foreground/80">
            {{ t('builder.formDataTitle') }}
          </h3>

          <pre class="text-[11px] text-muted-foreground">{{ prettyData }}</pre>
        </div>
      </div>
    </n-scrollbar>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { NModal, NScrollbar } from 'naive-ui'
import { dslToSchema } from '@/dsl'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useFormBuilderI18n } from '@/i18n/context'
import type { CanvasView } from '@/state/canvas-ui'
import FormSchemaRenderer from '@/renderer/FormSchemaRenderer.vue'
import { useFormBuilderState } from '@/state/create-form-builder-state'

const { t } = useFormBuilderI18n()

// 所属 FormBuilder 实例状态：预览快照 / 视口绑定到各自实例；
// 独立使用（传入 schema prop）时回落到默认实例。
const { formDefinition, canvasView } = useFormBuilderState()

type ModelValue = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    show?: boolean
    schema?: FormKitSchemaFormKit[]
    title?: string
    description?: string
    showDataPanel?: boolean
    initialData?: ModelValue
    view?: CanvasView
    actions?: boolean
    formClass?: string
    interactiveContainers?: boolean
    resetOnSubmit?: boolean
    disabled?: boolean
  }>(),
  {
    showDataPanel: true,
    actions: false,
    formClass: 'w-full !grid !grid-cols-12 gap-x-4 gap-y-2',
    interactiveContainers: true,
    resetOnSubmit: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'submit', formData: ModelValue, id: string | undefined, version: number | undefined): void
}>()

const isOpenInternal = ref(false)
const isOpen = computed({
  get: () => props.show ?? isOpenInternal.value,
  set: (v: boolean) => {
    if (props.show !== undefined) emit('update:show', v)
    else isOpenInternal.value = v
  },
})

const safeClone = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const data = ref<ModelValue>({})
const schemaSnapshot = ref<FormKitSchemaFormKit[]>([])

const resolvedView = computed<CanvasView>(() => props.view ?? canvasView.value)
const resolvedTitle = computed(() => props.title ?? t('builder.previewTitle'))
const resolvedDescription = computed(() => props.description ?? t('builder.previewDescription'))

const formName = computed(() => formDefinition.value?.name ?? 'form')
const formLabelPosition = computed<'top' | 'left'>(() =>
  formDefinition.value?.settings?.labelAlign === 'left' ? 'left' : 'top',
)
const formLabelWidth = computed(() => formDefinition.value?.settings?.labelWidth ?? 80)

const prettyData = computed(() =>
  JSON.stringify(
    data.value,
    (_k, v) => {
      if (typeof v === 'function') return '[Function]'
      return v
    },
    2,
  ),
)

const initSnapshot = () => {
  const base = props.schema ?? dslToSchema(formDefinition.value)
  schemaSnapshot.value = safeClone(base)
  data.value = safeClone(props.initialData ?? {})
}

const clearSnapshot = () => {
  data.value = {}
  schemaSnapshot.value = []
}

watch(
  isOpen,
  (open) => {
    if (open) initSnapshot()
    else clearSnapshot()
  },
  { immediate: true },
)

const handleSubmit = (formData: ModelValue) => {
  emit('submit', formData, formDefinition.value?.id, formDefinition.value?.version)
  if (props.resetOnSubmit) data.value = {}
}

const open = () => {
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

// ── 校验：转发到内部 FormSchemaRenderer（n-modal 内容随弹窗挂载，等待其就绪）──
type RendererExposed = {
  validate: () => Promise<boolean>
}

const rendererRef = ref<RendererExposed | null>(null)

const waitForRenderer = async (): Promise<RendererExposed | null> => {
  for (let i = 0; i < 20 && !rendererRef.value; i++) await nextTick()
  return rendererRef.value
}

/** 校验表单：展示校验错误并返回是否通过 */
const validate = async (): Promise<boolean> => {
  const renderer = await waitForRenderer()
  if (!renderer) return false
  return renderer.validate()
}

defineExpose({
  open,
  close,
  validate,
})
</script>
