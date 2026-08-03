<script setup lang="ts">
import type { FormKitSchemaFormKit } from "@formkit/core";
import { computed } from "vue";
import { FormKitSchema } from "@formkit/vue";
import { NEmpty, NTabPane, NTabs } from "naive-ui";
import { useFormBuilderI18n } from "@/i18n/context";
import { getPreviewSchemaLibrary } from "@/containers/registry";

const props = defineProps<{
  children?: FormKitSchemaFormKit[];
  modelValue?: FormKitSchemaFormKit[];
  label?: string;
  help?: string;
  type?: string;
  placement?: string;
  size?: string;
  animated?: boolean;
  closable?: boolean;
}>();

const { t } = useFormBuilderI18n();

const schemaLibrary = getPreviewSchemaLibrary();

const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue;
  if (Array.isArray(props.children)) return props.children;
  return [];
});

const tabLabel = (child: any, idx: number) => {
  const label = child?.label ?? child?.props?.label;
  if (typeof label === "string" && label.trim()) return label.trim();
  const name = child?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return `Tab ${idx + 1}`;
};

const paneClosable = computed<boolean>(() => Boolean(props.closable ?? false));
</script>

<template>
  <div class="w-full">
    <div v-if="props.label || props.help" class="flex flex-col gap-0.5 mb-2">
      <div v-if="props.label" class="text-sm font-medium">
        {{ props.label }}
      </div>
      <div v-if="props.help" class="text-xs text-muted-foreground">
        {{ props.help }}
      </div>
    </div>
    <n-empty
      v-if="modelValue.length === 0"
      :description="t('builder.listDropHere')"
    />
    <n-tabs
      v-else
      :type="(props.type as any) || 'line'"
      :placement="(props.placement as any) || 'top'"
      :size="(props.size as any) || 'small'"
      :animated="props.animated ?? true"
    >
      <n-tab-pane
        v-for="(child, idx) in modelValue"
        :key="(child as any)?.__key || idx"
        :name="(child as any)?.__key || idx"
        :tab="tabLabel(child, idx)"
        :closable="paneClosable"
        display-directive="show:lazy"
      >
        <!-- pane 内容由 formatTabs 包装为单个 group（内含 grid grid-cols-12），
             直接渲染即可，不要再套一层 grid，否则 group 占不到整行、字段 colspan 失效 -->
        <div>
          <FormKitSchema
            v-if="Array.isArray((child as any)?.children) && (child as any).children.length > 0"
            :schema="Array.isArray((child as any)?.children) ? (child as any).children : []"
            :library="schemaLibrary"
          />
          <n-empty v-else :description="t('builder.listDropHere')" />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
