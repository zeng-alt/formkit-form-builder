<script setup lang="ts">
import type { FormKitSchemaFormKit } from "@formkit/core";
import { computed, inject } from "vue";
import { FormKit, FormKitSchema } from "@formkit/vue";
import { NButton, NTooltip, NEmpty } from "naive-ui";
import { useFormBuilderI18n } from "@/i18n/context";
import { getPreviewSchemaLibrary } from "@/elements/canvas";

const props = defineProps<{
  nodeKey?: string;
  listKey?: string;
  children?: FormKitSchemaFormKit[];
  modelValue?: FormKitSchemaFormKit[];
  label?: string;
  name?: string;
  isPlaceholder?: boolean;
}>();

const restore = inject(
  "previewListRestore",
  null as unknown as ((key: string) => void) | null
);
const interactive = inject("previewListInteractive", true);

const { t } = useFormBuilderI18n();

const schemaLibrary = getPreviewSchemaLibrary();

const title = computed(() =>
  typeof props.label === "string" && props.label.trim()
    ? props.label.trim()
    : ""
);
const nodeKey = computed(() => props.nodeKey ?? props.listKey ?? "");
const listName = computed(() =>
  typeof props.name === "string" && props.name.trim()
    ? props.name.trim()
    : props.listKey || "list"
);
const recordFields = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue;
  if (Array.isArray(props.children)) return props.children;
  return [];
});
const canRestore = computed(
  () => props.isPlaceholder === true && typeof restore === "function"
);

const addItem = (node: unknown, value: unknown) => {
  (node as { input: (v: unknown[]) => void }).input([
    ...(Array.isArray(value) ? value : []),
    {},
  ]);
};
const removeItem = (node: unknown, value: unknown, index: number) => {
  (node as { input: (v: unknown[]) => void }).input(
    (Array.isArray(value) ? value : []).filter((_, i) => i !== index)
  );
};
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 pt-2">
    <div v-if="title" class="mb-2px">
      <div v-if="title" class="text-12px font-bold">{{ title }}</div>
    </div>

    <div class="p-2">
      <div
        v-if="props.isPlaceholder === true"
        class="min-h-[140px] flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-3">
          <n-empty :description="t('builder.listRemove')" />
          <n-button v-if="canRestore" secondary @click="restore?.(nodeKey)">
            <template #icon
              ><span class="i-lucide-plus h-4 w-4"></span
            ></template>
            {{ t("builder.addListContainer") }}
          </n-button>
        </div>
      </div>

      <FormKit
        v-else
        type="list"
        :name="listName"
        :dynamic="true"
        :value="[{}]"
      >
        <template #default="{ items, node, value }">
          <div
            v-for="(item, index) in items"
            :key="index"
            class="relative mb-2 rounded-lg border border-border/40 p-4"
          >
            <FormKit :type="'group'" :index="index as number">
              <div class="grid grid-cols-12 gap-x-4 gap-y-2">
                <FormKitSchema
                  :schema="recordFields"
                  :library="schemaLibrary"
                />
              </div>
            </FormKit>
            <n-tooltip
              v-if="interactive && items.length > 1 && index as number > 0"
              placement="top"
            >
              <template #trigger>
                <n-button
                  quaternary
                  text
                  type="error"
                  size="small"
                  class="!absolute -top-2 -right-2 z-10"
                  @click.stop="removeItem(node, value, index as number)"
                >
                  <template #icon
                    ><span class="i-lucide-trash-2 h-4 w-4"></span
                  ></template>
                </n-button>
              </template>
              {{ t("builder.listRemove") }}
            </n-tooltip>
          </div>

          <n-button
            v-if="interactive && recordFields.length > 0"
            secondary
            type="primary"
            size="small"
            class="w-full"
            @click="addItem(node, value)"
          >
            <template #icon
              ><span class="i-lucide-plus h-4 w-4"></span
            ></template>
            {{ t("builder.listAdd") }}
          </n-button>
          <div
            v-if="recordFields.length <= 0"
            class="flex w-full items-center justify-center"
          >
            <n-empty :description="t('builder.listDropHere')" />
          </div>
        </template>
      </FormKit>
    </div>
  </div>
</template>
