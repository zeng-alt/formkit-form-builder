<script setup lang="ts">
// ═══ B2：表单模板选择弹窗 ═══════════════════════════════════════════════════════
// 卡片网格：模板名 / 一句描述 / 字段数 / 主要字段类型图标。点击卡片：画布为空直接
// 应用；非空先弹出「替换当前表单」二次确认。应用统一走 commitFormDefinition
// （现有提交漏斗），可撤销。
import { computed, ref } from 'vue'
import { NModal } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { getElementTypeDef } from '@/dsl'
import { FORM_TEMPLATES, type FormTemplateMeta } from './index'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const { t } = useFormBuilderI18n()
const { formDefinition, commitFormDefinition } = useFormBuilderState()

const isCanvasEmpty = computed(() => (formDefinition.value?.root?.children?.length ?? 0) === 0)

const pendingTemplate = ref<FormTemplateMeta | null>(null)
const confirmVisible = ref(false)

function iconOf(type: string): string {
  return getElementTypeDef(type)?.icon || 'i-lucide-shapes'
}

function applyTemplate(tpl: FormTemplateMeta) {
  const def = tpl.build(t)
  commitFormDefinition(def, { reason: 'apply-template' })
  confirmVisible.value = false
  pendingTemplate.value = null
  emit('update:show', false)
}

function selectTemplate(tpl: FormTemplateMeta) {
  if (isCanvasEmpty.value) {
    applyTemplate(tpl)
    return
  }
  pendingTemplate.value = tpl
  confirmVisible.value = true
}

function confirmApply() {
  if (pendingTemplate.value) applyTemplate(pendingTemplate.value)
}
</script>

<template>
  <n-modal
    :show="props.show"
    preset="card"
    class="max-w-[760px]"
    :title="t('templates.modalTitle')"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <div class="mb-3 text-[12px] text-muted-foreground">
      {{ t('templates.modalDescription') }}
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        v-for="tpl in FORM_TEMPLATES"
        :key="tpl.id"
        type="button"
        class="w-full border-0 bg-transparent p-0 text-left"
        :aria-label="t(tpl.nameKey)"
        @click="selectTemplate(tpl)"
      >
        <div
          class="rounded-xl border border-border/60 p-3.5 transition-colors duration-150 hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a277ff]"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a277ff]/10 text-[#a277ff]"
            >
              <span :class="[tpl.icon, 'h-4.5 w-4.5']"></span>
            </span>
            <div class="min-w-0">
              <div class="truncate text-[13px] font-medium text-foreground">
                {{ t(tpl.nameKey) }}
              </div>
              <div class="text-[11px] text-muted-foreground">
                {{ t('templates.fieldCount', { count: tpl.fieldCount }) }}
              </div>
            </div>
          </div>
          <p class="mb-2.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
            {{ t(tpl.descriptionKey) }}
          </p>
          <div class="flex items-center gap-1.5">
            <span
              v-for="type in tpl.fieldTypes"
              :key="type"
              class="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-foreground/70"
            >
              <span :class="[iconOf(type), 'h-3 w-3']"></span>
            </span>
          </div>
        </div>
      </button>
    </div>
  </n-modal>

  <n-modal
    :show="confirmVisible"
    preset="dialog"
    :title="t('templates.replaceConfirmTitle')"
    :content="t('templates.replaceConfirmContent')"
    :positive-text="t('templates.replaceConfirmOk')"
    :negative-text="t('common.cancel')"
    @positive-click="confirmApply"
    @negative-click="((confirmVisible = false), (pendingTemplate = null))"
    @update:show="(v: boolean) => (confirmVisible = v)"
  />
</template>
