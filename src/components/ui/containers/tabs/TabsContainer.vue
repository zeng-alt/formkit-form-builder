<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FormKitSchemaFormKit } from "@formkit/core";
import { useFormBuilderI18n } from "@/i18n/context";
import { useFormBuilderState } from "@/state/create-form-builder-state";
import { useContainerDragAndDrop } from "@/builder/composables/use-container-drag-and-drop";
import { useCanvasSchemaContext } from "@/builder/composables/canvas-schema-context";
import ContainerChildrenGrid from "../shared/ContainerChildrenGrid.vue";
import { generateKey } from "@/utils/dnd/schema";

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey } = useFormBuilderState();

type TabsPane = {
  __key: string;
  label?: string;
  children?: FormKitSchemaFormKit[];
  outerClass?: string;
};

const props = defineProps<{
  tabsKey?: string;
  modelValue: TabsPane[];
  label?: string;
  help?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: TabsPane[]): void;
}>();

const { t } = useFormBuilderI18n();
const canvasCtx = useCanvasSchemaContext();

const panes = computed<TabsPane[]>(() =>
  Array.isArray(props.modelValue) ? props.modelValue : []
);

const activeKey = ref<string | null>(null);
const activeIndex = ref(0);
watch(
  () => panes.value.length,
  (len) => {
    if (len <= 0) activeIndex.value = 0;
    else if (activeIndex.value > len - 1) activeIndex.value = len - 1;
  },
  { immediate: true }
);

watch(
  () => panes.value.map((p) => p.__key).join("|"),
  (next) => {
    const keys = next ? next.split("|").filter(Boolean) : [];
    if (keys.length === 0) {
      activeIndex.value = 0;
      activeKey.value = null;
      return;
    }
    if (!activeKey.value) {
      activeKey.value = keys[0] ?? null;
      activeIndex.value = 0;
      return;
    }
    const idx = keys.indexOf(activeKey.value);
    if (idx >= 0) activeIndex.value = idx;
    else {
      activeKey.value = keys[0] ?? null;
      activeIndex.value = 0;
    }
  },
  { immediate: true }
);

const updatePanes = (next: TabsPane[]) => {
  const k = props.tabsKey;
  if (k && canvasCtx?.updateContainerChildren)
    canvasCtx.updateContainerChildren(k, next as any);
  else emit("update:modelValue", next);
};

const createPane = (label: string): TabsPane => {
  const key = generateKey();
  return { __key: key, label, outerClass: "col-span-12", children: [] };
};

const bootstrapped = ref(false);
watch(
  () => panes.value.length,
  (len) => {
    if (bootstrapped.value) return;
    if (!props.tabsKey) return;
    if (!canvasCtx?.updateContainerChildren) return;
    if (len > 0) {
      bootstrapped.value = true;
      return;
    }
    bootstrapped.value = true;
    updatePanes([createPane("Tab 1")]);
  },
  { immediate: true }
);

const activePane = computed(() => panes.value[activeIndex.value]);
const activePaneKey = computed(() => activePane.value?.__key);
const activeChildren = computed(() => {
  const c = activePane.value?.children;
  return Array.isArray(c) ? c : [];
});

const paneDnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: activeChildren,
  onUpdateModelValue: (value) => {
    const k = activePaneKey.value;
    if (!k) return;
    if (canvasCtx?.updateContainerChildren)
      canvasCtx.updateContainerChildren(k, value);
  },
});

const tabLabel = (pane: TabsPane | undefined, idx: number) => {
  const label = pane?.label;
  if (typeof label === "string" && label.trim()) return label.trim();
  return `Tab ${idx + 1}`;
};

const selectTab = (idx: number) => {
  activeIndex.value = idx;
  const key = panes.value[idx]?.__key ?? null;
  activeKey.value = key;
  // 选中 tab 时同步选中对应 pane，右侧属性面板显示其 name（= tab 标题）编辑器
  if (key && canvasCtx?.selectByKey) canvasCtx.selectByKey(key);
};

const addTab = () => {
  const next = [...panes.value, createPane(`Tab ${panes.value.length + 1}`)];
  updatePanes(next);
  activeIndex.value = next.length - 1;
  activeKey.value = next[next.length - 1]?.__key ?? null;
};

const editingIndex = ref<number | null>(null);
const editingValue = ref("");

const startEdit = (idx: number) => {
  editingIndex.value = idx;
  editingValue.value = tabLabel(panes.value[idx], idx);
};

const commitEdit = () => {
  const idx = editingIndex.value;
  if (idx === null) return;
  const nextLabel =
    editingValue.value.trim() || tabLabel(panes.value[idx], idx);
  const next = panes.value.map((p, i) =>
    i === idx ? { ...p, label: nextLabel } : p
  );
  updatePanes(next);
  editingIndex.value = null;
};

const onSelectChild = (child: any) => {
  const key = child?.__key as string | undefined;
  if (!key) return;
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key);
};

const deleteChild = (index: number) => {
  const next = paneDnd.items.value.filter((_, i) => i !== index);
  paneDnd.items.value = next;
  paneDnd.emitUpdate();
};
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 bg-card/50">
    <div
      v-if="props.label || props.help"
      class="flex flex-col gap-0.5 px-3 py-2 border-b border-border/50"
    >
      <div v-if="props.label" class="text-xs text-muted-foreground">
        {{ props.label }}
      </div>
      <div v-if="props.help" class="text-[11px] text-muted-foreground">
        {{ props.help }}
      </div>
    </div>

    <div class="px-2 pt-2">
      <div class="flex items-center gap-1 border-b border-border/50 pb-1">
        <div
          v-for="(pane, idx) in panes"
          :key="pane.__key || idx"
          :class="[
            'relative flex items-center rounded-md px-2 py-1 text-xs select-none',
            idx === activeIndex
              ? 'bg-background border border-[#a277ff] shadow-[0_0_0_3px_rgba(79,110,247,0.12)]'
              : 'text-muted-foreground border border-transparent hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]',
          ]"
          @click="selectTab(idx)"
          @dblclick.stop="startEdit(idx)"
        >
          <n-input
            v-if="editingIndex === idx"
            size="small"
            class="!w-32"
            :value="editingValue"
            @update:value="(v: string) => (editingValue = v)"
            @blur="commitEdit"
            @keydown.enter.stop.prevent="commitEdit"
            @keydown.esc.stop.prevent="editingIndex = null"
          />
          <span v-else class="select-none">{{ tabLabel(pane, idx) }}</span>
        </div>
        <n-button quaternary size="small" class="!h-7 !px-2" @click="addTab">
          +
        </n-button>
      </div>
    </div>

    <div class="p-2">
      <ContainerChildrenGrid
        :container-ref="paneDnd.containerRef"
        :items="paneDnd.items"
        :selected-key="selectedKey"
        :empty-text="t('builder.listDropHere')"
        :delete-aria-label="t('builder.deleteField')"
        :resize-aria-label="t('builder.resizeFieldWidth')"
        :show-delete-tooltip="true"
        :delete-tooltip-text="t('builder.deleteField')"
        :data-attrs="{ 'data-tabs-pane-key': activePaneKey }"
        :set-nested-parent-on-root="paneDnd.setNestedParentOnRoot"
        :on-select="(child) => onSelectChild(child)"
        :on-delete="deleteChild"
        :on-resize-end="paneDnd.emitUpdate"
      />
    </div>
  </div>
</template>
