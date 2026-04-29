<script setup lang="ts">
import { computed } from 'vue'
import { NDynamicTags } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'

const props = defineProps<{
  value: string[]
  label: string
  placeholder: string
}>()

const emit = defineEmits<{
  'update:value': [value: string[]]
}>()

const modelValue = computed({
  get: () => props.value || [],
  set: (value: string[]) => {
    emit('update:value', value)
  },
})
</script>

<template>
  <EditsLayout>
    <div>
      <label for="selectTags" class="text-[11px] text-foreground/80 font-medium">{{
        props.label
      }}</label>
    </div>
    <div>
      <n-dynamic-tags v-model:value="modelValue" id="selectTags" />
    </div>
  </EditsLayout>
</template>

