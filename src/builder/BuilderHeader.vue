<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NButtonGroup, NTooltip, NPopconfirm } from 'naive-ui'
import { Eye, Trash2, Monitor, Tablet, Smartphone } from 'lucide-vue-next'
import BuilderPreview from './BuilderPreview.vue'
import AiPrompt from '../components/ai-prompt/AiPrompt.vue'
import ThemeSwitcher from '../components/ui/theme-switcher/ThemeSwitcher.vue'
import { formSchema } from '../utils/default-form-elements'
import { canvasView } from '../composables/form-fields'

const clearForm = () => {
  formSchema.value = []
}
const previewRef = ref<InstanceType<typeof BuilderPreview>>()
</script>

<template>
  <header class="sticky top-0 md:top-5 flex h-14 shrink-0 items-center rounded-2xl z-[1000] px-4">
    <!-- Center: Viewport Switcher -->
    <div class="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
      <n-button-group>
        <n-tooltip>
          <template #trigger>
            <n-button
              :type="canvasView === 'desktop' ? 'primary' : 'default'"
              @click="canvasView = 'desktop'"
              class="w-10"
            >
              <template #icon><Monitor class="h-4 w-4" /></template>
            </n-button>
          </template>
          Desktop View
        </n-tooltip>
        <n-tooltip>
          <template #trigger>
            <n-button
              :type="canvasView === 'tablet' ? 'primary' : 'default'"
              @click="canvasView = 'tablet'"
              class="w-10"
            >
              <template #icon><Tablet class="h-4 w-4" /></template>
            </n-button>
          </template>
          Tablet View
        </n-tooltip>
        <n-tooltip>
          <template #trigger>
            <n-button
              :type="canvasView === 'mobile' ? 'primary' : 'default'"
              @click="canvasView = 'mobile'"
              class="w-10"
            >
              <template #icon><Smartphone class="h-4 w-4" /></template>
            </n-button>
          </template>
          Mobile View
        </n-tooltip>
      </n-button-group>
    </div>

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
