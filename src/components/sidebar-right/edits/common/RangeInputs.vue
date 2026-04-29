<script setup lang="ts">
import { computed } from 'vue'
import { NInputNumber } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'

const props = defineProps<{
  valueOne: number | null
  valueTwo: number | null
  labelOne: string
  labelTwo: string
  placeholderOne: string
  placeholderTwo: string
}>()

const emit = defineEmits<{
  'update:valueOne': [value: number | null]
  'update:valueTwo': [value: number | null]
}>()

const modelValue = computed({
  get: () => props.valueOne,
  set: (value: number | null) => {
    emit('update:valueOne', value)
  },
})

const modelValueTwo = computed({
  get: () => props.valueTwo,
  set: (value: number | null) => {
    emit('update:valueTwo', value)
  },
})
</script>

<template>
  <EditsLayout class="flex-row items-center gap-2">
    <div class="flex flex-col gap-1">
      <label for="minInput" class="text-xs text-foreground/80">{{ props.labelOne }}</label>
      <n-input-number
        id="minInput"
        size="small"
        v-model:value="modelValue"
        :placeholder="props.placeholderOne"
      />
    </div>
    <span class="i-lucide-move-right pt-4 h-4 w-4"></span>
    <div class="flex flex-col gap-1">
      <label for="maxInput" class="text-xs text-foreground/80">{{ props.labelTwo }}</label>
      <n-input-number
        id="maxInput"
        size="small"
        v-model:value="modelValueTwo"
        :placeholder="props.placeholderTwo"
      />
    </div>
  </EditsLayout>
</template>
