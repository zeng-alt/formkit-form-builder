<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import TextInput from '../common/TextInput.vue'
import { useFormBuilderI18n } from '../../../../i18n/context'

const { createButtonProp, buttonText } = useFormField()
const { t } = useFormBuilderI18n()

const buttonBlock = createButtonProp<boolean>('block', false)
const buttonBordered = createButtonProp<boolean>('bordered', true)
const buttonCircle = createButtonProp<boolean>('circle', false)
const buttonDashed = createButtonProp<boolean>('dashed', false)
const buttonDisabled = createButtonProp<boolean>('disabled', false)
const buttonFocusable = createButtonProp<boolean>('focusable', true)
const buttonFullWidth = createButtonProp<boolean>('fullWidth', false)
const buttonAlign = createButtonProp<string>('align', 'left')
const buttonGhost = createButtonProp<boolean>('ghost', false)
const buttonRound = createButtonProp<boolean>('round', false)
const buttonSecondary = createButtonProp<boolean>('secondary', false)
const buttonSize = createButtonProp<string>('size', 'medium')
const buttonType = createButtonProp<string>('type', 'default')
</script>

<template>
  <TextInput
    label="Button Text"
    :placeholder="t('edits.placeholder.label')"
    :value="buttonText"
    @update:value="(v) => (buttonText = v)"
  />
  <SelectInput
    label="align"
    :value="buttonAlign"
    :options="[
      { label: 'left', value: 'left' },
      { label: 'center', value: 'center' },
      { label: 'right', value: 'right' },
    ]"
    @update:value="(v) => (buttonAlign = v)"
  />
  <SelectInput
    label="size"
    :value="buttonSize"
    :options="[
      { label: 'tiny', value: 'tiny' },
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
      { label: 'large', value: 'large' },
    ]"
    @update:value="(v) => (buttonSize = v)"
  />
  <SelectInput
    label="type"
    :value="buttonType"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'tertiary', value: 'tertiary' },
      { label: 'primary', value: 'primary' },
      { label: 'success', value: 'success' },
      { label: 'info', value: 'info' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (buttonType = v)"
  />
  <SwitchInput label="block" :value="buttonBlock" @update:value="(v) => (buttonBlock = v)" />
  <SwitchInput label="bordered" :value="buttonBordered" @update:value="(v) => (buttonBordered = v)" />
  <SwitchInput label="circle" :value="buttonCircle" @update:value="(v) => (buttonCircle = v)" />
  <SwitchInput label="dashed" :value="buttonDashed" @update:value="(v) => (buttonDashed = v)" />
  <SwitchInput label="disabled" :value="buttonDisabled" @update:value="(v) => (buttonDisabled = v)" />
  <SwitchInput label="focusable" :value="buttonFocusable" @update:value="(v) => (buttonFocusable = v)" />
  <SwitchInput
    label="full width"
    :value="buttonFullWidth"
    @update:value="(v) => (buttonFullWidth = v)"
  />
  <SwitchInput label="ghost" :value="buttonGhost" @update:value="(v) => (buttonGhost = v)" />
  <SwitchInput label="round" :value="buttonRound" @update:value="(v) => (buttonRound = v)" />
  <SwitchInput label="secondary" :value="buttonSecondary" @update:value="(v) => (buttonSecondary = v)" />
</template>
