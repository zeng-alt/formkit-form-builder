<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const dividerTitle = createPropsProp<string>('title', 'Divider')
const dividerTitlePlacement = createPropsProp<string>('titlePlacement', 'center')
const dividerDashed = createPropsProp<boolean>('dashed', false)
const dividerVertical = createPropsProp<boolean>('vertical', false)
</script>

<template>
  <TextInput
    label="title"
    :placeholder="t('edits.placeholder.dividerTitle')"
    :value="dividerTitle"
    @update:value="(v) => (dividerTitle = v)"
  />
  <SelectInput
    label="title-placement"
    :value="dividerTitlePlacement"
    :options="[
      { label: 'left', value: 'left' },
      { label: 'center', value: 'center' },
      { label: 'right', value: 'right' },
    ]"
    @update:value="(v) => (dividerTitlePlacement = v)"
  />
  <SwitchInput label="dashed" :value="dividerDashed" @update:value="(v) => (dividerDashed = v)" />
  <SwitchInput label="vertical" :value="dividerVertical" @update:value="(v) => (dividerVertical = v)" />
</template>
