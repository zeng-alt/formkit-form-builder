<script setup lang="ts">
import type { FormKitSchemaFormKit } from "@formkit/core";
import { computed } from "vue";
import { FormKitSchema } from "@formkit/vue";
import { NInputGroup, NEmpty } from "naive-ui";
import { useFormBuilderI18n } from "@/i18n/context";
import { getPreviewSchemaLibrary } from "@/containers/registry";

const props = defineProps<{
  children?: FormKitSchemaFormKit[];
  modelValue?: FormKitSchemaFormKit[];
  label?: string;
  help?: string;
}>();

const { t } = useFormBuilderI18n();

const schemaLibrary = getPreviewSchemaLibrary();

const title = computed(() =>
  typeof props.label === "string" && props.label.trim()
    ? props.label.trim()
    : ""
);
const helpText = computed(() =>
  typeof props.help === "string" && props.help.trim() ? props.help.trim() : ""
);
const showHeader = computed(() => Boolean(title.value || helpText.value));
const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue;
  if (Array.isArray(props.children)) return props.children;
  return [];
});
</script>

<template>
  <div class="w-full">
    <div v-if="showHeader" class="mb-2">
      <div v-if="title" class="text-sm font-medium">{{ title }}</div>
      <div v-if="helpText" class="text-xs text-muted-foreground">
        {{ helpText }}
      </div>
    </div>
    <n-input-group class="w-full">
      <FormKitSchema
        v-if="modelValue.length"
        :schema="modelValue"
        :library="schemaLibrary"
      />

      <div v-else class="flex w-full items-center justify-center">
        <n-empty :description="t('builder.listDropHere')" />
      </div>
    </n-input-group>
  </div>
</template>

<style scoped>
/* 输入组：每个元素按 layout.colspan 的 w-[xx%] 显示宽度（不拉伸、不压缩），
   隐藏字段 label/help，保证输入框与按钮同高、上下对齐 */
:deep(.n-input-group .formkit-outer) {
  flex: 0 0 auto;
  min-width: 0;
  align-self: stretch;
}
:deep(.n-input-group .formkit-label),
:deep(.n-input-group .formkit-help) {
  display: none;
}
</style>

