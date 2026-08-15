<template>
  <n-modal
    v-model:show="isOpen"
    preset="card"
    class="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-[800px]"
    :title="title"
    size="small"
    :content-style="{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    }"
  >
    <n-scrollbar>
      <div class="flex gap-4 p-4">
        <div class="min-w-0 flex-1">
          <FormSchemaRenderer
            ref="rendererRef"
            :definition="formDefinition"
            v-model="data"
            :actions="actions"
            :form-class="formClass"
            :interactive-containers="interactiveContainers"
            @submit="handleSubmit"
          />
        </div>
        <div
          v-if="showDataPanel"
          class="shrink-0 overflow-auto border border-border/50 rounded-lg bg-muted/30 p-3"
          :style="{ width: dataPanelWidth }"
        >
          <h3 class="text-[11px] font-medium mb-2 text-foreground/80">
            {{ t('builder.formDataTitle') }}
          </h3>
          <pre class="text-[11px] whitespace-pre-wrap break-all text-muted-foreground">{{
            prettyData
          }}</pre>
        </div>
      </div>
    </n-scrollbar>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { NModal, NScrollbar } from 'naive-ui'
import type { FormDefinition } from '@/types/dsl'
import { useFormBuilderI18n } from '@/i18n/context'
import FormSchemaRenderer from '@/renderer/FormSchemaRenderer.vue'

const { t } = useFormBuilderI18n()

type ModelValue = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    /** 控制弹窗显隐 */
    show?: boolean
    /** 弹窗标题 */
    title?: string
    /** 版本化 DSL 表单定义（设计器导出的 JSON），内部 dslToSchema 转换 */
    formDefinition: FormDefinition
    /** 初始表单数据 */
    initialData?: ModelValue
    /** 渲染默认操作区（提交/重置两按钮） */
    actions?: boolean
    formClass?: string
    interactiveContainers?: boolean
    /** 是否显示右侧数据面板 */
    showDataPanel?: boolean
    /** 右侧数据面板宽度 */
    dataPanelWidth?: string
    resetOnSubmit?: boolean
  }>(),
  {
    title: '',
    initialData: () => ({}),
    actions: false,
    formClass: 'w-full !grid !grid-cols-12 gap-x-4 gap-y-2',
    interactiveContainers: true,
    showDataPanel: true,
    dataPanelWidth: '320px',
    resetOnSubmit: true,
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

const data = ref<ModelValue>({})
data.value = props.initialData ?? {}

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

const handleSubmit = (formData: ModelValue) => {
  emit('submit', formData, props.formDefinition?.id, props.formDefinition?.version)
  if (props.resetOnSubmit) data.value = {}
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
  open: () => {
    isOpen.value = true
  },
  close: () => {
    isOpen.value = false
  },
  reset: () => {
    data.value = {}
  },
  validate,
})
</script>
