<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { selectedIndex } from '../../../../utils/default-form-elements'
import { useFormField } from '../../../../composables/form-fields'
import JsonTextarea from './JsonTextarea.vue'

const { optionsRaw } = useFormField()

const draft = ref('')
const error = ref('')

const model = computed({
  get: () => draft.value,
  set: (value: string) => {
    draft.value = value
    if (!value.trim()) {
      optionsRaw.value = []
      error.value = ''
      return
    }
    try {
      const parsed = JSON.parse(value) as unknown
      if (!Array.isArray(parsed)) {
        error.value = 'Options 必须是数组 JSON'
        return
      }
      optionsRaw.value = parsed
      error.value = ''
    } catch {
      error.value = 'JSON 格式错误'
    }
  },
})

watch(
  selectedIndex,
  () => {
    draft.value = JSON.stringify(optionsRaw.value ?? [], null, 2)
    error.value = ''
  },
  { immediate: true },
)
</script>

<template>
  <JsonTextarea
    label="Options (JSON)"
    placeholder='[{"label":"Option 1","value":"1","children":[{"label":"Option 1-1","value":"1-1"}]}]'
    :value="model"
    :error="error"
    @update:value="(v) => (model = v)"
  />
</template>

