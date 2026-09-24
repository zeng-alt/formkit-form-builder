<script setup lang="ts">
// ═══ B3：画布空状态引导卡片 ═══════════════════════════════════════════════════
// 渲染在 ContainerChildrenGrid 的空态覆盖层里（该层 pointer-events: none，让拖拽
// 事件穿透到下层真正的 drop 目标 <ul>——引导卡片区域因此仍是可放置区，拖入元素后
// items 不再是空数组，这层覆盖直接消失）。卡片本身继承这个 none，只在两个可点击
// 入口上单独打开 pointer-events-auto，不影响拖放穿透。
import { ref } from 'vue'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderConfig } from '@/composables/use-config'
import { useAiPromptFocusRegistry } from '../composables/use-ai-prompt-focus'
import TemplatePickerModal from '@/templates/TemplatePickerModal.vue'

const { t } = useFormBuilderI18n()
const config = useFormBuilderConfig()
const focusRegistry = useAiPromptFocusRegistry()

const showTemplates = ref(false)
function openTemplates() {
  showTemplates.value = true
}
function focusAi() {
  focusRegistry?.value?.()
}
</script>

<template>
  <div
    class="w-full max-w-[320px] flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border/60 bg-card/70 px-6 py-7 text-center dark:bg-neutral-900/40"
  >
    <span
      class="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a277ff]/10 text-[#a277ff]"
    >
      <span class="i-lucide-layout-panel-top h-6 w-6"></span>
    </span>
    <h3 class="text-[13px] font-semibold text-foreground">
      {{ t('builder.emptyCanvas.title') }}
    </h3>

    <div class="mt-4 w-full flex flex-col gap-2">
      <div class="flex items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5">
        <span class="i-lucide-arrow-left h-4 w-4 shrink-0 text-muted-foreground"></span>
        <div class="min-w-0 text-left">
          <div class="text-[12px] font-medium text-foreground">
            {{ t('builder.emptyCanvas.dragTitle') }}
          </div>
          <div class="text-[11px] text-muted-foreground">
            {{ t('builder.emptyCanvas.dragDescription') }}
          </div>
        </div>
      </div>

      <button
        type="button"
        class="pointer-events-auto w-full border-0 bg-transparent p-0 text-left"
        :aria-label="t('builder.emptyCanvas.templateTitle')"
        @click="openTemplates"
      >
        <div
          class="flex items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 transition-colors duration-150 hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]"
        >
          <span class="i-lucide-layout-template h-4 w-4 shrink-0 text-[#a277ff]"></span>
          <div class="min-w-0 text-left">
            <div class="text-[12px] font-medium text-foreground">
              {{ t('builder.emptyCanvas.templateTitle') }}
            </div>
            <div class="text-[11px] text-muted-foreground">
              {{ t('builder.emptyCanvas.templateDescription') }}
            </div>
          </div>
        </div>
      </button>

      <button
        v-if="config.apiKey"
        type="button"
        class="pointer-events-auto w-full border-0 bg-transparent p-0 text-left"
        :aria-label="t('builder.emptyCanvas.aiTitle')"
        @click="focusAi"
      >
        <div
          class="flex items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 transition-colors duration-150 hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]"
        >
          <span class="i-lucide-sparkles h-4 w-4 shrink-0 text-[#a277ff]"></span>
          <div class="min-w-0 text-left">
            <div class="text-[12px] font-medium text-foreground">
              {{ t('builder.emptyCanvas.aiTitle') }}
            </div>
            <div class="text-[11px] text-muted-foreground">
              {{ t('builder.emptyCanvas.aiDescription') }}
            </div>
          </div>
        </div>
      </button>
    </div>

    <div class="pointer-events-auto">
      <TemplatePickerModal v-model:show="showTemplates" />
    </div>
  </div>
</template>
