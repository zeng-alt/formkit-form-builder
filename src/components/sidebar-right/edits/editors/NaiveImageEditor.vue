<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import RowSpanSection from '../common/RowSpanSection.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import TextInput from '../common/TextInput.vue'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const src = createPropsProp<string>('src', '')
const alt = createPropsProp<string>('alt', '')

const widthRaw = createPropsProp<unknown>('width', 240)
const width = computed({
  get: () => {
    const value = widthRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '240'
  },
  set: (value: string) => {
    const parsed = Number(value)
    widthRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})

const heightRaw = createPropsProp<unknown>('height', 160)
const height = computed({
  get: () => {
    const value = heightRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '160'
  },
  set: (value: string) => {
    const parsed = Number(value)
    heightRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})

const objectFit = createPropsProp<string>('objectFit', 'cover')
const previewDisabled = createPropsProp<boolean>('previewDisabled', false)
const lazy = createPropsProp<boolean>('lazy', false)
</script>

<template>
  <LabelHelpSection />
  <RowSpanSection />
  <TextInput
    :label="t('edits.image.srcLabel')"
    :placeholder="t('edits.image.srcPlaceholder')"
    :value="src"
    @update:value="(v) => (src = v)"
  />
  <TextInput
    :label="t('edits.image.altLabel')"
    :placeholder="t('edits.image.altPlaceholder')"
    :value="alt"
    @update:value="(v) => (alt = v)"
  />
  <TextInput
    :label="t('edits.image.widthLabel')"
    :placeholder="t('edits.image.widthPlaceholder')"
    :value="width"
    @update:value="(v) => (width = v)"
  />
  <TextInput
    :label="t('edits.image.heightLabel')"
    :placeholder="t('edits.image.heightPlaceholder')"
    :value="height"
    @update:value="(v) => (height = v)"
  />
  <SelectInput
    :label="t('edits.image.objectFitLabel')"
    :value="objectFit"
    :options="[
      { label: 'fill', value: 'fill' },
      { label: 'contain', value: 'contain' },
      { label: 'cover', value: 'cover' },
      { label: 'none', value: 'none' },
      { label: 'scale-down', value: 'scale-down' },
    ]"
    @update:value="(v) => (objectFit = v)"
  />
  <SwitchInput
    :label="t('edits.image.previewDisabledLabel')"
    :value="previewDisabled"
    @update:value="(v) => (previewDisabled = v)"
  />
  <SwitchInput :label="t('edits.image.lazyLabel')" :value="lazy" @update:value="(v) => (lazy = v)" />
</template>
