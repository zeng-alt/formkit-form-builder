<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { computed } from 'vue'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'

const { createNaiveProp } = useFormField()
const { t } = useFormBuilderI18n()

const typoType = createNaiveProp<string>('type', 'default')
const typoDepthRaw = createNaiveProp<unknown>('depth', 1)
const typoDepth = computed({
  get: () => {
    const value = typoDepthRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '1'
  },
  set: (value: string) => {
    const parsed = Number(value)
    typoDepthRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
const typoStrong = createNaiveProp<boolean>('strong', false)
const typoItalic = createNaiveProp<boolean>('italic', false)
const typoUnderline = createNaiveProp<boolean>('underline', false)
const typoDelete = createNaiveProp<boolean>('delete', false)
const typoCode = createNaiveProp<boolean>('code', false)
const typographyText = createNaiveProp<string>('text', 'text')
</script>

<template>
  <TextInput
    label="text"
    :placeholder="t('edits.placeholder.text')"
    :value="typographyText"
    @update:value="(v) => (typographyText = v)"
  />
  <SelectInput
    label="type"
    :value="typoType"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'primary', value: 'primary' },
      { label: 'info', value: 'info' },
      { label: 'success', value: 'success' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (typoType = v)"
  />
  <SelectInput
    label="depth"
    :value="typoDepth"
    :options="[
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
    ]"
    @update:value="(v) => (typoDepth = v)"
  />
  <SwitchInput label="strong" :value="typoStrong" @update:value="(v) => (typoStrong = v)" />
  <SwitchInput label="italic" :value="typoItalic" @update:value="(v) => (typoItalic = v)" />
  <SwitchInput label="underline" :value="typoUnderline" @update:value="(v) => (typoUnderline = v)" />
  <SwitchInput label="delete" :value="typoDelete" @update:value="(v) => (typoDelete = v)" />
  <SwitchInput label="code" :value="typoCode" @update:value="(v) => (typoCode = v)" />
</template>
