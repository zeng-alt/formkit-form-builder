<script setup lang="ts">
import { NInputNumber } from 'naive-ui'
import { MoveRight } from 'lucide-vue-next'
import EditsLayout from './EditsLayout.vue'
import type { WritableComputedRef } from 'vue'
import { computed } from 'vue'

const props = defineProps<{
  modelOne: WritableComputedRef<any, number>
  modelTwo: WritableComputedRef<any, number>
  labelOne: string
  labelTwo: string
  placeholderOne: string
  placeholderTwo: string
}>()

const modelValue = computed({
  get: () => props.modelOne.value,
  set: (value: number | null) => {
    if (value !== null) {
      props.modelOne.value = value
    }
  },
})

const modelValueTwo = computed({
  get: () => props.modelTwo.value,
  set: (value: number | null) => {
    if (value !== null) {
      props.modelTwo.value = value
    }
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
    <MoveRight class="pt-4" />
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
