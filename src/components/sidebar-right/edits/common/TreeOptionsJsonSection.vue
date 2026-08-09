<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import JsonTextarea from './JsonTextarea.vue'

// 所属 FormBuilder 实例状态：选中 token 绑定到各自实例。
const { selectedIndex, selectedKey } = useFormBuilderState()
const { optionsRaw } = useFormField()
const { t } = useFormBuilderI18n()

const draft = ref('')
const error = ref('')

const selectionToken = computed(() => selectedKey.value ?? String(selectedIndex.value))

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
        error.value = t('edits.optionsSource.jsonArrayError')
        return
      }
      optionsRaw.value = parsed
      error.value = ''
    } catch {
      error.value = t('edits.optionsSource.jsonParseError')
    }
  },
})

watch(
  selectionToken,
  () => {
    draft.value = JSON.stringify(optionsRaw.value ?? [], null, 2)
    error.value = ''
  },
  { immediate: true },
)
</script>

<template>
  <JsonTextarea
    :label="t('edits.optionsJsonLabel')"
    placeholder='[{"label":"Option 1","value":"1","children":[{"label":"Option 1-1","value":"1-1"}]}]'
    :value="model"
    :error="error"
    @update:value="(v) => (model = v)"
  />
</template>
