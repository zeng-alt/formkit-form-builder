<script setup lang="ts">
import type { FormKitSchemaFormKit } from "@formkit/core";
import { computed } from "vue";
import { FormKitSchema } from "@formkit/vue";
import { NButtonGroup, NEmpty } from "naive-ui";
import { useFormBuilderI18n } from "@/i18n/context";
import { getPreviewSchemaLibrary } from "@/elements/canvas";

const props = defineProps<{
  children?: FormKitSchemaFormKit[];
  modelValue?: FormKitSchemaFormKit[];
  size?: "tiny" | "small" | "medium" | "large";
  vertical?: boolean;
}>();

const { t } = useFormBuilderI18n();

const schemaLibrary = getPreviewSchemaLibrary();

const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue;
  if (Array.isArray(props.children)) return props.children;
  return [];
});
</script>

<template>
  <div class="w-full">
    <n-button-group :size="props.size" :vertical="props.vertical" class="w-full">
      <FormKitSchema
        v-if="modelValue.length"
        :schema="modelValue"
        :library="schemaLibrary"
      />

      <div v-else class="flex w-full items-center justify-center">
        <n-empty :description="t('builder.listDropHere')" />
      </div>
    </n-button-group>
  </div>
</template>

<style scoped>
/* 按钮组：子按钮等分整行宽度（有多少个就平分多少）；隐藏 label/help */
:deep(.n-button-group .formkit-outer),
:deep(.n-button-group .formkit-wrapper) {
  width: 0% !important;
  flex: 1 1 0% !important;
}
:deep(.n-button-group .formkit-label),
:deep(.n-button-group .formkit-help) {
  display: none;
}
</style>
