<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import SelectInput from './SelectInput.vue'

const { rowSpan } = useFormField()
const { t } = useFormBuilderI18n()

const rowSpanString = computed({
  get: () => String(rowSpan.value ?? 1),
  set: (value: string) => {
    const parsed = Number(value)
    rowSpan.value = Number.isFinite(parsed) ? parsed : 1
  },
})
</script>

<template>
  <SelectInput
    :label="t('edits.grid.rowSpanLabel')"
    :value="rowSpanString"
    :options="[
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '4', value: '4' },
      { label: '5', value: '5' },
      { label: '6', value: '6' },
    ]"
    @update:value="(v) => (rowSpanString = v)"
  />
</template>
