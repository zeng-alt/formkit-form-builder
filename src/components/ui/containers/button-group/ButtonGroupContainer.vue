<script setup lang="ts">
import { computed } from "vue";
import type { FormKitSchemaFormKit } from "@formkit/core";
import { NButtonGroup } from "naive-ui";
import { useFormBuilderI18n } from "@/i18n/context";
import { selectedKey } from "@/state/form-schema";
import { useContainerDragAndDrop } from "@/builder/composables/use-container-drag-and-drop";
import { useCanvasSchemaContext } from "@/builder/composables/canvas-schema-context";
import ContainerChildrenGrid from "@/components/ui/containers/shared/ContainerChildrenGrid.vue";
import { applyGroupDisabled, stripInputGroupOuterClass } from "@/utils/dnd/grid";

// 按钮组容器（NButtonGroup）：纯展示容器，无 label/help。
// 子项为按钮类静态元素，宽度自适应内容，整体 disabled 时注入到各子按钮。
const props = defineProps<{
  buttonGroupKey?: string;
  modelValue: FormKitSchemaFormKit[];
  size?: "tiny" | "small" | "medium" | "large";
  vertical?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: FormKitSchemaFormKit[]): void;
  (e: "select", key: string): void;
}>();

const { t } = useFormBuilderI18n();

const initial = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue : []
);

const canvasCtx = useCanvasSchemaContext();

// 按钮组只接收按钮类静态元素（submit/reset/naiveButton），其余元素拖入被拒
const BUTTON_TYPES = new Set(["submit", "reset", "naiveButton"]);
const isButtonNode = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const n = value as { $cmp?: unknown; $formkit?: unknown };
  const type = n.$cmp ?? n.$formkit;
  return typeof type === "string" && BUTTON_TYPES.has(type);
};

const normalizeChildren = (values: FormKitSchemaFormKit[]) => {
  const list = Array.isArray(values) ? values : [];
  return list.map((f: any) => stripInputGroupOuterClass(f));
};

const dnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: initial,
  accepts: isButtonNode,
  onUpdateModelValue: (value) => {
    const next = normalizeChildren(value);
    const k = props.buttonGroupKey;
    if (k && canvasCtx?.updateContainerChildren)
      canvasCtx.updateContainerChildren(k, next);
    else emit("update:modelValue", next);
  },
});

const emitUpdateNormalized = () => {
  const next = normalizeChildren(dnd.items.value);
  dnd.items.value = next;
  dnd.emitUpdate();
};

// 渲染用：整体禁用时给子按钮注入 disabled（浅克隆，不污染真源）。
// 用对象包一层，避免模板顶层 ref 自动解包把 Ref 变成数组传给 ContainerChildrenGrid。
const gridItems = computed<FormKitSchemaFormKit[]>(() => {
  const items = Array.isArray(dnd.items.value) ? dnd.items.value : [];
  return props.disabled ? items.map((c) => applyGroupDisabled(c)) : items;
});
const grid = { items: gridItems };

const onSelect = (child: any, _index: number) => {
  const key = child?.__key as string | undefined;
  if (!key) return;
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key);
  else emit("select", key);
};

const deleteChild = (index: number) => {
  const next = dnd.items.value.filter((_, i) => i !== index);
  dnd.items.value = next;
  emitUpdateNormalized();
};
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 bg-card/50">
    <div class="p-2">
      <n-button-group :size="props.size" :vertical="props.vertical" class="w-full">
        <ContainerChildrenGrid
          :container-ref="dnd.containerRef"
          :items="grid.items"
          :selected-key="selectedKey"
          :empty-text="t('builder.listDropHere')"
          :delete-aria-label="t('builder.deleteField')"
          :data-attrs="{
            'data-button-group-key': props.buttonGroupKey,
            'data-dnd-axis': props.vertical ? 'y' : 'x',
          }"
          layout="row"
          equal-width
          :vertical="props.vertical"
          :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
          :on-select="onSelect"
          :on-delete="deleteChild"
          :on-resize-end="emitUpdateNormalized"
          ul-class="p-0"
        />
      </n-button-group>
    </div>
  </div>
</template>

<style scoped>
/* 按钮组：隐藏子字段的 label/help，让按钮靠自身文案对齐排布 */
:deep(.n-button-group .formkit-label),
:deep(.n-button-group .formkit-help) {
  display: none;
}

/* 子按钮填满各自的等分 flex 槽位（此前按钮保持内容宽，只显示一部分）。
   只作用于 formkit-inner 内的真实按钮，不影响删除/选中等操作按钮 */
:deep(.n-button-group .formkit-inner .n-button) {
  width: 100% !important;
}
</style>
