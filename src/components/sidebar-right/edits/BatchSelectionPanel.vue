<script setup lang="ts">
// ═══ D1：多选批量操作面板 ═══════════════════════════════════════════════════════
// 右侧面板多选时替换单个元素的属性表单：显示「已选 N 个元素」+ 批量删除 / 包进
// 容器 / 复制，全部调用 D0 命令层，与画布浮动工具条 / 右键菜单共用同一份实现。
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useCanvasCommands } from '@/builder/composables/use-canvas-commands'

const { t } = useFormBuilderI18n()
const state = useFormBuilderState()
const commands = useCanvasCommands(state)

const keys = computed(() => state.selectedKeys.value)
const canWrap = computed(() => commands.canWrap(keys.value))

const wrapTargets: Array<'card' | 'group' | 'collapse'> = ['card', 'group', 'collapse']

function wrapAs(type: 'card' | 'group' | 'collapse') {
  commands.wrapIn(keys.value, type)
}
</script>

<template>
  <div class="flex flex-col gap-3 py-6 px-2 text-center">
    <div
      class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#a277ff]/15 text-[#a277ff]"
    >
      <span class="i-lucide-layers h-5 w-5"></span>
    </div>
    <p class="text-sm font-medium">
      {{ t('builder.commands.batchSelected', { count: keys.length }) }}
    </p>

    <div class="flex flex-col gap-2 px-2">
      <n-button size="small" block @click="commands.duplicate(keys)">
        <template #icon><span class="i-lucide-copy-plus h-4 w-4"></span></template>
        {{ t('builder.commands.batchDuplicate') }}
      </n-button>

      <div class="flex flex-col gap-1.5 rounded-lg border border-border/60 p-2 text-left">
        <span class="px-1 text-xs text-muted-foreground">{{
          t('builder.commands.batchWrap')
        }}</span>
        <div class="flex flex-wrap gap-1.5">
          <n-button
            v-for="type in wrapTargets"
            :key="type"
            size="small"
            :disabled="!canWrap"
            @click="wrapAs(type)"
          >
            {{ t('builder.commands.batchWrapAs', { name: t(`elements.${type}.label`) }) }}
          </n-button>
        </div>
      </div>

      <n-button size="small" type="error" block ghost @click="commands.remove(keys)">
        <template #icon><span class="i-lucide-trash-2 h-4 w-4"></span></template>
        {{ t('builder.commands.batchDelete') }}
      </n-button>
    </div>
  </div>
</template>
