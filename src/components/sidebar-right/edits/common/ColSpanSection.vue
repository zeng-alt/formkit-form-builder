<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import SelectInput from './SelectInput.vue'

const { colSpan } = useFormField()
const { t } = useFormBuilderI18n()

const colSpanOptions = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
}))

const colSpanString = computed({
  get: () => String(colSpan.value ?? 12),
  set: (value: string) => {
    const parsed = Number(value)
    colSpan.value = Number.isFinite(parsed) ? parsed : 12
  },
})
</script>

<template>
  <SelectInput
    :label="t('edits.grid.colSpanLabel')"
    :value="colSpanString"
    :options="colSpanOptions"
    @update:value="(v) => (colSpanString = v)"
  />
</template>
