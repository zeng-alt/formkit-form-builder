<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NButtonGroup, NTooltip, NPopconfirm } from 'naive-ui'
import { useFormBuilderI18n } from '../i18n/context'
import BuilderPreview from './BuilderPreview.vue'
import AiPrompt from '../components/ai-prompt/AiPrompt.vue'
import ThemeSwitcher from '../components/ui/theme-switcher/ThemeSwitcher.vue'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderConfig } from '@/composables/use-config'

const config = useFormBuilderConfig()
// 所属 FormBuilder 实例状态：undo/redo / 清空提交绑定到各自实例。
const { canRedo, canUndo, commitSchema, redo, undo } = useFormBuilderState()
const { t } = useFormBuilderI18n()

const clearForm = () => {
  commitSchema([], { reason: 'clear' })
}
const showPreview = ref(false)

defineSlots<{
  /** 顶栏左侧区（清除 / 预览） */
  left?: () => unknown
  /** 顶栏中间区（AI 提示） */
  center?: () => unknown
  /** 顶栏右侧区（undo/redo / 主题） */
  right?: () => unknown
}>()
</script>

<template>
  <header class="sticky top-0 md:top-5 flex h-14 shrink-0 items-center rounded-2xl z-[1000] px-4">
    <div class="w-full grid grid-cols-3 items-center gap-3">
      <div class="flex items-center gap-2 justify-start">
        <slot name="left">
          <n-popconfirm @positive-click="clearForm">
            <template #trigger>
              <n-tooltip>
                <template #trigger>
                  <n-button text type="error" circle size="small" class="h-7 w-7 !p-2">
                    <template #icon>
                      <span class="i-lucide-trash-2 h-5 w-5"></span>
                    </template>
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
                type="primary"
                text
                circle
                size="small"
                @click="showPreview = true"
                class="h-7 w-7 !p-2"
              >
                <template #icon><span class="i-lucide-eye h-5 w-5"></span></template>
              </n-button>
            </template>
            {{ t('builder.previewForm') }}
          </n-tooltip>
          <BuilderPreview v-model:show="showPreview" />
        </slot>
      </div>

      <div class="flex justify-center">
        <slot name="center">
          <div class="w-full max-w-[560px]">
            <AiPrompt v-if="config.apiKey" />
          </div>
        </slot>
      </div>

      <div class="flex items-center gap-2 justify-end">
        <slot name="right">
          <n-button-group class="bg-card shadow-sm rounded-lg border border-border/50">
            <n-tooltip placement="bottom">
              <template #trigger>
                <n-button text size="small" class="h-7 w-7 !p-2" :disabled="!canUndo" @click="undo">
                  <template #icon
                    ><span class="i-lucide-undo-2 h-5 w-5 dark:text-green-200"></span
                  ></template>
                </n-button>
              </template>
              {{ t('builder.undo') }}
            </n-tooltip>
            <n-tooltip placement="bottom">
              <template #trigger>
                <n-button text size="small" class="h-7 w-7 !p-2" :disabled="!canRedo" @click="redo">
                  <template #icon
                    ><span class="i-lucide-redo-2 h-5 w-5 dark:text-green-200"></span
                  ></template>
                </n-button>
              </template>
              {{ t('builder.redo') }}
            </n-tooltip>
          </n-button-group>
          <ThemeSwitcher />
        </slot>
      </div>
    </div>
  </header>
</template>
