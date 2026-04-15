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
    <!-- Right: Actions -->
    <div class="ml-auto flex items-center gap-3">
      <n-popconfirm @positive-click="clearForm">
        <template #trigger>
          <n-tooltip>
            <template #trigger>
              <n-button secondary circle class="h-6 w-6 !p-3">
                <template #icon><Trash2 class="dark:text-green-200" /></template>
              </n-button>
            </template>
            Clear form
          </n-tooltip>
        </template>
        Are you absolutely sure? This action cannot be undone. This will permanently delete the form
        you have created.
      </n-popconfirm>

      <n-tooltip>
        <template #trigger>
          <n-button secondary circle @click="previewRef?.open()" class="h-6 w-6 !p-3">
            <template #icon><Eye class="dark:text-green-200" /></template>
          </n-button>
        </template>
        Preview Form
      </n-tooltip>
      <BuilderPreview ref="previewRef" />
      <AiPrompt />
      <ThemeSwitcher />
    </div>
  </header>
</template>
