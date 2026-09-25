<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { NButton, NButtonGroup, NTooltip, NPopselect } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useRuntimeLocale } from '@/i18n/runtime-locale'

// 导入导出弹窗打开后才需要，懒加载 + 首次点开才挂载（组件标签直接使用，不是塞进
// 某个弹窗默认插槽，需要自己控制挂载时机，理由同 BuilderHeader.vue）
const ImportExportModal = defineAsyncComponent(() => import('../ImportExportModal.vue'))

const { t } = useFormBuilderI18n()
const { setLocale, locale, availableLocales } = useRuntimeLocale()
const showImportExportModal = ref(false)
const importExportEverOpened = ref(false)
</script>

<template>
  <div class="w-16 shrink-0 flex flex-col items-center">
    <!-- 贴顶由外层（BuilderCanvas.vue）负责，这里不再 sticky -->
    <div class="flex flex-col gap-2">
      <n-button-group vertical class="bg-card shadow-sm rounded-lg border border-border/50">
        <n-tooltip placement="left">
          <template #trigger>
            <n-button
              @click="
                () => {
                  importExportEverOpened = true
                  showImportExportModal = true
                }
              "
              size="small"
              :aria-label="t('builder.importExportSchema')"
              class="w-8 h-8"
            >
              <template #icon><span class="i-lucide-code-xml h-16px w-16px"></span></template>
            </n-button>
          </template>
          {{ t('builder.importExportSchema') }}
        </n-tooltip>
        <n-popselect
          :value="locale"
          :options="availableLocales"
          @update:value="setLocale"
          trigger="click"
        >
          <n-button size="small" :aria-label="t('builder.switchLanguage')" class="w-8 h-8">
            <template #icon><span class="i-lucide-languages h-16px w-16px"></span></template>
          </n-button>
        </n-popselect>
      </n-button-group>
    </div>

    <ImportExportModal v-if="importExportEverOpened" v-model:show="showImportExportModal" />
  </div>
</template>
