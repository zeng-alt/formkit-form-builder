<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NButtonGroup, NTooltip, NPopconfirm } from 'naive-ui'
import { Eye, Trash2, Undo2, Redo2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import BuilderPreview from './BuilderPreview.vue'
import AiPrompt from '../components/ai-prompt/AiPrompt.vue'
import ThemeSwitcher from '../components/ui/theme-switcher/ThemeSwitcher.vue'
import { canRedo, canUndo, commitSchema, redo, undo } from '../composables/schema-history'

const { t } = useI18n()

const clearForm = () => {
  commitSchema([], { reason: 'clear' })
}
const previewRef = ref<InstanceType<typeof BuilderPreview>>()
</script>

<template>
  <header class="sticky top-0 md:top-5 flex h-14 shrink-0 items-center rounded-2xl z-[1000] px-4">
    <div class="w-full grid grid-cols-3 items-center gap-3">
      <div class="flex items-center gap-2 justify-start">
        <n-popconfirm @positive-click="clearForm">
          <template #trigger>
            <n-tooltip>
              <template #trigger>
                <n-button secondary circle size="small" class="h-5 w-5 !p-2">
                  <template #icon><Trash2 class="dark:text-green-200" /></template>
                </n-button>
              </template>
              {{ t('builder.clearForm') }}
            </n-tooltip>
          </template>
          {{ t('builder.clearConfirm') }}
        </n-popconfirm>

        <n-tooltip>
          <template #trigger>
            <n-button
              secondary
              circle
              size="small"
              @click="previewRef?.open()"
              class="h-5 w-5 !p-2"
            >
              <template #icon><Eye class="dark:text-green-200" /></template>
            </n-button>
          </template>
          {{ t('builder.previewForm') }}
        </n-tooltip>
        <BuilderPreview ref="previewRef" />
      </div>

      <div class="flex justify-center">
        <div class="w-full max-w-[560px]">
          <AiPrompt />
        </div>
      </div>

      <div class="flex items-center gap-2 justify-end">
        <n-button-group class="bg-card shadow-sm rounded-lg border border-border/50">
          <n-tooltip placement="bottom">
            <template #trigger>
              <n-button
                secondary
                circle
                size="small"
                class="h-5 w-5 !p-2"
                :disabled="!canUndo"
                @click="undo"
              >
                <template #icon><Undo2 class="dark:text-green-200" /></template>
              </n-button>
            </template>
            {{ t('builder.undo') }}
          </n-tooltip>
          <n-tooltip placement="bottom">
            <template #trigger>
              <n-button
                secondary
                circle
                size="small"
                class="h-5 w-5 !p-2"
                :disabled="!canRedo"
                @click="redo"
              >
                <template #icon><Redo2 class="dark:text-green-200" /></template>
              </n-button>
            </template>
            {{ t('builder.redo') }}
          </n-tooltip>
        </n-button-group>
        <ThemeSwitcher />
      </div>
    </div>
  </header>
</template>
