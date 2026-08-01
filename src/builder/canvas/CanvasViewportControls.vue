<script setup lang="ts">
import { NButton, NButtonGroup, NTooltip } from 'naive-ui'
import { canvasView } from '@/state/canvas-ui'
import { useFormBuilderI18n } from '@/i18n/context'

const { t } = useFormBuilderI18n()

const views = [
  { id: 'desktop', icon: 'i-lucide-monitor', label: 'builder.desktopView' },
  { id: 'tablet', icon: 'i-lucide-tablet', label: 'builder.tabletView' },
  { id: 'mobile', icon: 'i-lucide-smartphone', label: 'builder.mobileView' },
] as const
</script>

<template>
  <div class="w-16 shrink-0 flex flex-col items-center">
    <n-button-group vertical class="sticky top-20 bg-card shadow-sm rounded-lg border border-border/50">
      <n-tooltip v-for="view in views" :key="view.id" placement="right">
        <template #trigger>
          <n-button
            :type="canvasView === view.id ? 'primary' : 'default'"
            :aria-label="t(view.label)"
            @click="canvasView = view.id"
            size="small"
            class="w-8 h-8"
          >
            <template #icon><span :class="`${view.icon} h-3.5 w-3.5`"></span></template>
          </n-button>
        </template>
        {{ t(view.label) }}
      </n-tooltip>
    </n-button-group>
  </div>
</template>
