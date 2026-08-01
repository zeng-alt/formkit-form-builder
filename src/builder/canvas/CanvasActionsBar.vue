<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NButtonGroup, NTooltip } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useRuntimeLocale } from '@/i18n/runtime-locale'
import ImportExportModal from '../ImportExportModal.vue'

const { t } = useFormBuilderI18n()
const { setLocale, locale } = useRuntimeLocale()
const showImportExportModal = ref(false)

const isZh = computed(() => locale.value === 'zh-CN')
</script>

<template>
  <div class="w-16 shrink-0 hidden md:flex flex-col items-center">
    <div class="sticky top-20 flex flex-col gap-2">
      <n-button-group vertical class="bg-card shadow-sm rounded-lg border border-border/50">
        <n-tooltip placement="left">
          <template #trigger>
            <n-button
              @click="showImportExportModal = true"
              size="small"
              :aria-label="t('builder.importExportSchema')"
              class="w-8 h-8"
            >
              <template #icon><span class="i-lucide-code-xml h-3.5 w-3.5"></span></template>
            </n-button>
          </template>
          {{ t('builder.importExportSchema') }}
        </n-tooltip>
      </n-button-group>

      <n-button-group vertical class="bg-card shadow-sm rounded-lg border border-border/50">
        <n-button
          size="small"
          class="w-8 h-8"
          :type="isZh ? 'primary' : 'default'"
          aria-label="切换到中文"
          @click="setLocale('zh-CN')"
        >
          中
        </n-button>
        <n-button
          size="small"
          class="w-8 h-8"
          :type="!isZh ? 'primary' : 'default'"
          aria-label="Switch to English"
          @click="setLocale('en')"
        >
          EN
        </n-button>
      </n-button-group>
    </div>

    <ImportExportModal v-model:show="showImportExportModal" />
  </div>
</template>
