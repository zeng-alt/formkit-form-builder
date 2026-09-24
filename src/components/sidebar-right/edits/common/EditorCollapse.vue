<script setup lang="ts">
import { NCollapse, NCollapseItem } from 'naive-ui'

// 右侧面板的可折叠分组：标题样式与面板里的分组标题一致（顶部分隔线 + 加粗小标题），
// 箭头放右侧。自定义属性、校验规则、数据表格的高级 JSON 共用，保证折叠区与普通分组同一套视觉。
const props = withDefaults(
  defineProps<{
    title: string
    name: string
    /** 初始是否展开 */
    defaultExpanded?: boolean
  }>(),
  { defaultExpanded: false },
)
</script>

<template>
  <n-collapse
    class="editor-collapse mt-4 pt-3 border-t border-border/50"
    :default-expanded-names="props.defaultExpanded ? [props.name] : []"
  >
    <n-collapse-item :name="props.name">
      <template #header>
        <span class="text-xs font-semibold text-foreground">{{ props.title }}</span>
      </template>
      <!-- 不用 naive 自带箭头（它会再叠一层旋转）：箭头放右侧，按展开状态切换方向 -->
      <template #arrow><span></span></template>
      <template #header-extra="{ collapsed }">
        <span
          :class="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
          class="h-3.5 w-3.5 text-muted-foreground"
        ></span>
      </template>
      <slot />
    </n-collapse-item>
  </n-collapse>
</template>

<style scoped>
.editor-collapse {
  --n-item-margin: 0;
  --n-title-padding: 0;
}
.editor-collapse :deep(.n-collapse-item-arrow) {
  display: none !important;
}
.editor-collapse :deep(.n-collapse-item__content-inner) {
  padding-top: 10px !important;
}
</style>
