<script setup lang="ts">
import { NDynamicTags } from "naive-ui";
import EditsLayout from "./EditsLayout.vue";
import { computed } from "vue";
import type { WritableComputedRef } from "vue";

const props = defineProps<{
  model: WritableComputedRef<any, string[]>;
  label: string;
  placeholder: string;
}>();

const modelValue = computed({
  get: () => props.model.value || [],
  set: (value: string[]) => {
    props.model.value = value;
  }
});
</script>

<template>
  <EditsLayout>
    <div>
      <label
        for="selectTags"
        class="text-[11px] text-foreground/80 font-medium"
        >{{ props.label }}</label
      >
    </div>
    <div>
      <n-dynamic-tags v-model:value="modelValue" id="selectTags" />
    </div>
  </EditsLayout>
</template>
