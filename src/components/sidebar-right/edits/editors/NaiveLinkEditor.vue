<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'

const { createNaiveProp } = useFormField()
const { t } = useFormBuilderI18n()

const typographyText = createNaiveProp<string>('text', 'text')
const linkHref = createNaiveProp<string>('href', 'https://www.example.com')
const linkTarget = createNaiveProp<string>('target', '_blank')
</script>

<template>
  <TextInput
    label="text"
    :placeholder="t('edits.placeholder.text')"
    :value="typographyText"
    @update:value="(v) => (typographyText = v)"
  />
  <TextInput label="href" placeholder="https://..." :value="linkHref" @update:value="(v) => (linkHref = v)" />
  <SelectInput
    label="target"
    :value="linkTarget"
    :options="[
      { label: '_blank', value: '_blank' },
      { label: '_self', value: '_self' },
    ]"
    @update:value="(v) => (linkTarget = v)"
  />
</template>
