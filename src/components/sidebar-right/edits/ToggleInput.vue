<script setup lang="ts">
import { NRadioGroup, NRadioButton } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'
import type { WritableComputedRef } from 'vue'
import { computed } from 'vue'

const props = defineProps<{
  model: WritableComputedRef<any, string>
  label: string
  itemLabelOne: string
  itemLabelTwo: string
  valueOne: string
  valueTwo: string
  type: 'single' | 'multiple' | undefined
}>()

const modelValue = computed({
  get: () => props.model.value,
  set: (value: string) => {
    props.model.value = value
  },
})
</script>

<template>
  <EditsLayout>
    <label for="tgroup" class="text-xs text-foreground/80">{{ props.label }}</label>
    <n-radio-group id="tgroup" v-model:value="modelValue" size="small" name="tgroup">
      <n-radio-button :value="props.valueOne">
        {{ props.itemLabelOne }}
      </n-radio-button>
      <n-radio-button :value="props.valueTwo">
        {{ props.itemLabelTwo }}
      </n-radio-button>
    </n-radio-group>
  </EditsLayout>
</template>
