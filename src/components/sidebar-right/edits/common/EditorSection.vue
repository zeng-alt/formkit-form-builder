<script setup lang="ts">
// 右侧面板的分组：顶部分隔线 + 加粗小标题，下面是该组的配置项。
// 与可折叠的 EditorCollapse 同一套标题样式；所有元素编辑器按「基础 / 选项 / 外观 / 行为 / 事件」
// 等分组组织配置项时共用它，保证各元素面板视觉一致。
defineProps<{
  title: string
  /** 标题下方的一行说明（可选） */
  description?: string
}>()
</script>

<template>
  <section class="mt-4 pt-3 border-t border-border/50 first:mt-0 first:pt-0 first:border-t-0">
    <div class="mb-2 text-xs font-semibold text-foreground">{{ title }}</div>
    <div v-if="description" class="-mt-1 mb-2 text-[11px] text-muted-foreground">
      {{ description }}
    </div>
    <div class="space-y-2 md:space-y-3">
      <slot />
    </div>
  </section>
</template>
