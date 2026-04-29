<script setup lang="ts">
import { computed } from 'vue'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'

const { t } = useFormBuilderI18n()
const { formName, formLabelPosition, formLabelWidth } = useFormField()

const labelWidth = computed({
  get: () => String(formLabelWidth.value),
  set: (v: string) => {
    const n = Number(v)
    formLabelWidth.value = Number.isFinite(n) ? n : 120
  },
})
</script>

<template>
  <TextInput
    :label="t('formSettings.name')"
    placeholder="form"
    :value="formName"
    @update:value="(v: string) => (formName = v)"
  />
  <SelectInput
    :label="t('formSettings.labelPosition')"
    :value="formLabelPosition"
    :options="[
      { label: t('formSettings.positionTop'), value: 'top' },
      { label: t('formSettings.positionLeft'), value: 'left' },
    ]"
    @update:value="(v: string) => (formLabelPosition = v === 'left' ? 'left' : 'top')"
  />
  <TextInput
    :label="t('formSettings.labelWidth')"
    placeholder="120"
    :value="labelWidth"
    @update:value="(v: string) => (labelWidth = v)"
  />
</template>
