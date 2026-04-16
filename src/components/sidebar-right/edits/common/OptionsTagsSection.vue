<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import TagsInput from './TagsInput.vue'

const props = defineProps<{
  label?: string
}>()

const { modelValue } = useFormField()
</script>

<template>
  <TagsInput
    :label="props.label ?? 'Add Items to List'"
    placeholder="Add Items..."
    :value="modelValue"
    @update:value="(v) => (modelValue = v)"
  />
</template>

