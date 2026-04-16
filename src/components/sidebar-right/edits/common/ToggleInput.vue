<script setup lang="ts">
import { computed } from 'vue'
import { NRadioButton, NRadioGroup } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'

const props = defineProps<{
  value: string
  label: string
  itemLabelOne: string
  itemLabelTwo: string
  valueOne: string
  valueTwo: string
  type: 'single' | 'multiple' | undefined
}>()

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const modelValue = computed({
  get: () => props.value,
  set: (value: string) => {
    emit('update:value', value)
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

