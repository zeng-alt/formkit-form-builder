<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NTooltip, NPopconfirm } from 'naive-ui'
import { Eye, Trash2 } from 'lucide-vue-next'
import BuilderPreview from './BuilderPreview.vue'
import AiPrompt from '../components/ai-prompt/AiPrompt.vue'
import ThemeSwitcher from '../components/ui/theme-switcher/ThemeSwitcher.vue'
import { formSchema } from '../utils/default-form-elements'

const clearForm = () => {
  formSchema.value = []
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
              Clear form
            </n-tooltip>
          </template>
          Are you absolutely sure? This action cannot be undone. This will permanently delete the
          form you have created.
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
          Preview Form
        </n-tooltip>
        <BuilderPreview ref="previewRef" />
      </div>

      <div class="flex justify-center">
        <div class="w-full max-w-[560px]">
          <AiPrompt />
        </div>
      </div>

      <div class="flex items-center gap-2 justify-end">
        <ThemeSwitcher />
      </div>
    </div>
  </header>
</template>
