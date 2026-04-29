<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NButtonGroup, NTooltip, NPopconfirm } from 'naive-ui'
import { useFormBuilderI18n } from '../i18n/context'
import BuilderPreview from './BuilderPreview.vue'
import ThemeSwitcher from '../components/ui/theme-switcher/ThemeSwitcher.vue'
import { canRedo, canUndo, commitSchema, redo, undo } from '../composables/schema-history'
import { formDsl } from '../utils/default-form-elements'

const { t } = useFormBuilderI18n()

const clearForm = () => {
  commitSchema({ ...formDsl.value, nodes: [] }, { reason: 'clear' })
}
const showPreview = ref(false)
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
                  <template #icon><span class="i-lucide-trash-2 h-4 w-4 dark:text-green-200"></span></template>
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
              @click="showPreview = true"
              class="h-5 w-5 !p-2"
            >
              <template #icon><span class="i-lucide-eye h-4 w-4 dark:text-green-200"></span></template>
            </n-button>
          </template>
          {{ t('builder.previewForm') }}
        </n-tooltip>
        <BuilderPreview v-model:show="showPreview" />
      </div>

      <div class="flex justify-center">
        <div class="w-full max-w-[560px]" />
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
                <template #icon><span class="i-lucide-undo-2 h-4 w-4 dark:text-green-200"></span></template>
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
                <template #icon><span class="i-lucide-redo-2 h-4 w-4 dark:text-green-200"></span></template>
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
